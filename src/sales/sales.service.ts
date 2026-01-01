import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { Sale, SaleDocument } from './schemas/sales.schema';
import {
  Purchase,
  PurchaseDocument,
} from '../purchases/schemas/purchase.schema';
import { Product, ProductDocument } from '../products/schemas/products.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Payment, PaymentDocument } from '../payments/schemas/payment.schema';
import { CreateSaleDto } from './dto/create-sale.dto';
import { CreateSaleWithPaymentDto } from './dto/create-sale-with-payment.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { CashRegisterService } from '../cash-register/cash-register.service';

@Injectable()
export class SalesService {
  constructor(
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
    @InjectModel(Purchase.name) private purchaseModel: Model<PurchaseDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectConnection() private connection: Connection,
    @Inject(forwardRef(() => CashRegisterService))
    private cashRegisterService: CashRegisterService,
  ) {}

  /**
   * Procesa una línea de venta usando FIFO
   * Retorna un array de sales_lines (puede ser más de una si se necesitan múltiples purchases)
   */
  private async processSalesLineFIFO(
    productId: Types.ObjectId,
    requestedQuantity: number,
    sellPrice: number,
    lineTotal: number,
  ): Promise<any[]> {
    // Obtener todas las purchases activas del producto con available > 0, ordenadas por fecha más antigua
    const purchases = await this.purchaseModel
      .find({
        product: productId,
        isActive: true,
        available: { $gt: 0 },
      })
      .sort({ createdAt: 1 }) // Más antiguas primero (FIFO)
      .exec();

    if (purchases.length === 0) {
      throw new BadRequestException(
        `No hay compras disponibles para el producto ${productId}`,
      );
    }

    // Calcular stock total disponible
    const totalAvailable = purchases.reduce((sum, p) => sum + p.available, 0);

    if (totalAvailable < requestedQuantity) {
      throw new BadRequestException(
        `Stock insuficiente. Disponible: ${totalAvailable}, Solicitado: ${requestedQuantity}`,
      );
    }

    const processedLines: any[] = [];
    let remainingQuantity = requestedQuantity;
    let totalCost = 0;

    // Procesar purchases en orden FIFO
    for (const purchase of purchases) {
      if (remainingQuantity <= 0) break;

      const quantityToTake = Math.min(remainingQuantity, purchase.available);

      // Actualizar purchase.available
      purchase.available -= quantityToTake;
      await purchase.save();

      // Calcular costos para esta línea
      const linePurchasePrice = purchase.purchase_price;
      const lineTotalCost = linePurchasePrice * quantityToTake;
      totalCost += lineTotalCost;

      // Crear sales_line para esta purchase
      processedLines.push({
        product: productId,
        quantity: quantityToTake,
        sell_price: sellPrice,
        purchase_price: linePurchasePrice,
        line_total: sellPrice * quantityToTake,
        line_total_cost: lineTotalCost,
      });

      remainingQuantity -= quantityToTake;
    }

    // Actualizar stock del producto
    await this.productModel
      .findByIdAndUpdate(productId, { $inc: { stock: -requestedQuantity } })
      .exec();

    return processedLines;
  }

  async create(createDto: CreateSaleDto): Promise<SaleDocument> {
    // Verificar que el usuario existe
    const user = await this.userModel.findById(createDto.user).exec();
    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    // Procesar cada sales_line usando FIFO
    const processedSalesLines: any[] = [];
    let recalculatedTotalAmount = 0;

    for (const salesLine of createDto.sales_lines) {
      const productId = new Types.ObjectId(salesLine.product);

      // Verificar que el producto existe
      const product = await this.productModel.findById(productId).exec();
      if (!product) {
        throw new BadRequestException(
          `Producto ${salesLine.product} no encontrado`,
        );
      }

      // Procesar la línea usando FIFO (puede generar múltiples sales_lines)
      const processedLines = await this.processSalesLineFIFO(
        productId,
        salesLine.quantity,
        salesLine.sell_price,
        salesLine.line_total,
      );

      processedSalesLines.push(...processedLines);
      recalculatedTotalAmount += processedLines.reduce(
        (sum, line) => sum + line.line_total,
        0,
      );
    }

    // Crear la venta con las sales_lines procesadas
    const sale = new this.saleModel({
      user: new Types.ObjectId(createDto.user),
      sales_lines: processedSalesLines,
      total_ammount: recalculatedTotalAmount,
    });
    const savedSale = await sale.save();

    return this.saleModel
      .findById(savedSale._id)
      .populate('user', 'email name family_name')
      .populate('sales_lines.product', 'name sell_price')
      .exec() as Promise<SaleDocument>;
  }

