import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountsController, WithdrawalsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { Account, AccountSchema } from './schemas/account.schema';
import {
  AccountTransaction,
  AccountTransactionSchema,
} from './schemas/account-transaction.schema';
import { Withdrawal, WithdrawalSchema } from './schemas/withdrawal.schema';
import { Sale, SaleSchema } from '../sales/schemas/sales.schema';
import { Product, ProductSchema } from '../products/schemas/products.schema';
import {
  ProductCategory,
  ProductCategorySchema,
} from '../product-categories/schemas/product-category.schema';
import { CashRegisterModule } from '../cash-register/cash-register.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Account.name, schema: AccountSchema },
      { name: AccountTransaction.name, schema: AccountTransactionSchema },
      { name: Withdrawal.name, schema: WithdrawalSchema },
      { name: Sale.name, schema: SaleSchema },
      { name: Product.name, schema: ProductSchema },
      { name: ProductCategory.name, schema: ProductCategorySchema },
    ]),
    forwardRef(() => CashRegisterModule),
  ],
  controllers: [AccountsController, WithdrawalsController],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}
