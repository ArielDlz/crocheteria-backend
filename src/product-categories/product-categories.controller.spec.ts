import { Test, TestingModule } from '@nestjs/testing';
import { ProductCategoriesController } from './product-categories.controller';
import { ProductCategoriesService } from './product-categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { Types } from 'mongoose';

describe('ProductCategoriesController', () => {
  let controller: ProductCategoriesController;
  let service: ProductCategoriesService;

  const mockProductCategoriesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findAllIncludingInactive: jest.fn(),
    findInactive: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
    reactivate: jest.fn(),
    deletePermanently: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockPermissionsGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductCategoriesController],
      providers: [
        {
          provide: ProductCategoriesService,
          useValue: mockProductCategoriesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(mockPermissionsGuard)
      .compile();

    controller = module.get<ProductCategoriesController>(ProductCategoriesController);
    service = module.get<ProductCategoriesService>(ProductCategoriesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a category successfully', async () => {
      const createDto: CreateProductCategoryDto = {
        name: 'Bolsas',
        description: 'Categoría de bolsas',
      };

      const mockCategory = {
        _id: new Types.ObjectId(),
        ...createDto,
        isActive: true,
      };

      mockProductCategoriesService.create.mockResolvedValue(mockCategory);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual({
        message: 'Categoría creada exitosamente',
        category: mockCategory,
      });
    });
  });

  describe('findAll', () => {
    it('should return all active categories by default', async () => {
      const mockCategories = [
        {
          _id: new Types.ObjectId(),
          name: 'Bolsas',
          isActive: true,
        },
      ];

      mockProductCategoriesService.findAll.mockResolvedValue(mockCategories);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual({ categories: mockCategories });
    });

    it('should return inactive categories when onlyInactive is true', async () => {
      const mockCategories = [
        {
          _id: new Types.ObjectId(),
          name: 'Old Category',
          isActive: false,
        },
      ];

      mockProductCategoriesService.findInactive.mockResolvedValue(mockCategories);

      const result = await controller.findAll(undefined, 'true');

      expect(service.findInactive).toHaveBeenCalled();
      expect(result).toEqual({ categories: mockCategories });
    });

    it('should return all categories when includeInactive is true', async () => {
      const mockCategories = [
        {
          _id: new Types.ObjectId(),
          name: 'Active Category',
          isActive: true,
        },
        {
          _id: new Types.ObjectId(),
          name: 'Inactive Category',
          isActive: false,
        },
      ];

      mockProductCategoriesService.findAllIncludingInactive.mockResolvedValue(mockCategories);

      const result = await controller.findAll('true');

      expect(service.findAllIncludingInactive).toHaveBeenCalled();
      expect(result).toEqual({ categories: mockCategories });
    });
  });

  describe('findOne', () => {
    it('should return a category by id', async () => {
      const categoryId = new Types.ObjectId().toString();
      const mockCategory = {
        _id: categoryId,
        name: 'Bolsas',
      };

      mockProductCategoriesService.findById.mockResolvedValue(mockCategory);

      const result = await controller.findOne(categoryId);

      expect(service.findById).toHaveBeenCalledWith(categoryId);
      expect(result).toEqual({ category: mockCategory });
    });

    it('should return message when category not found', async () => {
      const categoryId = new Types.ObjectId().toString();

      mockProductCategoriesService.findById.mockResolvedValue(null);

      const result = await controller.findOne(categoryId);

      expect(result).toEqual({ message: 'Categoría no encontrada' });
    });
  });

  describe('update', () => {
    it('should update a category successfully', async () => {
      const categoryId = new Types.ObjectId().toString();
      const updateDto: UpdateProductCategoryDto = {
        name: 'Updated Category',
      };

      const mockCategory = {
        _id: categoryId,
        ...updateDto,
      };

      mockProductCategoriesService.update.mockResolvedValue(mockCategory);

      const result = await controller.update(categoryId, updateDto);

      expect(service.update).toHaveBeenCalledWith(categoryId, updateDto);
      expect(result).toEqual({
        message: 'Categoría actualizada exitosamente',
        category: mockCategory,
      });
    });
  });

  describe('deactivate', () => {
    it('should deactivate a category successfully', async () => {
      const categoryId = new Types.ObjectId().toString();
      const mockCategory = {
        _id: categoryId,
        isActive: false,
      };

      mockProductCategoriesService.deactivate.mockResolvedValue(mockCategory);

      const result = await controller.deactivate(categoryId);

      expect(service.deactivate).toHaveBeenCalledWith(categoryId);
      expect(result).toEqual({
        message: 'Categoría desactivada exitosamente',
        category: mockCategory,
      });
    });
  });

  describe('reactivate', () => {
    it('should reactivate a category successfully', async () => {
      const categoryId = new Types.ObjectId().toString();
      const mockCategory = {
        _id: categoryId,
        isActive: true,
      };

      mockProductCategoriesService.reactivate.mockResolvedValue(mockCategory);

      const result = await controller.reactivate(categoryId);

      expect(service.reactivate).toHaveBeenCalledWith(categoryId);
      expect(result).toEqual({
        message: 'Categoría reactivada exitosamente',
        category: mockCategory,
      });
    });
  });

  describe('deletePermanently', () => {
    it('should delete a category permanently', async () => {
      const categoryId = new Types.ObjectId().toString();

      mockProductCategoriesService.deletePermanently.mockResolvedValue(undefined);

      const result = await controller.deletePermanently(categoryId);

      expect(service.deletePermanently).toHaveBeenCalledWith(categoryId);
      expect(result).toEqual({ message: 'Categoría eliminada permanentemente' });
    });
  });
});