  /**
   * Crea una venta con uno o más pagos en una transacción atómica
   * Incluye: creación de venta, registro de pagos, y actualización de inventario
   * Si algo falla, se hace rollback de todas las operaciones
   */
  async createWithPayment(
    createDto: CreateSaleWithPaymentDto,
  ): Promise<{ sale: SaleDocument; payments: PaymentDocument[] }> {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // 1. Validar que el usuario existe
      const user = await this.userModel
        .findById(createDto.user)
        .session(session)
        .exec();
      if (!user) {
        throw new BadRequestException('Usuario no encontrado');
      }

      // 2. Validar y procesar cada sales_line usando FIFO dentro de la transacción
      const processedSalesLines: any[] = [];
      let recalculatedTotalAmount = 0;
      // Map para acumular actualizaciones de purchases por ID (evita duplicados)
      const purchaseUpdates: Map<string, number> = new Map();
      const productStockUpdates: Map<string, number> = new Map();

      for (const salesLine of createDto.sales_lines) {
        const productId = new Types.ObjectId(salesLine.product);

        // Verificar que el producto existe
        const product = await this.productModel
          .findById(productId)
          .session(session)
          .exec();
        if (!product) {
          throw new BadRequestException(
            `Producto ${salesLine.product} no encontrado`,
          );
        }

        // Obtener purchases activas del producto con available > 0, ordenadas por fecha más antigua (FIFO)
        const purchases = await this.purchaseModel
          .find({
            product: productId,
            isActive: true,
            available: { $gt: 0 },
          })
          .session(session)
          .sort({ createdAt: 1 })
          .exec();

        if (purchases.length === 0) {
          throw new BadRequestException(
            `No hay compras disponibles para el producto ${salesLine.product}`,
          );
        }

        // Calcular stock total disponible
        const totalAvailable = purchases.reduce(
          (sum, p) => sum + p.available,
          0,
        );
        if (totalAvailable < salesLine.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para el producto ${salesLine.product}. Disponible: ${totalAvailable}, Solicitado: ${salesLine.quantity}`,
          );
        }

        // Procesar purchases en orden FIFO
        let remainingQuantity = salesLine.quantity;
        for (const purchase of purchases) {
          if (remainingQuantity <= 0) break;

          const quantityToTake = Math.min(
            remainingQuantity,
            purchase.available,
          );
          const purchaseId = purchase._id.toString();

          // Acumular actualización de purchase (suma si ya existe)
          const currentQuantity = purchaseUpdates.get(purchaseId) || 0;
          purchaseUpdates.set(purchaseId, currentQuantity + quantityToTake);

          // Calcular costos para esta línea
          const linePurchasePrice = purchase.purchase_price;
          const lineTotalCost = linePurchasePrice * quantityToTake;

          // Crear sales_line para esta purchase
          processedSalesLines.push({
            product: productId,
            quantity: quantityToTake,
            sell_price: salesLine.sell_price,
            purchase_price: linePurchasePrice,
            line_total: salesLine.sell_price * quantityToTake,
            line_total_cost: lineTotalCost,
          });

          remainingQuantity -= quantityToTake;
        }

        // Acumular actualización de stock del producto
        const currentStockUpdate =
          productStockUpdates.get(salesLine.product) || 0;
        productStockUpdates.set(
          salesLine.product,
          currentStockUpdate - salesLine.quantity,
        );
      }

      // Calcular el total después de procesar todas las líneas
      recalculatedTotalAmount = processedSalesLines.reduce(
        (sum, line) => sum + line.line_total,
        0,
      );

      // Verificar que tenemos purchases para actualizar
      if (purchaseUpdates.size === 0) {
        throw new BadRequestException(
          'Error: No se identificaron purchases para actualizar',
        );
      }

      // 3. Actualizar purchases.available dentro de la transacción
      // Verificar que todas las purchases se actualicen correctamente
      const purchaseUpdatePromises = Array.from(purchaseUpdates.entries()).map(
        async ([purchaseId, quantityToDeduct]) => {
          const result = await this.purchaseModel
            .findByIdAndUpdate(
              purchaseId,
              { $inc: { available: -quantityToDeduct } },
              { session, new: true }, // new: true para obtener el documento actualizado
            )
            .exec();

          if (!result) {
            throw new BadRequestException(
              `Error: No se pudo actualizar la purchase ${purchaseId}`,
            );
          }

          // Validar que la purchase tiene suficiente available después de la actualización
          if (result.available < 0) {
            throw new BadRequestException(
              `Error: La purchase ${purchaseId} quedaría con available negativo (${result.available})`,
            );
          }

          return {
            purchaseId,
            newAvailable: result.available,
            quantityDeducted: quantityToDeduct,
          };
        },
      );

      const purchaseUpdateResults = await Promise.all(purchaseUpdatePromises);

      // Verificar que todas las purchases se actualizaron correctamente
      if (purchaseUpdateResults.length !== purchaseUpdates.size) {
        throw new BadRequestException(
          `Error: Se esperaba actualizar ${purchaseUpdates.size} purchases, pero solo se actualizaron ${purchaseUpdateResults.length}`,
        );
      }

      // Verificar que la cantidad total deducida de purchases coincide con las cantidades de sales_lines
      const totalQuantityDeducted = purchaseUpdateResults.reduce(
        (sum, r) => sum + r.quantityDeducted,
        0,
      );
      const totalQuantityInSalesLines = processedSalesLines.reduce(
        (sum, line) => sum + line.quantity,
        0,
      );

      if (totalQuantityDeducted !== totalQuantityInSalesLines) {
        throw new BadRequestException(
          `Error de consistencia: La cantidad deducida de purchases (${totalQuantityDeducted}) no coincide con la cantidad en sales_lines (${totalQuantityInSalesLines})`,
        );
      }

      // Log para debugging (opcional, puedes removerlo en producción)
      console.log(
        `✅ Actualizadas ${purchaseUpdateResults.length} purchases:`,
        purchaseUpdateResults.map(
          (r) =>
            `${r.purchaseId}: -${r.quantityDeducted} (disponible: ${r.newAvailable})`,
        ),
      );
      console.log(
        `✅ Verificación: ${totalQuantityDeducted} unidades deducidas de purchases = ${totalQuantityInSalesLines} unidades en sales_lines`,
      );

      // 4. Validación final de stock antes de crear la venta (dentro de la transacción)
      // Esta validación previene race conditions que puedan ocurrir entre el guard y la transacción
      for (const salesLine of createDto.sales_lines) {
        const productId = new Types.ObjectId(salesLine.product);

        // Obtener el producto actualizado dentro de la transacción
        const product = await this.productModel
          .findById(productId)
          .session(session)
          .exec();
        if (!product) {
          throw new BadRequestException(
            `Producto ${salesLine.product} no encontrado durante la validación final`,
          );
        }

        // Obtener purchases activas del producto con available > 0 dentro de la transacción
        const purchasesForValidation = await this.purchaseModel
          .find({
            product: productId,
            isActive: true,
            available: { $gt: 0 },
          })
          .session(session)
          .sort({ createdAt: 1 })
          .exec();

        if (purchasesForValidation.length === 0) {
          throw new BadRequestException(
            `No hay compras disponibles para el producto ${salesLine.product} durante la validación final`,
          );
        }

        // Calcular stock total disponible en purchases
        const totalAvailableInPurchases = purchasesForValidation.reduce(
          (sum, p) => sum + p.available,
          0,
        );

        // Verificar que tenemos suficiente stock disponible
        if (totalAvailableInPurchases < salesLine.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para el producto ${salesLine.product} durante la validación final. Disponible: ${totalAvailableInPurchases}, Solicitado: ${salesLine.quantity}`,
          );
        }

        // Verificar que el stock del producto también es suficiente
        if (product.stock < salesLine.quantity) {
          throw new BadRequestException(
            `Stock insuficiente en el producto ${salesLine.product} durante la validación final. Stock del producto: ${product.stock}, Solicitado: ${salesLine.quantity}`,
          );
        }
      }

