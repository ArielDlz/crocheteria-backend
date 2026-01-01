import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { Purchase, PurchaseDocument } from './schemas/purchase.schema';
import { Product, ProductDocument } from '../products/schemas/products.schema';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { Types } from 'mongoose';

describe('PurchasesService', () => {
  let service: PurchasesService;
  let purchaseModel: Model<PurchaseDocument>;
  let productModel: Model<ProductDocument>;

  // Mock constructor function for Mongoose Model
  const mockPurchaseModel: any = jest.fn().mockImplementation((data) => ({
    ...data,
    save: jest.fn().mockResolvedValue({ _id: new Types.ObjectId(), ...data }),
  }));

  // Add static methods to the mock
  mockPurchaseModel.find = jest.fn();
  mockPurchaseModel.findById = jest.fn();
  mockPurchaseModel.findByIdAndUpdate = jest.fn();
  mockPurchaseModel.findByIdAndDelete = jest.fn();

  const mockProductModel = {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchasesService,
        {
          provide: getModelToken(Purchase.name),
          useValue: mockPurchaseModel,
        },
        {
          provide: getModelToken(Product.name),
          useValue: mockProductModel,
        },
      ],
    }).compile();

    service = module.get<PurchasesService>(PurchasesService);
    purchaseModel = module.get<Model<PurchaseDocument>>(
      getModelToken(Purchase.name),
    );
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
    it('should create a purchase successfully', async () => {
      const productId = new Types.ObjectId();
      const createDto: CreatePurchaseDto = {
        product: productId.toString(),
        quantity: 10,
        purchase_price: 100,
        total_cost: 1000,
        startup: false,
      };

      const mockProduct = {
        _id: productId,
        name: 'Test Product',
        stock: 5,
      };

      const mockPurchase = {
        _id: new Types.ObjectId(),
        product: productId,
        quantity: 10,
        available: 10,
        purchase_price: 100,
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };

      mockProductModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProduct),
      });

      const savedPurchase = {
        _id: new Types.ObjectId(),
        product: productId,
        quantity: 10,
        available: 10,
        purchase_price: 100,
        total_cost: 1000,
        startup: false,
        isActive: true,
      };

      const mockInstance = {
        ...savedPurchase,
        save: jest.fn().mockResolvedValue(savedPurchase),
      };

      mockPurchaseModel.mockReturnValue(mockInstance);
      mockProductModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(true),
      });

      mockPurchaseModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(savedPurchase),
        }),
      });

      const result = await service.create(createDto);

      expect(mockProductModel.findById).toHaveBeenCalledWith(
        productId.toString(),
      );
      expect(mockProductModel.findByIdAndUpdate).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException if product not found', async () => {
      const productId = new Types.ObjectId();
      const createDto: CreatePurchaseDto = {
        product: productId.toString(),
        quantity: 10,
        purchase_price: 100,
        total_cost: 1000,
        startup: false,
      };

      mockProductModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'Producto no encontrado',
      );
    });
  });

  describe('findAll', () => {
    it('should return all active purchases', async () => {
      const mockPurchases = [
        {
          _id: new Types.ObjectId(),
          product: new Types.ObjectId(),
          quantity: 10,
          isActive: true,
        },
      ];

      mockPurchaseModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockPurchases),
          }),
        }),
      });

      const result = await service.findAll();

      expect(result).toEqual(mockPurchases);
    });
  });

  describe('findById', () => {
    it('should return a purchase by id', async () => {
      const purchaseId = new Types.ObjectId().toString();
      const mockPurchase = {
        _id: purchaseId,
        product: new Types.ObjectId(),
        quantity: 10,
      };

      mockPurchaseModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPurchase),
        }),
      });

      const result = await service.findById(purchaseId);

      expect(mockPurchaseModel.findById).toHaveBeenCalledWith(purchaseId);
      expect(result).toEqual(mockPurchase);
    });

    it('should return null if purchase not found', async () => {
      const purchaseId = new Types.ObjectId().toString();

      mockPurchaseModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      const result = await service.findById(purchaseId);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a purchase successfully', async () => {
      const purchaseId = new Types.ObjectId().toString();
      const productId = new Types.ObjectId();
      const updateDto: UpdatePurchaseDto = {
        quantity: 15,
      };

      const mockPurchase = {
        _id: purchaseId,
        product: productId,
        quantity: 10,
        save: jest.fn().mockResolvedValue(true),
      };

      mockPurchaseModel.findById
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(mockPurchase),
        })
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnValue({
            exec: jest
              .fn()
              .mockResolvedValue({ ...mockPurchase, ...updateDto }),
          }),
        });

      mockProductModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(true),
      });

      const result = await service.update(purchaseId, updateDto);

      expect(mockPurchaseModel.findById).toHaveBeenCalled();
      expect(mockPurchase.save).toHaveBeenCalled();
      expect(mockProductModel.findByIdAndUpdate).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if purchase not found', async () => {
      const purchaseId = new Types.ObjectId().toString();
      const updateDto: UpdatePurchaseDto = {};

      mockPurchaseModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.update(purchaseId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update(purchaseId, updateDto)).rejects.toThrow(
        'Compra no encontrada',
      );
    });
  });

  describe('deactivate', () => {
    it('should deactivate a purchase successfully', async () => {
      const purchaseId = new Types.ObjectId().toString();
      const mockPurchase = {
        _id: purchaseId,
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };

      mockPurchaseModel.findById
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(mockPurchase),
        })
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnValue({
            exec: jest
              .fn()
              .mockResolvedValue({ ...mockPurchase, isActive: false }),
          }),
        });

      const result = await service.deactivate(purchaseId);

      expect(mockPurchase.isActive).toBe(false);
      expect(mockPurchase.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if purchase not found', async () => {
      const purchaseId = new Types.ObjectId().toString();

      mockPurchaseModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.deactivate(purchaseId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reactivate', () => {
    it('should reactivate a purchase successfully', async () => {
      const purchaseId = new Types.ObjectId().toString();
      const mockPurchase = {
        _id: purchaseId,
        isActive: false,
        save: jest.fn().mockResolvedValue(true),
      };

      mockPurchaseModel.findById
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(mockPurchase),
        })
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnValue({
            exec: jest
              .fn()
              .mockResolvedValue({ ...mockPurchase, isActive: true }),
          }),
        });

      const result = await service.reactivate(purchaseId);

      expect(mockPurchase.isActive).toBe(true);
      expect(mockPurchase.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('deletePermanently', () => {
    it('should delete a purchase permanently and update product stock', async () => {
      const purchaseId = new Types.ObjectId().toString();
      const productId = new Types.ObjectId();
      const mockPurchase = {
        _id: purchaseId,
        product: productId,
        quantity: 10,
      };

      mockPurchaseModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPurchase),
      });

      mockProductModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(true),
      });

      mockPurchaseModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPurchase),
      });

      await service.deletePermanently(purchaseId);

      expect(mockPurchaseModel.findById).toHaveBeenCalledWith(purchaseId);
      expect(mockProductModel.findByIdAndUpdate).toHaveBeenCalled();
      expect(mockPurchaseModel.findByIdAndDelete).toHaveBeenCalledWith(
        purchaseId,
      );
    });

    it('should throw NotFoundException if purchase not found', async () => {
      const purchaseId = new Types.ObjectId().toString();

      mockPurchaseModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.deletePermanently(purchaseId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
