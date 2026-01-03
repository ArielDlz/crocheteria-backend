import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { Purchase, PurchaseSchema } from './schemas/purchase.schema';
import { Product, ProductSchema } from '../products/schemas/products.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Purchase.name, schema: PurchaseSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [PurchasesController],
  providers: [PurchasesService],
  exports: [PurchasesService],
})
export class PurchasesModule {}
