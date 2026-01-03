import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { Account, AccountDocument } from './schemas/account.schema';
import {
  AccountTransaction,
  AccountTransactionDocument,
} from './schemas/account-transaction.schema';
import {
  Withdrawal,
  WithdrawalDocument,
} from './schemas/withdrawal.schema';
import { Sale, SaleDocument } from '../sales/schemas/sales.schema';
import { Product, ProductDocument } from '../products/schemas/products.schema';
import {
  ProductCategory,
  ProductCategoryDocument,
} from '../product-categories/schemas/product-category.schema';
import { CashRegisterService } from '../cash-register/cash-register.service';
import { AccountLinesDto } from './dto/account-lines.dto';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { AccountSaleLineDto } from './dto/account-sale-line.dto';

@Injectable()
export class AccountsService {
  constructor(
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
    @InjectModel(AccountTransaction.name)
    private accountTransactionModel: Model<AccountTransactionDocument>,
    @InjectModel(Withdrawal.name)
    private withdrawalModel: Model<WithdrawalDocument>,
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(ProductCategory.name)
    private productCategoryModel: Model<ProductCategoryDocument>,
    @InjectConnection() private connection: Connection,
    @Inject(forwardRef(() => CashRegisterService))
    private cashRegisterService: CashRegisterService,
  ) {}

