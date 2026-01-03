import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product, ProductDocument } from './schemas/products.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Types } from 'mongoose';

describe('ProductsService', () => {
  let service: ProductsService;
  let productModel: Model<ProductDocument>;

  // Mock constructor function for Mongoose Model
  const mockProductModel: any = jest.fn().mockImplementation((data) => ({
    ...data,
    save: jest.fn().mockResolvedValue({ _id: new Types.ObjectId(), ...data }),
  }));

  // Add static methods to the mock
  mockProductModel.find = jest.fn();
  mockProductModel.findById = jest.fn();
  mockProductModel.findByIdAndUpdate = jest.fn();
  mockProductModel.findByIdAndDelete = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getModelToken(Product.name),
          useValue: mockProductModel,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    productModel = module.get<Model<ProductDocument>>(
      getModelToken(Product.name),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a product successfully', async () => {
      const createDto: CreateProductDto = {
        name: 'Test Product',
        description: 'Test Description',
        sell_price: 150,
      };

      const mockProduct = {
        _id: new Types.ObjectId(),
        ...createDto,
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };

      const savedProduct = {
        _id: new Types.ObjectId(),
        ...createDto,
        isActive: true,
      };
      const mockInstance = {
        ...savedProduct,
        save: jest.fn().mockResolvedValue(savedProduct),
      };

      mockProductModel.mockReturnValue(mockInstance);
      mockProductModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(savedProduct),
        }),
      });

      const result = await service.create(createDto);

      expect(mockProductModel).toHaveBeenCalledWith(createDto);
      expect(result).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return all active products', async () => {
      const mockProducts = [
        {
          _id: new Types.ObjectId(),
          name: 'Product 1',
          isActive: true,
        },
        {
          _id: new Types.ObjectId(),
          name: 'Product 2',
          isActive: true,
        },
      ];

      mockProductModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockProducts),
          }),
        }),
      });

      const result = await service.findAll();

      expect(mockProductModel.find).toHaveBeenCalledWith({ isActive: true });
      expect(result).toEqual(mockProducts);
    });
  });

  describe('findById', () => {
    it('should return a product by id', async () => {
      const productId = new Types.ObjectId().toString();
      const mockProduct = {
        _id: productId,
        name: 'Test Product',
        isActive: true,
      };

      mockProductModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockProduct),
        }),
      });

      const result = await service.findById(productId);

      expect(mockProductModel.findById).toHaveBeenCalledWith(productId);
      expect(result).toEqual(mockProduct);
    });

    it('should return null if product not found', async () => {
      const productId = new Types.ObjectId().toString();

      mockProductModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      const result = await service.findById(productId);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a product successfully', async () => {
      const productId = new Types.ObjectId().toString();
      const updateDto: UpdateProductDto = {
        name: 'Updated Product',
      };

      const mockProduct = {
        _id: productId,
        name: 'Original Product',
        save: jest.fn().mockResolvedValue(true),
      };

      mockProductModel.findById
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(mockProduct),
        })
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({ ...mockProduct, ...updateDto }),
          }),
        });

      const result = await service.update(productId, updateDto);

      expect(mockProductModel.findById).toHaveBeenCalled();
      expect(mockProduct.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if product not found', async () => {
      const productId = new Types.ObjectId().toString();
      const updateDto: UpdateProductDto = {};

      mockProductModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.update(productId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update(productId, updateDto)).rejects.toThrow(
        'Producto no encontrado',
      );
    });
  });

  describe('deactivate', () => {
    it('should deactivate a product successfully', async () => {
      const productId = new Types.ObjectId().toString();
      const mockProduct = {
        _id: productId,
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };

      mockProductModel.findById
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(mockProduct),
        })
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnValue({
            exec: jest
              .fn()
              .mockResolvedValue({ ...mockProduct, isActive: false }),
          }),
        });

      const result = await service.deactivate(productId);

      expect(mockProduct.isActive).toBe(false);
      expect(mockProduct.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if product not found', async () => {
      const productId = new Types.ObjectId().toString();

      mockProductModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.deactivate(productId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reactivate', () => {
    it('should reactivate a product successfully', async () => {
      const productId = new Types.ObjectId().toString();
      const mockProduct = {
        _id: productId,
        isActive: false,
        save: jest.fn().mockResolvedValue(true),
      };

      mockProductModel.findById
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(mockProduct),
        })
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnValue({
            exec: jest
              .fn()
              .mockResolvedValue({ ...mockProduct, isActive: true }),
          }),
        });

      const result = await service.reactivate(productId);

      expect(mockProduct.isActive).toBe(true);
      expect(mockProduct.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('deletePermanently', () => {
    it('should delete a product permanently', async () => {
      const productId = new Types.ObjectId().toString();
      const mockProduct = {
        _id: productId,
      };

      mockProductModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProduct),
      });

      await service.deletePermanently(productId);

      expect(mockProductModel.findByIdAndDelete).toHaveBeenCalledWith(
        productId,
      );
    });

    it('should throw NotFoundException if product not found', async () => {
      const productId = new Types.ObjectId().toString();

      mockProductModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.deletePermanently(productId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByCategory', () => {
    it('should return products by category', async () => {
      const categoryId = new Types.ObjectId().toString();
      const mockProducts = [
        {
          _id: new Types.ObjectId(),
          name: 'Product 1',
          categories: [categoryId],
          isActive: true,
        },
      ];

      mockProductModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockProducts),
          }),
        }),
      });

      const result = await service.findByCategory(categoryId);

      expect(mockProductModel.find).toHaveBeenCalledWith({
        categories: categoryId,
        isActive: true,
      });
      expect(result).toEqual(mockProducts);
    });
  });
});
