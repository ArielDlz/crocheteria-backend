import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { Sale, SaleSchema } from '../sales/schemas/sales.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { CashRegisterModule } from '../cash-register/cash-register.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: Sale.name, schema: SaleSchema },
      { name: User.name, schema: UserSchema },
    ]),
    forwardRef(() => CashRegisterModule),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
