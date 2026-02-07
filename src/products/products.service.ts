import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from './schemas/products.schema';
import {
  ProductCategory,
  ProductCategoryDocument,
} from '../product-categories/schemas/product-category.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(ProductCategory.name)
    private productCategoryModel: Model<ProductCategoryDocument>,
  ) {}

  private async requiresProductComision(categoryIds: Types.ObjectId[]): Promise<boolean> {
    if (!categoryIds?.length) return false;
    const categories = await this.productCategoryModel
      .find({ _id: { $in: categoryIds } })
      .select('comision comision_type')
      .lean()
      .exec();
    return categories.some(
      (c) =>
        c.comision === true &&
        (c.comision_type?.trim() ?? '') === 'Producto',
    );
  }

  async create(createDto: CreateProductDto): Promise<ProductDocument> {
    const categoryIds = (createDto.categories ?? []).map((id) => new Types.ObjectId(id));
    if (await this.requiresProductComision(categoryIds)) {
      const hasComision =
        createDto.comision !== undefined && createDto.comision !== null;
      if (!hasComision) {
        throw new BadRequestException(
          'El campo comision es requerido cuando el producto tiene al menos una categoría con comisión tipo "Producto".',
        );
      }
    }
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

    const effectiveCategoryIds =
      updateDto.categories !== undefined && updateDto.categories !== null
        ? updateDto.categories.map((id) => new Types.ObjectId(id))
        : (product.categories as Types.ObjectId[]) ?? [];

    if (await this.requiresProductComision(effectiveCategoryIds)) {
      const comisionInDto =
        updateDto.comision !== undefined && updateDto.comision !== null;
      const comisionInProduct =
        product.comision !== undefined && product.comision !== null;
      if (!comisionInDto && !comisionInProduct) {
        throw new BadRequestException(
          'El campo comision es requerido cuando el producto tiene al menos una categoría con comisión tipo "Producto".',
        );
      }
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
