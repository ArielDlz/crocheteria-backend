import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CashRegisterController } from './cash-register.controller';
import { CashRegisterService } from './cash-register.service';
import {
  CashRegister,
  CashRegisterSchema,
} from './schemas/cash-register.schema';
import { CashCut, CashCutSchema } from './schemas/cash-cut.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CashRegister.name, schema: CashRegisterSchema },
      { name: CashCut.name, schema: CashCutSchema },
      { name: User.name, schema: UserSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
  ],
  controllers: [CashRegisterController],
  providers: [CashRegisterService],
  exports: [CashRegisterService],
})
export class CashRegisterModule {}