  /**
   * Calcula el saldo actual de una cuenta
   */
  async getAccountBalance(accountId: string): Promise<number> {
    const credits = await this.accountTransactionModel
      .aggregate([
        {
          $match: {
            account: new Types.ObjectId(accountId),
            transaction_type: 'credit',
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ])
      .exec();

    const debits = await this.accountTransactionModel
      .aggregate([
        {
          $match: {
            account: new Types.ObjectId(accountId),
            transaction_type: 'debit',
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ])
      .exec();

    const creditTotal = credits[0]?.total || 0;
    const debitTotal = debits[0]?.total || 0;

    return creditTotal - debitTotal;
  }

  /**
   * Obtiene todas las cuentas con sus saldos
   */
  async findAllAccounts(): Promise<AccountDocument[]> {
    // El balance ahora está en el schema y se actualiza automáticamente
    return this.accountModel.find().exec();
  }

  /**
   * Obtiene una cuenta por ID con su saldo
   */
  async findAccountById(id: string): Promise<AccountDocument | null> {
    // El balance ahora está en el schema y se actualiza automáticamente
    return this.accountModel.findById(id).exec();
  }

  /**
   * Obtiene todas las transacciones de una cuenta
   */
  async findTransactionsByAccount(
    accountId: string,
    limit = 100,
    skip = 0,
  ): Promise<AccountTransactionDocument[]> {
    return this.accountTransactionModel
      .find({ account: new Types.ObjectId(accountId) })
      .populate('user_id', 'email name family_name')
      .populate('sale_id', 'total_ammount status')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Contabiliza sales_lines de una venta
   */
  async accountSaleLines(
    saleId: string,
    accountLinesDto: AccountLinesDto,
    userId: string,
  ): Promise<SaleDocument> {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // 1. Obtener la venta con productos populados
      const sale = await this.saleModel
        .findById(saleId)
        .populate({
          path: 'sales_lines.product',
          populate: { path: 'categories' },
        })
        .session(session)
        .exec();

      if (!sale) {
        throw new NotFoundException('Venta no encontrada');
      }

      // 2. Crear mapa de rent_amounts por line_id
      const rentAmountMap = new Map<string, number>();
      if (accountLinesDto.rent_amounts) {
        for (const rentAmount of accountLinesDto.rent_amounts) {
          rentAmountMap.set(rentAmount.line_id, rentAmount.rent_amount);
        }
      }

      // 3. Obtener cuentas estándar
      const investmentAccount = await this.accountModel
        .findOne({ name: 'investment' })
        .session(session)
        .exec();
      const profitAccount = await this.accountModel
        .findOne({ name: 'profit' })
        .session(session)
        .exec();
      const rentAccount = await this.accountModel
        .findOne({ name: 'rent' })
        .session(session)
        .exec();
      const remainingUtilityAccount = await this.accountModel
        .findOne({ name: 'remaining_utility' })
        .session(session)
        .exec();

      if (!investmentAccount || !profitAccount || !rentAccount || !remainingUtilityAccount) {
        throw new BadRequestException(
          'Las cuentas estándar no están configuradas. Por favor, créelas primero.',
        );
      }

      // 4. Procesar cada línea a contabilizar
      // Convertir line_ids a índices numéricos (los IDs son índices del array como strings)
      const linesToUpdate: { index: number; rent_amount?: number }[] = [];

      for (const lineId of accountLinesDto.line_ids) {
        // Los line_ids son índices del array como strings
        const lineIndex = parseInt(lineId, 10);

        if (isNaN(lineIndex) || lineIndex < 0 || lineIndex >= sale.sales_lines.length) {
          throw new BadRequestException(
            `Índice de línea inválido: ${lineId}`,
          );
        }

        const salesLine = sale.sales_lines[lineIndex];

        // Validar que no esté ya contabilizada
        if (salesLine.accounted) {
          throw new BadRequestException(
            `La línea en el índice ${lineIndex} ya está contabilizada`,
          );
        }

        // Obtener rent_amount (requerido pero puede ser 0)
        const rentAmount = rentAmountMap.get(lineId);
        if (rentAmount === undefined) {
          throw new BadRequestException(
            `Debe proporcionar el rent_amount para la línea en el índice ${lineIndex} (puede ser 0)`,
          );
        }

        // Obtener el producto con sus categorías (ya está populado)
        const productId = salesLine.product;
        if (!productId) {
          throw new BadRequestException(
            `Producto no encontrado para la línea en el índice ${lineIndex}`,
          );
        }

        // Si es ObjectId, obtener el producto, si ya está populado, usarlo
        let product: ProductDocument;
        if (productId instanceof Types.ObjectId || typeof productId === 'string') {
          const foundProduct = await this.productModel
            .findById(productId)
            .session(session)
            .exec();
          if (!foundProduct) {
            throw new BadRequestException(
              `Producto no encontrado para la línea en el índice ${lineIndex}`,
            );
          }
          product = foundProduct;
        } else {
          product = productId as ProductDocument;
        }

        // Obtener las categorías del producto
        const productCategories = await this.productCategoryModel
          .find({ _id: { $in: product.categories } })
          .session(session)
          .exec();

        // Verificar si es startup (si alguna categoría tiene startup: true)
        const startupCategory = productCategories.find((cat) => cat.startup);

        if (startupCategory) {
          // Es producto startup
          if (!startupCategory.comision_type || startupCategory.comision_ammount === undefined) {
            throw new BadRequestException(
              `La categoría ${startupCategory.name} no tiene configuración de comisión`,
            );
          }

          if (!startupCategory.account_id) {
            throw new BadRequestException(
              `La categoría ${startupCategory.name} no tiene cuenta asociada`,
            );
          }

          // Verificar que la cuenta existe
          const startupAccount = await this.accountModel
            .findById(startupCategory.account_id)
            .session(session)
            .exec();

          if (!startupAccount) {
            throw new BadRequestException(
              `La cuenta asociada a la categoría ${startupCategory.name} no existe`,
            );
          }

          // Calcular comisión
          let profit = 0;
          if (startupCategory.comision_type === 'Porcentaje') {
            profit = Math.round(
              (salesLine.line_total * startupCategory.comision_ammount) / 100,
            );
          } else if (
            startupCategory.comision_type === 'Monto fijo' ||
            startupCategory.comision_type === 'Cantidad Fija'
          ) {
            // Soporta ambos nombres por compatibilidad
            profit = startupCategory.comision_ammount;
          }

          const startupAmount = salesLine.line_total - profit;

          // Validar rent_amount
          if (rentAmount > profit) {
            throw new BadRequestException(
              `El rent_amount (${rentAmount}) no puede ser mayor que el profit (${profit}) de la línea en el índice ${lineIndex}`,
            );
          }

          const remainingUtility = profit - rentAmount;

          // Crear transacciones
          // 1. Profit: +profit
          await this.createTransaction(
            profitAccount._id.toString(),
            'credit',
            profit,
            saleId,
            `Comisión de producto startup: ${product.name}`,
            userId,
            session,
          );

          // 2. Startup account: +startupAmount
          await this.createTransaction(
            startupAccount._id.toString(),
            'credit',
            startupAmount,
            saleId,
            `Venta producto startup: ${product.name}`,
            userId,
            session,
          );

          // 3. Rent: +rentAmount (si > 0)
          if (rentAmount > 0) {
            await this.createTransaction(
              rentAccount._id.toString(),
              'credit',
              rentAmount,
              saleId,
              `Renta de línea: ${product.name}`,
              userId,
              session,
            );
          }

          // 4. Remaining utility: +remainingUtility
          if (remainingUtility > 0) {
            await this.createTransaction(
              remainingUtilityAccount._id.toString(),
              'credit',
              remainingUtility,
              saleId,
              `Utilidad restante de línea: ${product.name}`,
              userId,
              session,
            );
          }
        } else {
          // NO es producto startup
          const profit = salesLine.line_total - salesLine.line_total_cost;

          // Validar rent_amount
          if (rentAmount > profit) {
            throw new BadRequestException(
              `El rent_amount (${rentAmount}) no puede ser mayor que el profit (${profit}) de la línea en el índice ${lineIndex}`,
            );
          }

          const remainingUtility = profit - rentAmount;

          // Crear transacciones
          // 1. Investment: +line_total_cost
          await this.createTransaction(
            investmentAccount._id.toString(),
            'credit',
            salesLine.line_total_cost,
            saleId,
            `Inversión de línea: ${product.name}`,
            userId,
            session,
          );

          // 2. Profit: +profit
          await this.createTransaction(
            profitAccount._id.toString(),
            'credit',
            profit,
            saleId,
            `Ganancia de línea: ${product.name}`,
            userId,
            session,
          );

          // 3. Rent: +rentAmount (si > 0)
          if (rentAmount > 0) {
            await this.createTransaction(
              rentAccount._id.toString(),
              'credit',
              rentAmount,
              saleId,
              `Renta de línea: ${product.name}`,
              userId,
              session,
            );
          }

          // 4. Remaining utility: +remainingUtility
          if (remainingUtility > 0) {
            await this.createTransaction(
              remainingUtilityAccount._id.toString(),
              'credit',
              remainingUtility,
              saleId,
              `Utilidad restante de línea: ${product.name}`,
              userId,
              session,
            );
          }
        }

        // Marcar para actualizar la línea
        linesToUpdate.push({ index: lineIndex, rent_amount: rentAmount });
      }

      // 5. Actualizar las líneas como contabilizadas
      for (const { index, rent_amount } of linesToUpdate) {
        sale.sales_lines[index].accounted = true;
        sale.sales_lines[index].rent_amount = rent_amount;
      }

      await sale.save({ session });

      await session.commitTransaction();

      // 6. Retornar la venta actualizada con populate
      return this.saleModel
        .findById(saleId)
        .populate('user', 'email name family_name')
        .populate('sales_lines.product', 'name sell_price')
        .exec() as Promise<SaleDocument>;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Contabiliza una línea de venta específica por índice
   * Recibe los montos directamente del frontend sin realizar cálculos
   */
  async accountSaleLineByIndex(
    saleId: string,
    lineIndex: number,
    accountSaleLineDto: AccountSaleLineDto,
    userId: string,
  ): Promise<SaleDocument> {
    console.log('🚀 [ACCOUNT] Iniciando proceso de contabilización de línea de venta');
    console.log('🚀 [ACCOUNT] Datos recibidos:', {
      saleId,
      lineIndex,
      userId,
      accounts: accountSaleLineDto.accounts,
    });

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // 1. Obtener la venta
      console.log(`\n📋 [ACCOUNT] Paso 1: Obteniendo venta con ID: ${saleId}`);
      const sale = await this.saleModel
        .findById(saleId)
        .populate('sales_lines.product', 'name')
        .session(session)
        .exec();

      if (!sale) {
        console.log(`❌ [ACCOUNT] Venta no encontrada: ${saleId}`);
        throw new NotFoundException('Venta no encontrada');
      }
      console.log(`✅ [ACCOUNT] Venta encontrada. Total de líneas: ${sale.sales_lines.length}`);

      // 2. Validar índice
      console.log(`\n🔍 [ACCOUNT] Paso 2: Validando índice ${lineIndex}`);
      if (lineIndex < 0 || lineIndex >= sale.sales_lines.length) {
        console.log(`❌ [ACCOUNT] Índice inválido: ${lineIndex} (rango válido: 0-${sale.sales_lines.length - 1})`);
        throw new BadRequestException(
          `Índice de línea inválido: ${lineIndex}`,
        );
      }

      const salesLine = sale.sales_lines[lineIndex];
      console.log(`✅ [ACCOUNT] Línea encontrada en índice ${lineIndex}`);
      console.log(`📊 [ACCOUNT] Información de la línea:`, {
        product: salesLine.product,
        quantity: salesLine.quantity,
        line_total: salesLine.line_total,
        line_total_cost: salesLine.line_total_cost,
        accounted: salesLine.accounted,
        comision: salesLine.comision,
        rent_amount: salesLine.rent_amount,
      });

      // 3. Validar que no esté ya contabilizada
      console.log(`\n🔍 [ACCOUNT] Paso 3: Validando que la línea no esté contabilizada`);
      if (salesLine.accounted) {
        console.log(`❌ [ACCOUNT] La línea ya está contabilizada (accounted: ${salesLine.accounted})`);
        throw new BadRequestException(
          `La línea en el índice ${lineIndex} ya está contabilizada`,
        );
      }
      console.log(`✅ [ACCOUNT] Línea no contabilizada, puede proceder`);

      // 4. Obtener cuentas estándar
      console.log(`\n💰 [ACCOUNT] Paso 4: Obteniendo cuentas estándar`);
      const investmentAccount = await this.accountModel
        .findOne({ name: 'investment' })
        .session(session)
        .exec();
      console.log(`  ${investmentAccount ? '✅' : '❌'} [ACCOUNT] Investment account:`, investmentAccount?._id);
      
      const profitAccount = await this.accountModel
        .findOne({ name: 'profit' })
        .session(session)
        .exec();
      console.log(`  ${profitAccount ? '✅' : '❌'} [ACCOUNT] Profit account:`, profitAccount?._id);
      
      const rentAccount = await this.accountModel
        .findOne({ name: 'rent' })
        .session(session)
        .exec();
      console.log(`  ${rentAccount ? '✅' : '❌'} [ACCOUNT] Rent account:`, rentAccount?._id);

      if (!investmentAccount || !profitAccount || !rentAccount) {
        console.log(`❌ [ACCOUNT] Faltan cuentas estándar. Investment: ${!!investmentAccount}, Profit: ${!!profitAccount}, Rent: ${!!rentAccount}`);
        throw new BadRequestException(
          'Las cuentas estándar no están configuradas. Por favor, créelas primero.',
        );
      }
      console.log(`✅ [ACCOUNT] Todas las cuentas estándar encontradas`);

      // 5. Obtener información del producto para las descripciones
      console.log(`\n📦 [ACCOUNT] Paso 5: Obteniendo información del producto`);
      const productId = salesLine.product;
      let productName = 'Producto desconocido';
      if (productId instanceof Types.ObjectId || typeof productId === 'string') {
        const product = await this.productModel
          .findById(productId)
          .session(session)
          .exec();
        if (product) {
          productName = product.name;
          console.log(`✅ [ACCOUNT] Producto encontrado: ${productName}`);
        } else {
          console.log(`⚠️ [ACCOUNT] Producto no encontrado para ID: ${productId}`);
        }
      } else {
        productName = (productId as ProductDocument).name;
        console.log(`✅ [ACCOUNT] Producto (ya populado): ${productName}`);
      }

      const { accounts } = accountSaleLineDto;
      console.log(`\n💰 [ACCOUNT] Paso 6: Validando montos recibidos`);
      console.log(`📊 [ACCOUNT] Montos recibidos:`, {
        profit: accounts.profit,
        rent: accounts.rent,
        investment: accounts.investment,
        startup: accounts.startup,
      });
      
      // 6. Validar montos recibidos según si tiene comisión o no
      const lineComision = (salesLine as any).comision;
      const hasComision = lineComision !== undefined && lineComision !== null && lineComision > 0;
      
      if (hasComision) {
        // Si tiene comisión definida y diferente de cero: rent <= comision (producto startup)
        console.log(`🔍 [ACCOUNT] Línea tiene comisión: ${lineComision}`);
        if (accounts.rent > lineComision) {
          console.log(`❌ [ACCOUNT] Validación fallida: rent (${accounts.rent}) > comision (${lineComision})`);
          throw new BadRequestException(
            `El monto de rent (${accounts.rent}) no puede ser mayor que la comisión (${lineComision}). La renta debe ser menor o igual a lo que recibe el negocio como comisión.`,
          );
        }
        console.log(`✅ [ACCOUNT] Validación exitosa: rent (${accounts.rent}) <= comision (${lineComision})`);
      } else {
        // Si NO tiene comisión o es cero: validar rent y profit (producto NO startup)
        const potentialProfit = salesLine.line_total - salesLine.line_total_cost;
        console.log(`🔍 [ACCOUNT] Línea sin comisión. Potential profit calculado: ${potentialProfit} = ${salesLine.line_total} - ${salesLine.line_total_cost}`);
        
        // Validar que rent <= potential_profit
        if (accounts.rent > potentialProfit) {
          console.log(`❌ [ACCOUNT] Validación fallida: rent (${accounts.rent}) > potential_profit (${potentialProfit})`);
          throw new BadRequestException(
            `El monto de rent (${accounts.rent}) no puede ser mayor que la ganancia potencial (${potentialProfit}). No podemos tomar de la inversión para la renta.`,
          );
        }
        console.log(`✅ [ACCOUNT] Validación exitosa: rent (${accounts.rent}) <= potential_profit (${potentialProfit})`);
        
        // Validar que accounts.profit === (potential_profit - rent)
        const expectedProfit = potentialProfit - accounts.rent;
        if (accounts.profit !== expectedProfit) {
          console.log(`❌ [ACCOUNT] Validación fallida: profit recibido (${accounts.profit}) !== expected (${expectedProfit}) = potential_profit (${potentialProfit}) - rent (${accounts.rent})`);
          throw new BadRequestException(
            `El monto de profit (${accounts.profit}) debe ser igual a (potential_profit - rent) = (${potentialProfit} - ${accounts.rent}) = ${expectedProfit}`,
          );
        }
        console.log(`✅ [ACCOUNT] Validación exitosa: profit (${accounts.profit}) === (potential_profit - rent) = ${expectedProfit}`);
      }

      // 7. Crear transacciones según si es startup o no
      console.log(`\n💳 [ACCOUNT] Paso 7: Creando transacciones`);
      if (accounts.startup) {
        // Es producto startup
        console.log(`🔵 [ACCOUNT] Tipo: Producto STARTUP`);
        // Validar que la cuenta startup existe
        // Buscar por metadata.product_category_id, no por _id
        const startupAccountId = new Types.ObjectId(accounts.startup.id);
        console.log(`  🔍 [ACCOUNT] Buscando cuenta startup con product_category_id: ${accounts.startup.id}`);
        const startupAccount = await this.accountModel
          .findOne({ 'metadata.product_category_id': startupAccountId })
          .session(session)
          .exec();

        if (!startupAccount) {
          console.log(`❌ [ACCOUNT] Cuenta startup no encontrada con product_category_id: ${accounts.startup.id}`);
          throw new BadRequestException(
            `La cuenta startup con product_category_id ${accounts.startup.id} no existe`,
          );
        }
        console.log(`✅ [ACCOUNT] Cuenta startup encontrada: ${startupAccount.name} (${startupAccount._id}), product_category_id: ${startupAccount.metadata?.product_category_id}`);

        // Crear transacciones para startup:
        // 1. Profit: +accounts.profit (el frontend envía el valor neto directamente)
        if (accounts.profit > 0) {
          console.log(`  💰 [ACCOUNT] Creando transacción: Profit account (+${accounts.profit})`);
          const profitTx = await this.createTransaction(
            profitAccount._id.toString(),
            'credit',
            accounts.profit,
            saleId,
            `Comisión de producto startup (después de renta): ${productName}`,
            userId,
            session,
          );
          console.log(`  ✅ [ACCOUNT] Transacción Profit creada: ${profitTx._id}`);
        } else {
          console.log(`  ⏭️ [ACCOUNT] Omitiendo transacción Profit (monto 0 o negativo)`);
        }

        // 2. Startup account: +accounts.startup.amount
        if (accounts.startup.amount > 0) {
          console.log(`  💰 [ACCOUNT] Creando transacción: Startup account (+${accounts.startup.amount})`);
          const startupTx = await this.createTransaction(
            startupAccount._id.toString(),
            'credit',
            accounts.startup.amount,
            saleId,
            `Venta producto startup: ${productName}`,
            userId,
            session,
          );
          console.log(`  ✅ [ACCOUNT] Transacción Startup creada: ${startupTx._id}`);
        } else {
          console.log(`  ⏭️ [ACCOUNT] Omitiendo transacción Startup (monto 0)`);
        }

        // 3. Rent: +accounts.rent (si > 0)
        if (accounts.rent > 0) {
          console.log(`  💰 [ACCOUNT] Creando transacción: Rent account (+${accounts.rent})`);
          const rentTx = await this.createTransaction(
            rentAccount._id.toString(),
            'credit',
            accounts.rent,
            saleId,
            `Renta de línea: ${productName}`,
            userId,
            session,
          );
          console.log(`  ✅ [ACCOUNT] Transacción Rent creada: ${rentTx._id}`);
        } else {
          console.log(`  ⏭️ [ACCOUNT] Omitiendo transacción Rent (monto 0)`);
        }
      } else {
        // NO es producto startup
        console.log(`🟢 [ACCOUNT] Tipo: Producto NORMAL (no startup)`);
        // Crear transacciones para producto normal:
        // 1. Investment: +accounts.investment
        if (accounts.investment > 0) {
          console.log(`  💰 [ACCOUNT] Creando transacción: Investment account (+${accounts.investment})`);
          const investmentTx = await this.createTransaction(
            investmentAccount._id.toString(),
            'credit',
            accounts.investment,
            saleId,
            `Inversión de línea: ${productName}`,
            userId,
            session,
          );
          console.log(`  ✅ [ACCOUNT] Transacción Investment creada: ${investmentTx._id}`);
        } else {
          console.log(`  ⏭️ [ACCOUNT] Omitiendo transacción Investment (monto 0)`);
        }

        // 2. Profit: +accounts.profit (el frontend envía el valor neto directamente, validado contra potential_profit - rent)
        if (accounts.profit > 0) {
          console.log(`  💰 [ACCOUNT] Creando transacción: Profit account (+${accounts.profit})`);
          const profitTx = await this.createTransaction(
            profitAccount._id.toString(),
            'credit',
            accounts.profit,
            saleId,
            `Ganancia de línea (después de renta): ${productName}`,
            userId,
            session,
          );
          console.log(`  ✅ [ACCOUNT] Transacción Profit creada: ${profitTx._id}`);
        } else {
          console.log(`  ⏭️ [ACCOUNT] Omitiendo transacción Profit (monto 0 o negativo)`);
        }

        // 3. Rent: +accounts.rent (si > 0)
        if (accounts.rent > 0) {
          console.log(`  💰 [ACCOUNT] Creando transacción: Rent account (+${accounts.rent})`);
          const rentTx = await this.createTransaction(
            rentAccount._id.toString(),
            'credit',
            accounts.rent,
            saleId,
            `Renta de línea: ${productName}`,
            userId,
            session,
          );
          console.log(`  ✅ [ACCOUNT] Transacción Rent creada: ${rentTx._id}`);
        } else {
          console.log(`  ⏭️ [ACCOUNT] Omitiendo transacción Rent (monto 0)`);
        }
      }
      console.log(`✅ [ACCOUNT] Todas las transacciones creadas exitosamente`);

      // 8. Marcar la línea como contabilizada y guardar rent_amount
      console.log(`\n💾 [ACCOUNT] Paso 8: Actualizando línea de venta`);
      console.log(`  📝 [ACCOUNT] Marcando línea como contabilizada (accounted: true)`);
      console.log(`  📝 [ACCOUNT] Guardando rent_amount: ${accounts.rent}`);
      sale.sales_lines[lineIndex].accounted = true;
      sale.sales_lines[lineIndex].rent_amount = accounts.rent;

      const savedSale = await sale.save({ session });
      console.log(`✅ [ACCOUNT] Venta guardada con ID: ${savedSale._id}`);

      // 9. Commit de transacción
      console.log(`\n✅ [ACCOUNT] Paso 9: Confirmando transacción (commit)`);
      await session.commitTransaction();
      console.log(`✅ [ACCOUNT] Transacción confirmada exitosamente`);

      // 10. Retornar la venta actualizada con populate
      console.log(`\n📦 [ACCOUNT] Paso 10: Obteniendo venta actualizada con populate`);
      const result = (await this.saleModel
        .findById(saleId)
        .populate('user', 'email name family_name')
        .populate('sales_lines.product', 'name sell_price')
        .exec()) as SaleDocument;
      console.log(`✅ [ACCOUNT] Proceso completado exitosamente`);
      return result;
    } catch (error) {
      // Hacer rollback en caso de error
      console.error(`❌ [ACCOUNT] Error durante el proceso:`, error);
      console.log(`🔄 [ACCOUNT] Abortando transacción...`);
      await session.abortTransaction();
      throw error;
    } finally {
      // Finalizar la sesión
      console.log(`🔒 [ACCOUNT] Cerrando sesión`);
      session.endSession();
    }
  }

  /**
   * Crea una transacción de cuenta (helper privado)
   * Actualiza el balance de la cuenta automáticamente
   */
  private async createTransaction(
    accountId: string,
    type: 'credit' | 'debit',
    amount: number,
    saleId: string | undefined,
    description: string,
    userId: string,
    session: any,
    withdrawalId?: string,
  ): Promise<AccountTransactionDocument> {
    console.log(`    🔄 [ACCOUNT] createTransaction: accountId=${accountId}, type=${type}, amount=${amount}, saleId=${saleId}, withdrawalId=${withdrawalId}`);
    const transaction = new this.accountTransactionModel({
      account: new Types.ObjectId(accountId),
      transaction_type: type,
      amount,
      sale_id: saleId ? new Types.ObjectId(saleId) : undefined,
      withdrawal_id: withdrawalId ? new Types.ObjectId(withdrawalId) : undefined,
      description,
      user_id: new Types.ObjectId(userId),
    });

    const savedTransaction = await transaction.save({ session });
    console.log(`    ✅ [ACCOUNT] Transacción guardada con ID: ${savedTransaction._id}`);

    // Actualizar balance de la cuenta
    // credit: suma al balance, debit: resta del balance
    const balanceChange = type === 'credit' ? amount : -amount;
    console.log(`    💰 [ACCOUNT] Actualizando balance de cuenta: ${type === 'credit' ? '+' : '-'}${amount}`);
    await this.accountModel.findByIdAndUpdate(
      accountId,
      { $inc: { balance: balanceChange } },
      { session },
    ).exec();
    console.log(`    ✅ [ACCOUNT] Balance actualizado (${balanceChange > 0 ? '+' : ''}${balanceChange})`);

    return savedTransaction;
  }

  /**
   * Crea un retiro de una cuenta
   */
  async createWithdrawal(
    accountId: string,
    createWithdrawalDto: CreateWithdrawalDto,
    userId: string,
  ): Promise<WithdrawalDocument> {
    // 1. Validar que no haya caja abierta
    const cashRegisterStatus =
      await this.cashRegisterService.getCashRegisterStatus();
    if (cashRegisterStatus.isOpen) {
      throw new BadRequestException(
        'No se pueden realizar retiros mientras hay una caja abierta',
      );
    }

    // 2. Verificar que la cuenta existe
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException('Cuenta no encontrada');
    }

    // 3. Calcular saldo disponible
    const balance = await this.getAccountBalance(accountId);
    if (balance < createWithdrawalDto.amount) {
      throw new BadRequestException(
        `Saldo insuficiente. Saldo disponible: ${balance}, Monto solicitado: ${createWithdrawalDto.amount}`,
      );
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // 4. Crear el retiro
      const withdrawal = new this.withdrawalModel({
        account_id: new Types.ObjectId(accountId),
        amount: createWithdrawalDto.amount,
        user_id: new Types.ObjectId(userId),
        description: createWithdrawalDto.description,
        status: 'completed',
      });

      const savedWithdrawal = await withdrawal.save({ session });

      // 5. Crear transacción de débito con referencia al retiro (esto actualiza el balance automáticamente)
      await this.createTransaction(
        accountId,
        'debit',
        createWithdrawalDto.amount,
        undefined, // No hay sale_id en retiros
        `Retiro: ${createWithdrawalDto.description}`,
        userId,
        session,
        savedWithdrawal._id.toString(), // withdrawal_id
      );

      await session.commitTransaction();

      // 6. Retornar el retiro con populate
      return this.withdrawalModel
        .findById(savedWithdrawal._id)
        .populate('account_id')
        .populate('user_id', 'email name family_name')
        .exec() as Promise<WithdrawalDocument>;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Obtiene todos los retiros
   */
  async findAllWithdrawals(): Promise<WithdrawalDocument[]> {
    return this.withdrawalModel
      .find()
      .populate('account_id')
      .populate('user_id', 'email name family_name')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Obtiene retiros de una cuenta específica
   */
  async findWithdrawalsByAccount(
    accountId: string,
  ): Promise<WithdrawalDocument[]> {
    return this.withdrawalModel
      .find({ account_id: new Types.ObjectId(accountId) })
      .populate('account_id')
      .populate('user_id', 'email name family_name')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Obtiene un retiro por ID
   */
  async findWithdrawalById(id: string): Promise<WithdrawalDocument | null> {
    return this.withdrawalModel
      .findById(id)
      .populate('account_id')
      .populate('user_id', 'email name family_name')
      .exec();
  }
}