      // 5. Actualizar product.stock dentro de la transacción
      for (const [productId, stockChange] of productStockUpdates.entries()) {
        await this.productModel
          .findByIdAndUpdate(
            productId,
            { $inc: { stock: stockChange } },
            { session },
          )
          .exec();
      }

      // 6. Crear la venta dentro de la transacción
      const sale = new this.saleModel({
        user: new Types.ObjectId(createDto.user),
        sales_lines: processedSalesLines,
        total_ammount: recalculatedTotalAmount,
        status: 'pending',
      });
      const savedSale = await sale.save({ session });

      // 7. Validar que haya al menos un pago
      if (!createDto.payments || createDto.payments.length === 0) {
        throw new BadRequestException('Debe proporcionar al menos un pago');
      }

      // 8. Calcular la suma total de los pagos
      const totalPaymentsAmmount = createDto.payments.reduce(
        (sum, payment) => sum + payment.ammount,
        0,
      );

      // 9. Validar que la suma de pagos no exceda el total de la venta
      if (totalPaymentsAmmount > recalculatedTotalAmount) {
        throw new BadRequestException(
          `La suma de los pagos (${totalPaymentsAmmount}) no puede exceder el total de la venta (${recalculatedTotalAmount})`,
        );
      }

      // 10. Obtener el ID de la caja abierta (si hay pagos en efectivo)
      let cashRegisterId: Types.ObjectId | undefined;
      const hasCashPayment = createDto.payments.some(
        (p) => p.payment_method === 'cash',
      );
      if (hasCashPayment) {
        try {
          const cashRegisterStatus =
            await this.cashRegisterService.getCashRegisterStatus();
          if (cashRegisterStatus.isOpen && cashRegisterStatus.cashRegisterId) {
            cashRegisterId = new Types.ObjectId(
              cashRegisterStatus.cashRegisterId,
            );
          }
        } catch (error) {
          // Si no hay caja abierta, el guard ya debería haberlo validado
          console.warn(
            'No se pudo obtener el ID de la caja abierta:',
            error.message,
          );
        }
      }

