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
import {
  ProductCategory,
  ProductCategoryDocument,
} from '../product-categories/schemas/product-category.schema';
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
    @InjectModel(ProductCategory.name)
    private productCategoryModel: Model<ProductCategoryDocument>,
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
    console.log('🚀 [SALE] Iniciando proceso de creación de venta');
    console.log('🚀 [SALE] Datos recibidos:', {
      user: createDto.user,
      sales_lines_count: createDto.sales_lines?.length || 0,
      payments_count: createDto.payments?.length || 0,
    });

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // 1. Validar que el usuario existe
      console.log('👤 [SALE] Paso 1: Validando usuario...');
      const user = await this.userModel
        .findById(createDto.user)
        .session(session)
        .exec();
      if (!user) {
        throw new BadRequestException('Usuario no encontrado');
      }
      console.log('✅ [SALE] Usuario validado:', user._id);

      // 2. Validar y procesar cada sales_line usando FIFO dentro de la transacción
      console.log('📦 [SALE] Paso 2: Procesando sales_lines...');
      const processedSalesLines: any[] = [];
      let recalculatedTotalAmount = 0;
      // Map para acumular actualizaciones de purchases por ID (evita duplicados)
      const purchaseUpdates: Map<string, number> = new Map();
      const productStockUpdates: Map<string, number> = new Map();

      for (const salesLine of createDto.sales_lines) {
        console.log(
          `\n📝 [SALE] Procesando línea: product=${salesLine.product}, quantity=${salesLine.quantity}, sell_price=${salesLine.sell_price}`,
        );
        const productId = new Types.ObjectId(salesLine.product);
        console.log(`🔍 [SALE] ProductId: ${productId}`);

        // Verificar que el producto existe
        console.log(`🔍 [SALE] Buscando producto...`);
        const product = await this.productModel
          .findById(productId)
          .session(session)
          .exec();
        if (!product) {
          throw new BadRequestException(
            `Producto ${salesLine.product} no encontrado`,
          );
        }
        console.log(`✅ [SALE] Producto encontrado: ${product.name}`);

        // Obtener purchases activas del producto con available > 0, ordenadas por fecha más antigua (FIFO)
        console.log(`🔍 [SALE] Buscando purchases disponibles...`);
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
        console.log(`✅ [SALE] Purchases encontradas: ${purchases.length}`);

        // Calcular stock total disponible
        const totalAvailable = purchases.reduce(
          (sum, p) => sum + p.available,
          0,
        );
        console.log(`📊 [SALE] Stock disponible: ${totalAvailable}, Solicitado: ${salesLine.quantity}`);
        if (totalAvailable < salesLine.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para el producto ${salesLine.product}. Disponible: ${totalAvailable}, Solicitado: ${salesLine.quantity}`,
          );
        }

        // Obtener categorías del producto para verificar si es startup y calcular comisión
        let comision: number | undefined = undefined;
        let selectedCategoryId: Types.ObjectId | undefined = undefined;
        console.log(
          `🔍 [COMISION] Producto ${product._id}: categories=${JSON.stringify(product.categories)}`,
        );
        
        if (product.categories && product.categories.length > 0) {
          const productCategories = await this.productCategoryModel
            .find({ _id: { $in: product.categories } })
            .session(session)
            .exec();

          console.log(
            `🔍 [COMISION] Categorías encontradas: ${productCategories.length}`,
          );
          console.log(
            `🔍 [COMISION] Categorías:`,
            productCategories.map((cat) => ({
              _id: cat._id,
              name: cat.name,
              startup: cat.startup,
              comision_type: cat.comision_type,
              comision_ammount: cat.comision_ammount,
            })),
          );

          const startupCategory = productCategories.find((cat) => cat.startup);

          // Seleccionar categoría: startup si existe, sino la primera categoría
          if (startupCategory) {
            selectedCategoryId = startupCategory._id;
            console.log(
              `✅ [COMISION] Categoría startup encontrada: ${startupCategory.name} (ID: ${selectedCategoryId})`,
            );
            // Es producto startup, calcular comisión
            if (
              startupCategory.comision_type &&
              startupCategory.comision_ammount !== undefined
            ) {
              // Normalizar el tipo de comisión para comparación (case insensitive)
              const comisionTypeNormalized = startupCategory.comision_type.trim();
              
              if (comisionTypeNormalized === 'Porcentaje') {
                comision = Math.round(
                  (salesLine.sell_price * salesLine.quantity * startupCategory.comision_ammount) /
                    100,
                );
                console.log(
                  `✅ [COMISION] Comisión calculada (Porcentaje): sell_price=${salesLine.sell_price}, quantity=${salesLine.quantity}, comision_ammount=${startupCategory.comision_ammount}, comision=${comision}`,
                );
              } else if (
                comisionTypeNormalized === 'Monto Fijo' ||
                comisionTypeNormalized === 'Monto fijo' ||
                comisionTypeNormalized === 'Cantidad Fija' ||
                comisionTypeNormalized === 'Cantidad fija'
              ) {
                // Comisión fija por unidad, multiplicar por cantidad
                comision = startupCategory.comision_ammount * salesLine.quantity;
                console.log(
                  `✅ [COMISION] Comisión calculada (Monto Fijo): comision_ammount=${startupCategory.comision_ammount}, quantity=${salesLine.quantity}, comision=${comision}`,
                );
              } else {
                console.log(
                  `⚠️ [COMISION] Tipo de comisión no reconocido: "${startupCategory.comision_type}" (normalized: "${comisionTypeNormalized}")`,
                );
              }
            } else {
              console.log(
                `⚠️ [COMISION] Categoría startup sin configuración de comisión: comision_type=${startupCategory.comision_type}, comision_ammount=${startupCategory.comision_ammount}`,
              );
            }
          } else {
            // No es startup, usar la primera categoría
            selectedCategoryId = productCategories[0]._id;
            console.log(`ℹ️ [COMISION] Producto NO es startup, usando primera categoría: ${productCategories[0].name} (ID: ${selectedCategoryId})`);
          }
        } else {
          console.log(`ℹ️ [COMISION] Producto sin categorías`);
        }

        // Procesar purchases en orden FIFO
        console.log(`🔄 [SALE] Procesando purchases en orden FIFO...`);
        let remainingQuantity = salesLine.quantity;
        let lineComisionProcessed = false;
        let purchaseIndex = 0;
        for (const purchase of purchases) {
          if (remainingQuantity <= 0) break;

          purchaseIndex++;
          console.log(`  📦 [SALE] Purchase ${purchaseIndex}/${purchases.length}: _id=${purchase._id}, available=${purchase.available}, purchase_price=${purchase.purchase_price}`);

          const quantityToTake = Math.min(
            remainingQuantity,
            purchase.available,
          );
          console.log(`  📊 [SALE] Quantity to take: ${quantityToTake}, remaining: ${remainingQuantity - quantityToTake}`);
          const purchaseId = purchase._id.toString();

          // Acumular actualización de purchase (suma si ya existe)
          const currentQuantity = purchaseUpdates.get(purchaseId) || 0;
          purchaseUpdates.set(purchaseId, currentQuantity + quantityToTake);
          console.log(`  💾 [SALE] Purchase update acumulado: ${purchaseId} -> ${currentQuantity + quantityToTake}`);

          // Calcular costos para esta línea
          const linePurchasePrice = purchase.purchase_price;
          const lineTotalCost = linePurchasePrice * quantityToTake;
          console.log(`  💰 [SALE] Costos: purchase_price=${linePurchasePrice}, line_total_cost=${lineTotalCost}`);

          // Calcular comisión proporcional para esta parte de la línea
          let lineComision: number | undefined = undefined;
          if (comision !== undefined) {
            if (lineComisionProcessed) {
              // Si ya procesamos la comisión en una línea anterior (cuando hay múltiples purchases),
              // no la agregamos de nuevo (la comisión es para toda la línea, no por purchase)
              lineComision = undefined;
              console.log(`  ⏭️ [COMISION] Comisión ya asignada en línea anterior, omitiendo...`);
            } else {
              // Asignar la comisión total a la primera parte de la línea
              // Si la línea se divide en múltiples purchases, la comisión va solo en la primera
              lineComision = comision;
              lineComisionProcessed = true;
              console.log(`  ✅ [COMISION] Comisión asignada a esta línea: ${lineComision}`);
            }
          } else {
            console.log(`  ℹ️ [COMISION] No hay comisión para este producto`);
          }

          // Crear sales_line para esta purchase
          // Asignar índice secuencial basado en la posición en el array
          const currentIndex = processedSalesLines.length;
          const salesLineData = {
            product: productId,
            quantity: quantityToTake,
            sell_price: salesLine.sell_price,
            purchase_price: linePurchasePrice,
            line_total: salesLine.sell_price * quantityToTake,
            line_total_cost: lineTotalCost,
            comision: lineComision,
            index: currentIndex,
            ...(selectedCategoryId ? { category_id: selectedCategoryId } : {}),
          };
          
          console.log(
            `  📝 [SALE] SalesLine creada:`,
            JSON.stringify({
              index: currentIndex,
              quantity: quantityToTake,
              sell_price: salesLine.sell_price,
              purchase_price: linePurchasePrice,
              line_total: salesLineData.line_total,
              line_total_cost: lineTotalCost,
              comision: lineComision,
            }, null, 2),
          );
          
          processedSalesLines.push(salesLineData);

          remainingQuantity -= quantityToTake;
        }
        console.log(`✅ [SALE] Línea procesada. Total sales_lines creadas hasta ahora: ${processedSalesLines.length}\n`);

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
      console.log(`💰 [SALE] Total recalculado: ${recalculatedTotalAmount}`);
      console.log(`📊 [SALE] Total de sales_lines procesadas: ${processedSalesLines.length}`);

      // 3. Validación final de stock ANTES de actualizar purchases (dentro de la transacción)
      console.log(`\n🔍 [SALE] Paso 3: Validación final de stock...`);
      // Esta validación previene race conditions que puedan ocurrir entre el guard y la transacción
      for (const salesLine of createDto.sales_lines) {
        const productId = new Types.ObjectId(salesLine.product);

        // Obtener el producto dentro de la transacción
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

      // Verificar que tenemos purchases para actualizar
      if (purchaseUpdates.size === 0) {
        throw new BadRequestException(
          'Error: No se identificaron purchases para actualizar',
        );
      }
      console.log(`✅ [SALE] Validación final de stock completada`);

      // 4. Actualizar purchases.available dentro de la transacción
      console.log(`\n💾 [SALE] Paso 4: Actualizando purchases (${purchaseUpdates.size} purchases)...`);
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

      // 5. Actualizar product.stock dentro de la transacción
      console.log(`\n📦 [SALE] Paso 5: Actualizando stock de productos (${productStockUpdates.size} productos)...`);
      for (const [productId, stockChange] of productStockUpdates.entries()) {
        console.log(`  📉 [SALE] Producto ${productId}: stock ${stockChange < 0 ? 'decremento' : 'incremento'} ${Math.abs(stockChange)}`);
        await this.productModel
          .findByIdAndUpdate(
            productId,
            { $inc: { stock: stockChange } },
            { session },
          )
          .exec();
      }
      console.log(`✅ [SALE] Stock de productos actualizado`);

      // 6. Crear la venta dentro de la transacción
      console.log(`\n📝 [SALE] Paso 6: Creando venta...`);
      console.log(`  📋 [SALE] Sales_lines a guardar:`, JSON.stringify(processedSalesLines.map(line => ({
        product: line.product,
        quantity: line.quantity,
        comision: line.comision,
        line_total: line.line_total,
      })), null, 2));
      
      const sale = new this.saleModel({
        user: new Types.ObjectId(createDto.user),
        sales_lines: processedSalesLines.map((line) => ({
          ...line,
          accounted: false, // Las líneas se contabilizan manualmente después mediante POST /sales/:id/account-lines
        })),
        total_ammount: recalculatedTotalAmount,
        status: 'pending',
      });
      const savedSale = await sale.save({ session });
      console.log(`✅ [SALE] Venta creada con ID: ${savedSale._id}`);

      // 7. Validar que haya al menos un pago
      console.log(`\n💳 [SALE] Paso 7: Procesando pagos...`);
      if (!createDto.payments || createDto.payments.length === 0) {
        throw new BadRequestException('Debe proporcionar al menos un pago');
      }
      console.log(`  📊 [SALE] Total de pagos: ${createDto.payments.length}`);

      // 9. Calcular la suma total de los pagos
      const totalPaymentsAmmount = createDto.payments.reduce(
        (sum, payment) => sum + payment.ammount,
        0,
      );
      console.log(`  💰 [SALE] Total de pagos: ${totalPaymentsAmmount}, Total de venta: ${recalculatedTotalAmount}`);

      // 10. Validar que la suma de pagos no exceda el total de la venta
      if (totalPaymentsAmmount > recalculatedTotalAmount) {
        throw new BadRequestException(
          `La suma de los pagos (${totalPaymentsAmmount}) no puede exceder el total de la venta (${recalculatedTotalAmount})`,
        );
      }

      // 11. Obtener el ID de la caja abierta (si hay pagos en efectivo)
      console.log(`  🔍 [SALE] Verificando caja de efectivo...`);
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

      // 12. Crear todos los pagos dentro de la transacción
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

      // 13. Actualizar status de la venta según la suma total de pagos
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

      // 14. Confirmar la transacción (todos los cambios son atómicos: venta, pagos, inventario y balance de caja)
      await session.commitTransaction();

      // 15. Obtener los documentos completos con populate (fuera de la transacción)
      console.log(`\n📦 [SALE] Obteniendo documentos completos con populate...`);
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
      console.error(`❌ [SALE] Error durante el proceso:`, error);
      console.log(`🔄 [SALE] Abortando transacción...`);
      await session.abortTransaction();
      throw error;
    } finally {
      // Finalizar la sesión
      session.endSession();
      console.log(`🔒 [SALE] Sesión cerrada\n`);
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

  async findSaleLinesById(id: string): Promise<SaleDocument | null> {
    const sale = await this.saleModel
      .findById(id)
      .populate('user', 'email name family_name')
      .populate({
        path: 'sales_lines.product',
        select: 'name sell_price categories',
        populate: {
          path: 'categories',
          select: 'name startup comision_type comision_ammount',
        },
      })
      .exec();

    if (!sale) {
      return null;
    }

    return sale;
  }

  async findAllSaleLinesByDateRange(
    startDate?: Date,
    endDate?: Date,
  ): Promise<SaleDocument[]> {
    const query: any = { isActive: true };

    // Filtrar por rango de fechas si se proporcionan
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        // Incluir todo el día de endDate (hasta las 23:59:59.999)
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endOfDay;
      }
    }

    const sales = await this.saleModel
      .find(query)
      .populate('user', 'email name family_name')
      .populate({
        path: 'sales_lines.product',
        select: 'name sell_price categories',
        populate: {
          path: 'categories',
          select: 'name startup comision_type comision_ammount',
        },
      })
      .sort({ createdAt: -1 })
      .exec();

    return sales;
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
