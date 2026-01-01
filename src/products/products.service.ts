import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './schemas/products.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async create(createDto: CreateProductDto): Promise<ProductDocument> {
    const product = new this.productModel(createDto);
    const savedProduct = await product.save();
    return this.productModel
      .findById(savedProduct._id)
      .populate('categories')
      .exec() as Promise<ProductDocument>;
  }

  // Obtener solo productos activos
  async findAll(): Promise<ProductDocument[]> {
    return this.productModel
      .find({ isActive: true })
      .populate('categories')
      .sort({ name: 1 })
      .exec();
  }

  // Obtener todos los productos (incluyendo inactivos) - para admin
  async findAllIncludingInactive(): Promise<ProductDocument[]> {
    return this.productModel
      .find()
      .populate('categories')
      .sort({ name: 1 })
      .exec();
  }

  // Obtener solo productos inactivos - para admin
  async findInactive(): Promise<ProductDocument[]> {
    return this.productModel
      .find({ isActive: false })
      .populate('categories')
      .sort({ name: 1 })
      .exec();
  }

  async findById(id: string): Promise<ProductDocument | null> {
    return this.productModel.findById(id).populate('categories').exec();
  }

  async update(
    id: string,
    updateDto: UpdateProductDto,
  ): Promise<ProductDocument> {
    const product = await this.productModel.findById(id).exec();

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    const cleanedUpdate = Object.fromEntries(
      Object.entries(updateDto).filter(
        ([_, value]) => value !== undefined && value !== null,
      ),
    );

    Object.assign(product, cleanedUpdate);
    await product.save();

    return this.productModel
      .findById(id)
      .populate('categories')
      .exec() as Promise<ProductDocument>;
  }

  // Borrado lógico - desactivar producto
  async deactivate(id: string): Promise<ProductDocument> {
    const product = await this.productModel.findById(id).exec();

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    product.isActive = false;
    await product.save();

    return this.productModel
      .findById(id)
      .populate('categories')
      .exec() as Promise<ProductDocument>;
  }

  // Reactivar producto
  async reactivate(id: string): Promise<ProductDocument> {
    const product = await this.productModel.findById(id).exec();

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    product.isActive = true;
    await product.save();

    return this.productModel
      .findById(id)
      .populate('categories')
      .exec() as Promise<ProductDocument>;
  }

  // Borrado físico permanente (solo si es necesario)
  async deletePermanently(id: string): Promise<void> {
    const product = await this.productModel.findByIdAndDelete(id).exec();
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
  }

  // Buscar productos activos por categoría
  async findByCategory(categoryId: string): Promise<ProductDocument[]> {
    return this.productModel
      .find({ categories: categoryId, isActive: true })
      .populate('categories')
      .sort({ name: 1 })
      .exec();
  }
}