      // 11. Crear todos los pagos dentro de la transacción
      const savedPayments: PaymentDocument[] = [];
      for (const paymentInfo of createDto.payments) {
        const payment = new this.paymentModel({
          sale: savedSale._id,
          payment_method: paymentInfo.payment_method,
          ammount: paymentInfo.ammount,
          payment_date: paymentInfo.payment_date
            ? new Date(paymentInfo.payment_date)
            : new Date(),
          user: new Types.ObjectId(createDto.user),
          ...(paymentInfo.payment_method === 'cash' && cashRegisterId
            ? { cash_id: cashRegisterId }
            : {}),
        });
        const savedPayment = await payment.save({ session });
        savedPayments.push(savedPayment);
      }

      // 12. Actualizar status de la venta según la suma total de pagos
      if (totalPaymentsAmmount >= recalculatedTotalAmount) {
        savedSale.status = 'paid';
        await savedSale.save({ session });
      } else {
        // Si los pagos no cubren el total completo, el status queda como 'pending'
        savedSale.status = 'pending';
        await savedSale.save({ session });
      }

      // 13. Actualizar balance de caja para pagos en efectivo (dentro de la transacción)
      for (const paymentInfo of createDto.payments) {
        if (paymentInfo.payment_method === 'cash') {
          await this.cashRegisterService.incrementBalance(
            paymentInfo.ammount,
            session,
          );
        }
      }

      // 14. Confirmar la transacción (todos los cambios son atómicos: venta, pagos, inventario, y balance de caja)
      await session.commitTransaction();

      // 15. Obtener los documentos completos con populate (fuera de la transacción)
      const populatedSale = (await this.saleModel
        .findById(savedSale._id)
        .populate('user', 'email name family_name')
        .populate('sales_lines.product', 'name sell_price')
        .exec()) as SaleDocument;

