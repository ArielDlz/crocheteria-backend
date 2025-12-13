import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProductCategory, ProductCategoryDocument } from './schemas/product-category.schema';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';

@Injectable()
export class ProductCategoriesService {
  constructor(
    @InjectModel(ProductCategory.name) 
    private productCategoryModel: Model<ProductCategoryDocument>,
  ) {}

  async create(createDto: CreateProductCategoryDto): Promise<ProductCategoryDocument> {
    // Verificar si ya existe una categoría activa con el mismo nombre
    const existing = await this.productCategoryModel.findOne({ 
      name: createDto.name,
      isActive: true
    }).exec();
    
    if (existing) {
      throw new ConflictException(`Ya existe una categoría activa con el nombre '${createDto.name}'`);
    }

    const category = new this.productCategoryModel(createDto);
    return category.save();
  }

  // Obtener solo categorías activas
  async findAll(): Promise<ProductCategoryDocument[]> {
    return this.productCategoryModel
      .find({ isActive: true })
      .sort({ name: 1 })
      .exec();
  }

  // Obtener todas las categorías (incluyendo inactivas) - para admin
  async findAllIncludingInactive(): Promise<ProductCategoryDocument[]> {
    return this.productCategoryModel
      .find()
      .sort({ name: 1 })
      .exec();
  }

  // Obtener solo categorías inactivas - para admin
  async findInactive(): Promise<ProductCategoryDocument[]> {
    return this.productCategoryModel
      .find({ isActive: false })
      .sort({ name: 1 })
      .exec();
  }

  async findById(id: string): Promise<ProductCategoryDocument | null> {
    return this.productCategoryModel.findById(id).exec();
  }

  async update(id: string, updateDto: UpdateProductCategoryDto): Promise<ProductCategoryDocument> {
    const category = await this.productCategoryModel.findById(id).exec();
    
    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    // Si se está actualizando el nombre, verificar que no exista otra activa con el mismo nombre
    if (updateDto.name && updateDto.name !== category.name) {
      const existing = await this.productCategoryModel.findOne({ 
        name: updateDto.name,
        isActive: true,
        _id: { $ne: id }
      }).exec();
      
      if (existing) {
        throw new ConflictException(`Ya existe una categoría activa con el nombre '${updateDto.name}'`);
      }
    }

    const cleanedUpdate = Object.fromEntries(
      Object.entries(updateDto).filter(([_, value]) => value !== undefined && value !== null)
    );

    Object.assign(category, cleanedUpdate);
    return category.save();
  }

  // Borrado lógico - desactivar categoría
  async deactivate(id: string): Promise<ProductCategoryDocument> {
    const category = await this.productCategoryModel.findById(id).exec();
    
    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    category.isActive = false;
    return category.save();
  }

  // Reactivar categoría
  async reactivate(id: string): Promise<ProductCategoryDocument> {
    const category = await this.productCategoryModel.findById(id).exec();
    
    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    category.isActive = true;
    return category.save();
  }

  // Borrado físico permanente (solo si es necesario)
  async deletePermanently(id: string): Promise<void> {
    const result = await this.productCategoryModel.findByIdAndDelete(id).exec();
    
    if (!result) {
      throw new NotFoundException('Categoría no encontrada');
    }
  }
}

