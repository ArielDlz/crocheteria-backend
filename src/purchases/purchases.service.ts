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

    return savedPurchase.populate('product');
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

    // Filtrar valores undefined y null para actualización parcial
    const filteredUpdate: any = Object.fromEntries(
      Object.entries(updateDto).filter(([_, value]) => value !== undefined && value !== null)
    );

    // Convertir product a ObjectId si se proporciona
    if (filteredUpdate.product) {
      filteredUpdate.product = new Types.ObjectId(filteredUpdate.product);
    }

    Object.assign(purchase, filteredUpdate);
    return (await purchase.save()).populate('product');
  }

  // Borrado lógico (desactivar)
  async deactivate(id: string): Promise<PurchaseDocument> {
    const purchase = await this.purchaseModel.findById(id).exec();
    if (!purchase) {
      throw new NotFoundException('Compra no encontrada');
    }

    purchase.isActive = false;
    return (await purchase.save()).populate('product');
  }

  // Reactivar
  async reactivate(id: string): Promise<PurchaseDocument> {
    const purchase = await this.purchaseModel.findById(id).exec();
    if (!purchase) {
      throw new NotFoundException('Compra no encontrada');
    }

    purchase.isActive = true;
    return (await purchase.save()).populate('product');
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