      // Obtener todos los pagos con populate
      const populatedPayments: PaymentDocument[] = [];
      for (const payment of savedPayments) {
        const populated = (await this.paymentModel
          .findById(payment._id)
          .populate('sale', 'total_ammount status')
          .populate('user', 'email name family_name')
          .exec()) as PaymentDocument | null;
        if (populated) {
          populatedPayments.push(populated);
        }
      }

      return {
        sale: populatedSale,
        payments: populatedPayments,
      };
    } catch (error) {
      // Hacer rollback en caso de error
      await session.abortTransaction();
      throw error;
    } finally {
      // Finalizar la sesión
      await session.endSession();
    }
  }

  // Solo ventas activas
  async findAll(): Promise<SaleDocument[]> {
    return this.saleModel
      .find({ isActive: true })
      .populate('user', 'email name family_name')
      .populate('sales_lines.product', 'name sell_price')
      .sort({ createdAt: -1 })
      .exec();
  }

  // Todas las ventas (activas e inactivas)
  async findAllIncludingInactive(): Promise<SaleDocument[]> {
    return this.saleModel
      .find()
      .populate('user', 'email name family_name')
      .populate('sales_lines.product', 'name sell_price')
      .sort({ createdAt: -1 })
      .exec();
  }

  // Solo ventas inactivas
  async findInactive(): Promise<SaleDocument[]> {
    return this.saleModel
      .find({ isActive: false })
      .populate('user', 'email name family_name')
      .populate('sales_lines.product', 'name sell_price')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(id: string): Promise<SaleDocument | null> {
    return this.saleModel
      .findById(id)
      .populate('user', 'email name family_name')
      .populate('sales_lines.product', 'name sell_price')
      .exec();
  }

  async update(id: string, updateDto: UpdateSaleDto): Promise<SaleDocument> {
    const sale = await this.saleModel.findById(id).exec();
    if (!sale) {
      throw new NotFoundException('Venta no encontrada');
    }

    // Filtrar valores undefined y null para actualización parcial
    const filteredUpdate: any = Object.fromEntries(
      Object.entries(updateDto).filter(
        ([_, value]) => value !== undefined && value !== null,
      ),
    );

    // Si se actualizan sales_lines, convertir product (string) -> ObjectId
    if (filteredUpdate.sales_lines) {
      filteredUpdate.sales_lines = filteredUpdate.sales_lines.map(
        (line: any) => ({
          ...line,
          product: line.product
            ? new Types.ObjectId(line.product)
            : line.product,
        }),
      );
    }

    Object.assign(sale, filteredUpdate);
    await sale.save();

    return this.saleModel
      .findById(id)
      .populate('user', 'email name family_name')
      .populate('sales_lines.product', 'name sell_price')
      .exec() as Promise<SaleDocument>;
  }

  // Borrado lógico (desactivar)
  async deactivate(id: string): Promise<SaleDocument> {
    const sale = await this.saleModel.findById(id).exec();
    if (!sale) {
      throw new NotFoundException('Venta no encontrada');
    }

    sale.isActive = false;
    await sale.save();

    return this.saleModel
      .findById(id)
      .populate('user', 'email name family_name')
      .populate('sales_lines.product', 'name sell_price')
      .exec() as Promise<SaleDocument>;
  }

  // Reactivar
  async reactivate(id: string): Promise<SaleDocument> {
    const sale = await this.saleModel.findById(id).exec();
    if (!sale) {
      throw new NotFoundException('Venta no encontrada');
    }

    sale.isActive = true;
    await sale.save();

    return this.saleModel
      .findById(id)
      .populate('user', 'email name family_name')
      .populate('sales_lines.product', 'name sell_price')
      .exec() as Promise<SaleDocument>;
  }

  // Borrado permanente
  async deletePermanently(id: string): Promise<void> {
    const sale = await this.saleModel.findById(id).exec();
    if (!sale) {
      throw new NotFoundException('Venta no encontrada');
    }

    await this.saleModel.findByIdAndDelete(id).exec();
  }
}
