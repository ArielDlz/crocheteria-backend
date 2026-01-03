import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ProductCategoriesService } from './product-categories.service';
import {
  ProductCategory,
  ProductCategoryDocument,
} from './schemas/product-category.schema';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { Types } from 'mongoose';

describe('ProductCategoriesService', () => {
  let service: ProductCategoriesService;
  let productCategoryModel: Model<ProductCategoryDocument>;

  // Mock constructor function for Mongoose Model
  const mockProductCategoryModel: any = jest
    .fn()
    .mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedValue({ _id: new Types.ObjectId(), ...data }),
    }));

  // Add static methods to the mock
  mockProductCategoryModel.findOne = jest.fn();
  mockProductCategoryModel.find = jest.fn();
  mockProductCategoryModel.findById = jest.fn();
  mockProductCategoryModel.findByIdAndDelete = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductCategoriesService,
        {
          provide: getModelToken(ProductCategory.name),
          useValue: mockProductCategoryModel,
        },
      ],
    }).compile();

    service = module.get<ProductCategoriesService>(ProductCategoriesService);
    productCategoryModel = module.get<Model<ProductCategoryDocument>>(
      getModelToken(ProductCategory.name),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a category successfully', async () => {
      const createDto: CreateProductCategoryDto = {
        name: 'Bolsas',
        description: 'Categoría de bolsas',
        comision: false,
        startup: false,
      };

      mockProductCategoryModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const savedCategory = {
        _id: new Types.ObjectId(),
        ...createDto,
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };

      const mockInstance = {
        ...savedCategory,
        save: jest.fn().mockResolvedValue(savedCategory),
      };

      mockProductCategoryModel.mockReturnValue(mockInstance);

      const result = await service.create(createDto);

      expect(mockProductCategoryModel.findOne).toHaveBeenCalledWith({
        name: createDto.name,
        isActive: true,
      });
      expect(result).toBeDefined();
    });

    it('should throw ConflictException if category name already exists', async () => {
      const createDto: CreateProductCategoryDto = {
        name: 'Existing Category',
        description: 'Description',
        comision: false,
        startup: false,
      };

      const existingCategory = {
        _id: new Types.ObjectId(),
        name: 'Existing Category',
        isActive: true,
      };

      mockProductCategoryModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingCategory),
      });

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'Ya existe una categoría activa con el nombre',
      );
    });
  });

  describe('findAll', () => {
    it('should return all active categories', async () => {
      const mockCategories = [
        {
          _id: new Types.ObjectId(),
          name: 'Bolsas',
          isActive: true,
        },
        {
          _id: new Types.ObjectId(),
          name: 'Accesorios',
          isActive: true,
        },
      ];

      mockProductCategoryModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockCategories),
        }),
      });

      const result = await service.findAll();

      expect(mockProductCategoryModel.find).toHaveBeenCalledWith({
        isActive: true,
      });
      expect(result).toEqual(mockCategories);
    });
  });

  describe('findById', () => {
    it('should return a category by id', async () => {
      const categoryId = new Types.ObjectId().toString();
      const mockCategory = {
        _id: categoryId,
        name: 'Bolsas',
      };

      mockProductCategoryModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCategory),
      });

      const result = await service.findById(categoryId);

      expect(mockProductCategoryModel.findById).toHaveBeenCalledWith(
        categoryId,
      );
      expect(result).toEqual(mockCategory);
    });

    it('should return null if category not found', async () => {
      const categoryId = new Types.ObjectId().toString();

      mockProductCategoryModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findById(categoryId);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a category successfully', async () => {
      const categoryId = new Types.ObjectId().toString();
      const updateDto: UpdateProductCategoryDto = {
        name: 'Updated Category',
      };

      const updatedCategory = {
        _id: categoryId,
        name: 'Updated Category',
        isActive: true,
      };

      const mockCategory = {
        _id: categoryId,
        name: 'Original Category',
        isActive: true,
        save: jest.fn().mockResolvedValue(updatedCategory),
      };

      mockProductCategoryModel.findById.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(mockCategory),
      });

      mockProductCategoryModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.update(categoryId, updateDto);

      expect(mockProductCategoryModel.findById).toHaveBeenCalledWith(
        categoryId,
      );
      expect(mockCategory.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if category not found', async () => {
      const categoryId = new Types.ObjectId().toString();
      const updateDto: UpdateProductCategoryDto = {};

      mockProductCategoryModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.update(categoryId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deactivate', () => {
    it('should deactivate a category successfully', async () => {
      const categoryId = new Types.ObjectId().toString();
      const mockCategory = {
        _id: categoryId,
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };

      mockProductCategoryModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCategory),
      });

      const result = await service.deactivate(categoryId);

      expect(mockCategory.isActive).toBe(false);
      expect(mockCategory.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if category not found', async () => {
      const categoryId = new Types.ObjectId().toString();

      mockProductCategoryModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.deactivate(categoryId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reactivate', () => {
    it('should reactivate a category successfully', async () => {
      const categoryId = new Types.ObjectId().toString();
      const mockCategory = {
        _id: categoryId,
        isActive: false,
        save: jest.fn().mockResolvedValue(true),
      };

      mockProductCategoryModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCategory),
      });

      const result = await service.reactivate(categoryId);

      expect(mockCategory.isActive).toBe(true);
      expect(mockCategory.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('deletePermanently', () => {
    it('should delete a category permanently', async () => {
      const categoryId = new Types.ObjectId().toString();
      const mockCategory = {
        _id: categoryId,
      };

      mockProductCategoryModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCategory),
      });

      await service.deletePermanently(categoryId);

      expect(mockProductCategoryModel.findByIdAndDelete).toHaveBeenCalledWith(
        categoryId,
      );
    });

    it('should throw NotFoundException if category not found', async () => {
      const categoryId = new Types.ObjectId().toString();

      mockProductCategoryModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.deletePermanently(categoryId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
