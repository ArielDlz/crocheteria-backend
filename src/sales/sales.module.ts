import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { StockValidationGuard } from './guards/stock-validation.guard';
import { Sale, SaleSchema } from './schemas/sales.schema';
import { Purchase, PurchaseSchema } from '../purchases/schemas/purchase.schema';
import { Product, ProductSchema } from '../products/schemas/products.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import {
  ProductCategory,
  ProductCategorySchema,
} from '../product-categories/schemas/product-category.schema';
import { CashRegisterModule } from '../cash-register/cash-register.module';
import { AccountsModule } from '../accounts/accounts.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Sale.name, schema: SaleSchema },
      { name: Purchase.name, schema: PurchaseSchema },
      { name: Product.name, schema: ProductSchema },
      { name: User.name, schema: UserSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: ProductCategory.name, schema: ProductCategorySchema },
    ]),
    forwardRef(() => CashRegisterModule),
    forwardRef(() => AccountsModule),
  ],
  controllers: [SalesController],
  providers: [SalesService, StockValidationGuard],
  exports: [SalesService],
})
export class SalesModule {}
