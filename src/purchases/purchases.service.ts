import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Purchase, PurchaseDocument } from './schemas/purchase.schema';
import { Product, ProductDocument } from '../products/schemas/products.schema';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';

@Injectable()
export class PurchasesService {
  constructor(
    @InjectModel(Purchase.name) private purchaseModel: Model<PurchaseDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async create(createDto: CreatePurchaseDto): Promise<PurchaseDocument> {
    // Verificar que el producto existe
    const product = await this.productModel.findById(createDto.product).exec();
    if (!product) {
      throw new BadRequestException('Producto no encontrado');
    }

    // Crear la compra con product como ObjectId
    const purchase = new this.purchaseModel({
      ...createDto,
      product: new Types.ObjectId(createDto.product),
    });
    const savedPurchase = await purchase.save();

    // Actualizar el stock del producto: stock += quantity
    await this.productModel.findByIdAndUpdate(
      createDto.product,
      { $inc: { stock: createDto.quantity } },
    ).exec();

    return this.purchaseModel
      .findById(savedPurchase._id)
      .populate('product')
      .exec() as Promise<PurchaseDocument>;
  }

  // Buscar compras con filtros dinámicos
  async findWithFilters(filters: {
    isActive?: boolean;
    startup?: boolean;
    includeAllActive?: boolean; // true = no filtrar por isActive
  }): Promise<PurchaseDocument[]> {
    const query: any = {};

    // Filtro de isActive
    if (!filters.includeAllActive) {
      query.isActive = filters.isActive !== undefined ? filters.isActive : true;
    }

    // Filtro de startup (solo si se especifica)
    if (filters.startup !== undefined) {
      query.startup = filters.startup;
    }

    return this.purchaseModel
      .find(query)
      .populate('product')
      .sort({ createdAt: -1 })
      .exec();
  }

  // Solo compras activas (compatibilidad)
  async findAll(startup?: boolean): Promise<PurchaseDocument[]> {
    return this.findWithFilters({ isActive: true, startup });
  }

  // Todas las compras (activas e inactivas)
  async findAllIncludingInactive(startup?: boolean): Promise<PurchaseDocument[]> {
    return this.findWithFilters({ includeAllActive: true, startup });
  }

  // Solo compras inactivas
  async findInactive(startup?: boolean): Promise<PurchaseDocument[]> {
    return this.findWithFilters({ isActive: false, startup });
  }

  async findById(id: string): Promise<PurchaseDocument | null> {
    return this.purchaseModel.findById(id).populate('product').exec();
  }

  async update(id: string, updateDto: UpdatePurchaseDto): Promise<PurchaseDocument> {
    const purchase = await this.purchaseModel.findById(id).exec();
    if (!purchase) {
      throw new NotFoundException('Compra no encontrada');
    }

    // Guardar cantidad original para calcular diferencia de stock
    const originalQuantity = purchase.quantity;

    // Filtrar valores undefined y null para actualización parcial
    const filteredUpdate: any = Object.fromEntries(
      Object.entries(updateDto).filter(([_, value]) => value !== undefined && value !== null)
    );

    Object.assign(purchase, filteredUpdate);
    await purchase.save();

    // Ajustar stock si cambió la cantidad
    if (updateDto.quantity !== undefined && updateDto.quantity !== originalQuantity) {
      const quantityDifference = updateDto.quantity - originalQuantity;
      await this.productModel.findByIdAndUpdate(
        purchase.product,
        { $inc: { stock: quantityDifference } },
      ).exec();
    }
    
    return this.purchaseModel
      .findById(id)
      .populate('product')
      .exec() as Promise<PurchaseDocument>;
  }

  // Borrado lógico (desactivar)
  async deactivate(id: string): Promise<PurchaseDocument> {
    const purchase = await this.purchaseModel.findById(id).exec();
    if (!purchase) {
      throw new NotFoundException('Compra no encontrada');
    }

    purchase.isActive = false;
    await purchase.save();

    return this.purchaseModel
      .findById(id)
      .populate('product')
      .exec() as Promise<PurchaseDocument>;
  }

  // Reactivar
  async reactivate(id: string): Promise<PurchaseDocument> {
    const purchase = await this.purchaseModel.findById(id).exec();
    if (!purchase) {
      throw new NotFoundException('Compra no encontrada');
    }

    purchase.isActive = true;
    await purchase.save();

    return this.purchaseModel
      .findById(id)
      .populate('product')
      .exec() as Promise<PurchaseDocument>;
  }

  // Borrado permanente
  async deletePermanently(id: string): Promise<void> {
    // Obtener la compra antes de eliminarla
    const purchase = await this.purchaseModel.findById(id).exec();
    if (!purchase) {
      throw new NotFoundException('Compra no encontrada');
    }

    // Restar la cantidad del stock del producto: stock -= quantity
    await this.productModel.findByIdAndUpdate(
      purchase.product,
      { $inc: { stock: -purchase.quantity } },
    ).exec();

    // Eliminar la compra
    await this.purchaseModel.findByIdAndDelete(id).exec();
  }
}

