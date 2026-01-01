import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from '../../products/schemas/products.schema';
import { CreateSaleDto } from '../dto/create-sale.dto';

@Injectable()
export class StockValidationGuard implements CanActivate {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const body: CreateSaleDto = request.body;

    // Solo validar en el método POST (create)
    if (request.method !== 'POST') {
      return true;
    }

    if (!body.sales_lines || !Array.isArray(body.sales_lines)) {
      return true; // La validación del DTO se encargará de esto
    }

    // Validar stock para cada sales_line
    const stockErrors: string[] = [];

    for (const salesLine of body.sales_lines) {
      if (!salesLine.product || !salesLine.quantity) {
        continue; // El DTO validation se encargará
      }

      const product = await this.productModel.findById(salesLine.product).exec();

      if (!product) {
        stockErrors.push(
          `Producto ${salesLine.product} no encontrado`,
        );
        continue;
      }

      if (product.stock < salesLine.quantity) {
        stockErrors.push(
          `Stock insuficiente para el producto "${product.name}". Disponible: ${product.stock}, Solicitado: ${salesLine.quantity}`,
        );
      }
    }

    if (stockErrors.length > 0) {
      throw new BadRequestException({
        message: 'Error de validación de stock',
        errors: stockErrors,
      });
    }

    return true;
  }
}

