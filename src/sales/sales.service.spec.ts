import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SalesService } from './sales.service';
import { Sale, SaleDocument } from './schemas/sales.schema';
import {
  Purchase,
  PurchaseDocument,
} from '../purchases/schemas/purchase.schema';
import { Product, ProductDocument } from '../products/schemas/products.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Payment, PaymentDocument } from '../payments/schemas/payment.schema';
import { CreateSaleDto } from './dto/create-sale.dto';
import { CreateSaleWithPaymentDto } from './dto/create-sale-with-payment.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { getConnectionToken } from '@nestjs/mongoose';

describe('SalesService', () => {
  let service: SalesService;
  let saleModel: Model<SaleDocument>;
  let purchaseModel: Model<PurchaseDocument>;
  let productModel: Model<ProductDocument>;
  let userModel: Model<UserDocument>;
  let paymentModel: Model<PaymentDocument>;
  let connection: any;

  // Mock constructor function for Mongoose Model
  const mockSaleModel: any = jest.fn().mockImplementation((data) => ({
    ...data,
    save: jest.fn().mockResolvedValue({ _id: new Types.ObjectId(), ...data }),
  }));

  // Add static methods to the mock
  mockSaleModel.find = jest.fn();
  mockSaleModel.findById = jest.fn();
  mockSaleModel.findByIdAndUpdate = jest.fn();
  mockSaleModel.findByIdAndDelete = jest.fn();

  const mockPurchaseModel = {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  const mockProductModel = {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  const mockUserModel = {
    findById: jest.fn(),
  };

  const mockPaymentModel: any = jest.fn().mockImplementation((data) => ({
    ...data,
    save: jest.fn().mockResolvedValue({ _id: new Types.ObjectId(), ...data }),
  }));

  mockPaymentModel.findById = jest.fn();

  const mockConnection = {
    startSession: jest.fn().mockReturnValue({
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        {
          provide: getModelToken(Sale.name),
          useValue: mockSaleModel,
        },
        {
          provide: getModelToken(Purchase.name),
          useValue: mockPurchaseModel,
        },
        {
          provide: getModelToken(Product.name),
          useValue: mockProductModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(Payment.name),
          useValue: mockPaymentModel,
        },
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
    saleModel = module.get<Model<SaleDocument>>(getModelToken(Sale.name));
    purchaseModel = module.get<Model<PurchaseDocument>>(
      getModelToken(Purchase.name),
    );
    productModel = module.get<Model<ProductDocument>>(
      getModelToken(Product.name),
    );
    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
    paymentModel = module.get<Model<PaymentDocument>>(
      getModelToken(Payment.name),
    );
    connection = module.get(getConnectionToken());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const userId = new Types.ObjectId();
    const productId = new Types.ObjectId();
    const purchaseId = new Types.ObjectId();

    const createSaleDto: CreateSaleDto = {
      user: userId.toString(),
      sales_lines: [
        {
          product: productId.toString(),
          quantity: 5,
          sell_price: 150,
          line_total: 750,
        },
      ],
      total_ammount: 750,
    };

    const mockUser = {
      _id: userId,
      email: 'test@example.com',
      toObject: jest
        .fn()
        .mockReturnValue({ _id: userId, email: 'test@example.com' }),
    };

    const mockProduct = {
      _id: productId,
      name: 'Test Product',
      stock: 10,
    };

    const mockPurchase = {
      _id: purchaseId,
      product: productId,
      quantity: 10,
      available: 10,
      purchase_price: 100,
      isActive: true,
      createdAt: new Date('2024-01-01'),
      save: jest.fn().mockResolvedValue(true),
    };

    const mockSale = {
      _id: new Types.ObjectId(),
      user: userId,
      sales_lines: [
        {
          product: productId,
          quantity: 5,
          sell_price: 150,
          purchase_price: 100,
          line_total: 750,
          line_total_cost: 500,
        },
      ],
      total_ammount: 750,
      isActive: true,
      save: jest.fn().mockResolvedValue(true),
    };

    it('should create a sale successfully', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      mockProductModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProduct),
      });

      mockPurchaseModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([mockPurchase]),
        }),
      });

      mockProductModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(true),
      });

      const savedSale = {
        _id: new Types.ObjectId(),
        user: userId,
        sales_lines: [
          {
            product: productId,
            quantity: 5,
            sell_price: 150,
            purchase_price: 100,
            line_total: 750,
            line_total_cost: 500,
          },
        ],
        total_ammount: 750,
        isActive: true,
      };

      const mockInstance = {
        ...savedSale,
        save: jest.fn().mockResolvedValue(savedSale),
      };

      mockSaleModel.mockReturnValue(mockInstance);

      // Mock para el populate después de save
      mockSaleModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(savedSale),
          }),
        }),
      });

      const result = await service.create(createSaleDto);

      expect(mockUserModel.findById).toHaveBeenCalledWith(userId.toString());
      expect(mockProductModel.findById).toHaveBeenCalledWith(productId);
      expect(mockPurchaseModel.find).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException if user not found', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.create(createSaleDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createSaleDto)).rejects.toThrow(
        'Usuario no encontrado',
      );
    });

    it('should throw BadRequestException if product not found', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      mockProductModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.create(createSaleDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if insufficient stock', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      mockProductModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProduct),
      });

      const mockPurchaseLowStock = {
        ...mockPurchase,
        available: 2,
      };

      mockPurchaseModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([mockPurchaseLowStock]),
        }),
      });

      await expect(service.create(createSaleDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createSaleDto)).rejects.toThrow(
        'Stock insuficiente',
      );
    });
  });

  describe('findAll', () => {
    it('should return all active sales', async () => {
      const mockSales = [
        {
          _id: new Types.ObjectId(),
          user: new Types.ObjectId(),
          sales_lines: [],
          total_ammount: 100,
          isActive: true,
        },
      ];

      mockSaleModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(mockSales),
            }),
          }),
        }),
      });

      const result = await service.findAll();

      expect(mockSaleModel.find).toHaveBeenCalledWith({ isActive: true });
      expect(result).toEqual(mockSales);
    });
  });

  describe('findById', () => {
    it('should return a sale by id', async () => {
      const saleId = new Types.ObjectId().toString();
      const mockSale = {
        _id: saleId,
        user: new Types.ObjectId(),
        sales_lines: [],
        total_ammount: 100,
      };

      mockSaleModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockSale),
          }),
        }),
      });

      const result = await service.findById(saleId);

      expect(mockSaleModel.findById).toHaveBeenCalledWith(saleId);
      expect(result).toEqual(mockSale);
    });

    it('should return null if sale not found', async () => {
      const saleId = new Types.ObjectId().toString();

      mockSaleModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
          }),
        }),
      });

      const result = await service.findById(saleId);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a sale successfully', async () => {
      const saleId = new Types.ObjectId().toString();
      const updateDto: UpdateSaleDto = {
        total_ammount: 200,
      };

      const mockSale = {
        _id: saleId,
        user: new Types.ObjectId(),
        sales_lines: [],
        total_ammount: 100,
        save: jest.fn().mockResolvedValue(true),
      };

      mockSaleModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSale),
      });

      mockSaleModel.findById
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(mockSale),
        })
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue({ ...mockSale, ...updateDto }),
            }),
          }),
        });

      const result = await service.update(saleId, updateDto);

      expect(mockSaleModel.findById).toHaveBeenCalled();
      expect(mockSale.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if sale not found', async () => {
      const saleId = new Types.ObjectId().toString();
      const updateDto: UpdateSaleDto = {};

      mockSaleModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.update(saleId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update(saleId, updateDto)).rejects.toThrow(
        'Venta no encontrada',
      );
    });
  });

  describe('deactivate', () => {
    it('should deactivate a sale successfully', async () => {
      const saleId = new Types.ObjectId().toString();
      const mockSale = {
        _id: saleId,
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };

      mockSaleModel.findById
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(mockSale),
        })
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              exec: jest
                .fn()
                .mockResolvedValue({ ...mockSale, isActive: false }),
            }),
          }),
        });

      const result = await service.deactivate(saleId);

      expect(mockSale.isActive).toBe(false);
      expect(mockSale.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if sale not found', async () => {
      const saleId = new Types.ObjectId().toString();

      mockSaleModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.deactivate(saleId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reactivate', () => {
    it('should reactivate a sale successfully', async () => {
      const saleId = new Types.ObjectId().toString();
      const mockSale = {
        _id: saleId,
        isActive: false,
        save: jest.fn().mockResolvedValue(true),
      };

      mockSaleModel.findById
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(mockSale),
        })
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              exec: jest
                .fn()
                .mockResolvedValue({ ...mockSale, isActive: true }),
            }),
          }),
        });

      const result = await service.reactivate(saleId);

      expect(mockSale.isActive).toBe(true);
      expect(mockSale.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('deletePermanently', () => {
    it('should delete a sale permanently', async () => {
      const saleId = new Types.ObjectId().toString();
      const mockSale = {
        _id: saleId,
      };

      mockSaleModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSale),
      });

      mockSaleModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSale),
      });

      await service.deletePermanently(saleId);

      expect(mockSaleModel.findByIdAndDelete).toHaveBeenCalledWith(saleId);
    });

    it('should throw NotFoundException if sale not found', async () => {
      const saleId = new Types.ObjectId().toString();

      mockSaleModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.deletePermanently(saleId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createWithPayment', () => {
    const userId = new Types.ObjectId();
    const productId = new Types.ObjectId();
    const purchaseId = new Types.ObjectId();
    const saleId = new Types.ObjectId();

    const createSaleWithPaymentDto: CreateSaleWithPaymentDto = {
      user: userId.toString(),
      sales_lines: [
        {
          product: productId.toString(),
          quantity: 5,
          sell_price: 150,
          line_total: 750,
        },
      ],
      total_ammount: 750,
      payments: [
        {
          payment_method: 'cash',
          ammount: 500,
        },
        {
          payment_method: 'card',
          ammount: 250,
        },
      ],
    };

    const mockUser = {
      _id: userId,
      email: 'test@example.com',
      name: 'Test',
      family_name: 'User',
    };

    const mockProduct = {
      _id: productId,
      name: 'Test Product',
      stock: 10,
    };

    const mockPurchase = {
      _id: purchaseId,
      product: productId,
      quantity: 10,
      available: 10,
      purchase_price: 100,
      isActive: true,
      createdAt: new Date('2024-01-01'),
    };

    const mockSession = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      abortTransaction: jest.fn().mockResolvedValue(undefined),
      endSession: jest.fn().mockResolvedValue(undefined),
    };

    beforeEach(() => {
      mockConnection.startSession.mockReturnValue(mockSession);
    });

    it('should create a sale with multiple payments successfully', async () => {
      // Mock user
      mockUserModel.findById.mockReturnValue({
        session: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockUser),
        }),
      });

      // Mock product
      mockProductModel.findById.mockReturnValue({
        session: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockProduct),
        }),
      });

      // Mock purchases
      mockPurchaseModel.find.mockReturnValue({
        session: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockPurchase]),
          }),
        }),
      });

      // Mock purchase update
      (mockPurchaseModel as any).findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockPurchase,
          available: 5, // 10 - 5 = 5
        }),
      });

      // Mock product stock update
      (mockProductModel as any).findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: productId,
          name: 'Test Product',
          price: 100,
          stock: 5, // 10 - 5 = 5
        }),
      });

      // Mock sale creation
      const mockSavedSale = {
        _id: saleId,
        user: userId,
        sales_lines: [
          {
            product: productId,
            quantity: 5,
            sell_price: 150,
            purchase_price: 100,
            line_total: 750,
            line_total_cost: 500,
          },
        ],
        total_ammount: 750,
        status: 'pending',
        save: jest.fn().mockResolvedValue({
          _id: saleId,
          status: 'paid',
        }),
      };

      const mockSaleInstance = {
        _id: saleId,
        user: userId,
        sales_lines: [
          {
            product: productId,
            quantity: 5,
            sell_price: 150,
            purchase_price: 100,
            line_total: 750,
            line_total_cost: 500,
          },
        ],
        total_ammount: 750,
        status: 'pending',
        save: jest.fn().mockResolvedValue(mockSavedSale),
      };

      mockSaleModel.mockReturnValue(mockSaleInstance);

      // Mock payment creation
      const mockPayment1 = {
        _id: new Types.ObjectId(),
        sale: saleId,
        payment_method: 'cash',
        ammount: 500,
        user: userId,
        save: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(),
          sale: saleId,
          payment_method: 'cash',
          ammount: 500,
        }),
      };

      const mockPayment2 = {
        _id: new Types.ObjectId(),
        sale: saleId,
        payment_method: 'card',
        ammount: 250,
        user: userId,
        save: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(),
          sale: saleId,
          payment_method: 'card',
          ammount: 250,
        }),
      };

      mockPaymentModel
        .mockReturnValueOnce(mockPayment1)
        .mockReturnValueOnce(mockPayment2);

      // Mock populate after transaction
      mockSaleModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockSavedSale),
          }),
        }),
      });

      mockPaymentModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockPayment1),
          }),
        }),
      });

      const result = await service.createWithPayment(createSaleWithPaymentDto);

      expect(mockConnection.startSession).toHaveBeenCalled();
      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
      expect(result.sale).toBeDefined();
      expect(result.payments).toHaveLength(2);
      expect(result.sale.status).toBe('paid');
    });

    it('should set sale status to pending if payments do not cover total', async () => {
      const partialPaymentDto: CreateSaleWithPaymentDto = {
        ...createSaleWithPaymentDto,
        payments: [
          {
            payment_method: 'cash',
            ammount: 300, // Menor que 750
          },
        ],
      };

      mockUserModel.findById.mockReturnValue({
        session: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockUser),
        }),
      });

      mockProductModel.findById.mockReturnValue({
        session: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockProduct),
        }),
      });

      mockPurchaseModel.find.mockReturnValue({
        session: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockPurchase]),
          }),
        }),
      });

      mockPurchaseModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPurchase),
      });

      mockProductModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProduct),
      });

      const mockSavedSale = {
        _id: saleId,
        status: 'pending',
        save: jest.fn().mockResolvedValue({
          _id: saleId,
          status: 'pending',
        }),
      };

      const mockSaleInstance = {
        _id: saleId,
        status: 'pending',
        save: jest.fn().mockResolvedValue(mockSavedSale),
      };

      mockSaleModel.mockReturnValue(mockSaleInstance);

      const mockPayment = {
        _id: new Types.ObjectId(),
        save: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
      };

      mockPaymentModel.mockReturnValue(mockPayment);

      mockSaleModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockSavedSale),
          }),
        }),
      });

      mockPaymentModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockPayment),
          }),
        }),
      });

      const result = await service.createWithPayment(partialPaymentDto);

      expect(result.sale.status).toBe('pending');
      expect(mockSaleInstance.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if payments exceed total', async () => {
      const excessivePaymentDto: CreateSaleWithPaymentDto = {
        ...createSaleWithPaymentDto,
        payments: [
          {
            payment_method: 'cash',
            ammount: 1000, // Mayor que 750
          },
        ],
      };

      mockUserModel.findById.mockReturnValue({
        session: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockUser),
        }),
      });

      mockProductModel.findById.mockReturnValue({
        session: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockProduct),
        }),
      });

      mockPurchaseModel.find.mockReturnValue({
        session: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockPurchase]),
          }),
        }),
      });

      mockPurchaseModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPurchase),
      });

      mockProductModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProduct),
      });

      const mockSavedSale = {
        _id: saleId,
        status: 'pending',
        save: jest.fn().mockResolvedValue({
          _id: saleId,
          status: 'pending',
        }),
      };

      const mockSaleInstance = {
        _id: saleId,
        status: 'pending',
        save: jest.fn().mockResolvedValue(mockSavedSale),
      };

      mockSaleModel.mockReturnValue(mockSaleInstance);

      await expect(
        service.createWithPayment(excessivePaymentDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createWithPayment(excessivePaymentDto),
      ).rejects.toThrow('no puede exceder el total de la venta');

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.commitTransaction).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if no payments provided', async () => {
      const noPaymentsDto: CreateSaleWithPaymentDto = {
        ...createSaleWithPaymentDto,
        payments: [],
      };

      mockUserModel.findById.mockReturnValue({
        session: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockUser),
        }),
      });

      mockProductModel.findById.mockReturnValue({
        session: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockProduct),
        }),
      });

      mockPurchaseModel.find.mockReturnValue({
        session: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockPurchase]),
          }),
        }),
      });

      mockPurchaseModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPurchase),
      });

      mockProductModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProduct),
      });

      const mockSavedSale = {
        _id: saleId,
        status: 'pending',
        save: jest.fn().mockResolvedValue({
          _id: saleId,
          status: 'pending',
        }),
      };

      const mockSaleInstance = {
        _id: saleId,
        status: 'pending',
        save: jest.fn().mockResolvedValue(mockSavedSale),
      };

      mockSaleModel.mockReturnValue(mockSaleInstance);

      await expect(service.createWithPayment(noPaymentsDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createWithPayment(noPaymentsDto)).rejects.toThrow(
        'Debe proporcionar al menos un pago',
      );

      expect(mockSession.abortTransaction).toHaveBeenCalled();
    });

    it('should update purchases.available correctly', async () => {
      mockUserModel.findById.mockReturnValue({
        session: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockUser),
        }),
      });

      mockProductModel.findById.mockReturnValue({
        session: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockProduct),
        }),
      });

      mockPurchaseModel.find.mockReturnValue({
        session: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockPurchase]),
          }),
        }),
      });

      // Verificar que se actualiza purchase.available
      mockPurchaseModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockPurchase,
          available: 5, // 10 - 5 = 5
        }),
      });

      mockProductModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProduct),
      });

      const mockSavedSale = {
        _id: saleId,
        status: 'pending',
        save: jest.fn().mockResolvedValue({
          _id: saleId,
          status: 'pending',
        }),
      };

      const mockSaleInstance = {
        _id: saleId,
        status: 'pending',
        save: jest.fn().mockResolvedValue(mockSavedSale),
      };

      mockSaleModel.mockReturnValue(mockSaleInstance);

      const mockPayment = {
        _id: new Types.ObjectId(),
        save: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
      };

      mockPaymentModel.mockReturnValue(mockPayment);

      mockSaleModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockSavedSale),
          }),
        }),
      });

      mockPaymentModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockPayment),
          }),
        }),
      });

      await service.createWithPayment(createSaleWithPaymentDto);

      expect(mockPurchaseModel.findByIdAndUpdate).toHaveBeenCalledWith(
        purchaseId,
        { $inc: { available: -5 } },
        { new: true, session: mockSession },
      );
    });

    it('should update product.stock correctly', async () => {
      mockUserModel.findById.mockReturnValue({
        session: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockUser),
        }),
      });

      mockProductModel.findById.mockReturnValue({
        session: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockProduct),
        }),
      });

      mockPurchaseModel.find.mockReturnValue({
        session: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockPurchase]),
          }),
        }),
      });

      mockPurchaseModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPurchase),
      });

      // Verificar que se actualiza product.stock
      mockProductModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockProduct,
          stock: 5, // 10 - 5 = 5
        }),
      });

      const mockSavedSale = {
        _id: saleId,
        status: 'pending',
        save: jest.fn().mockResolvedValue({
          _id: saleId,
          status: 'pending',
        }),
      };

      const mockSaleInstance = {
        _id: saleId,
        status: 'pending',
        save: jest.fn().mockResolvedValue(mockSavedSale),
      };

      mockSaleModel.mockReturnValue(mockSaleInstance);

      const mockPayment = {
        _id: new Types.ObjectId(),
        save: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
      };

      mockPaymentModel.mockReturnValue(mockPayment);

      mockSaleModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockSavedSale),
          }),
        }),
      });

      mockPaymentModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockPayment),
          }),
        }),
      });

      await service.createWithPayment(createSaleWithPaymentDto);

      expect(mockProductModel.findByIdAndUpdate).toHaveBeenCalledWith(
        productId.toString(),
        { $inc: { stock: -5 } },
        { session: mockSession },
      );
    });

    it('should validate stock again before creating sale (final validation)', async () => {
      // Mock user
      mockUserModel.findById.mockReturnValue({
        session: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockUser),
        }),
      });

      // Mock product - primera llamada (procesar sales_lines)
      mockProductModel.findById.mockReturnValueOnce({
        session: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockProduct),
        }),
      });

      // Mock purchases - primera llamada (procesar sales_lines)
      mockPurchaseModel.find.mockReturnValueOnce({
        session: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockPurchase]),
          }),
        }),
      });

      // Mock purchase update
      mockPurchaseModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockPurchase,
          available: 5, // 10 - 5 = 5
        }),
      });

      // Mock product para la validación final (debe tener suficiente stock)
      mockProductModel.findById
        .mockReturnValueOnce({
          session: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockProduct), // Primera llamada (procesar sales_lines)
          }),
        })
        .mockReturnValueOnce({
          session: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockProduct), // Segunda llamada (validación final)
          }),
        });

      // Mock purchases para la validación final (debe tener suficiente available)
      mockPurchaseModel.find
        .mockReturnValueOnce({
          session: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([mockPurchase]), // Primera llamada (procesar sales_lines)
            }),
          }),
        })
        .mockReturnValueOnce({
          session: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([mockPurchase]), // Segunda llamada (validación final)
            }),
          }),
        });

      // Mock product stock update
      mockProductModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProduct),
      });

      // Mock sale creation
      const mockSavedSale = {
        _id: saleId,
        status: 'pending',
        save: jest.fn().mockResolvedValue({
          _id: saleId,
          status: 'pending',
        }),
      };

      const mockSaleInstance = {
        _id: saleId,
        status: 'pending',
        save: jest.fn().mockResolvedValue(mockSavedSale),
      };

      mockSaleModel.mockReturnValue(mockSaleInstance);

      // Mock payment creation
      const mockPayment = {
        _id: new Types.ObjectId(),
        save: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
      };

      mockPaymentModel.mockReturnValue(mockPayment);

      mockSaleModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockSavedSale),
          }),
        }),
      });

      mockPaymentModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockPayment),
          }),
        }),
      });

      await service.createWithPayment(createSaleWithPaymentDto);

      // Verificar que se llamó findById para la validación final
      expect(mockProductModel.findById).toHaveBeenCalledTimes(2); // Una para procesar, otra para validar
      expect(mockPurchaseModel.find).toHaveBeenCalledTimes(2); // Una para procesar, otra para validar
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if stock is insufficient during final validation (purchases)', async () => {
      // Mock user
      mockUserModel.findById.mockReturnValue({
        session: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockUser),
        }),
      });

      // Mock product - primera llamada (procesar sales_lines)
      mockProductModel.findById.mockReturnValueOnce({
        session: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockProduct),
        }),
      });

      // Mock purchases - primera llamada (procesar sales_lines) - suficiente stock
      mockPurchaseModel.find.mockReturnValueOnce({
        session: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockPurchase]),
          }),
        }),
      });

      // Mock purchase update - se actualiza correctamente
      mockPurchaseModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockPurchase,
          available: 5, // 10 - 5 = 5
        }),
      });

      // Mock product - segunda llamada (validación final) - suficiente stock en producto
      mockProductModel.findById.mockReturnValueOnce({
        session: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockProduct),
        }),
      });

      // Mock purchases - segunda llamada (validación final) - insuficiente stock
      // Simulamos que después de la actualización, otra transacción consumió stock
      // y ahora solo hay 2 disponibles (insuficiente para quantity: 5)
      const mockPurchaseLowStock = {
        ...mockPurchase,
        available: 2, // Insuficiente para quantity: 5
      };

      mockPurchaseModel.find.mockReturnValueOnce({
        session: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockPurchaseLowStock]),
          }),
        }),
      });

      // NO mockeamos product stock update ni sale creation porque la validación falla antes

      await expect(
        service.createWithPayment(createSaleWithPaymentDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createWithPayment(createSaleWithPaymentDto),
      ).rejects.toThrow('Stock insuficiente para el producto');

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.commitTransaction).not.toHaveBeenCalled();
      // Verificar que NO se creó la venta
      expect(mockSaleModel).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if product stock is insufficient during final validation', async () => {
      // Mock user
      mockUserModel.findById.mockReturnValue({
        session: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockUser),
        }),
      });

      // Mock product - primera llamada (procesar sales_lines)
      mockProductModel.findById.mockReturnValueOnce({
        session: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockProduct),
        }),
      });

      // Mock purchases - primera llamada (procesar sales_lines)
      mockPurchaseModel.find.mockReturnValueOnce({
        session: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockPurchase]),
          }),
        }),
      });

      // Mock purchase update
      mockPurchaseModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockPurchase,
          available: 5,
        }),
      });

      // Mock product - segunda llamada (validación final) - stock insuficiente
      const mockProductLowStock = {
        ...mockProduct,
        stock: 2, // Insuficiente para quantity: 5
      };

      mockProductModel.findById.mockReturnValueOnce({
        session: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockProductLowStock),
        }),
      });

      // Mock purchases - segunda llamada (validación final) - suficiente
      mockPurchaseModel.find.mockReturnValueOnce({
        session: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockPurchase]),
          }),
        }),
      });

      // NO mockeamos product stock update ni sale creation porque la validación falla antes

      await expect(
        service.createWithPayment(createSaleWithPaymentDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createWithPayment(createSaleWithPaymentDto),
      ).rejects.toThrow('Stock insuficiente en el producto');

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.commitTransaction).not.toHaveBeenCalled();
      // Verificar que NO se creó la venta
      expect(mockSaleModel).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if product not found during final validation', async () => {
      // Mock user
      mockUserModel.findById.mockReturnValue({
        session: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockUser),
        }),
      });

      // Mock product - primera llamada (procesar sales_lines)
      mockProductModel.findById.mockReturnValueOnce({
        session: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockProduct),
        }),
      });

      // Mock purchases - primera llamada (procesar sales_lines)
      mockPurchaseModel.find.mockReturnValueOnce({
        session: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockPurchase]),
          }),
        }),
      });

      // Mock purchase update
      mockPurchaseModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockPurchase,
          available: 5,
        }),
      });

      // Mock product - segunda llamada (validación final) - no encontrado
      // Simulamos que el producto fue eliminado entre el procesamiento y la validación final
      mockProductModel.findById.mockReturnValueOnce({
        session: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      // NO mockeamos purchases find ni product stock update ni sale creation porque la validación falla antes

      await expect(
        service.createWithPayment(createSaleWithPaymentDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createWithPayment(createSaleWithPaymentDto),
      ).rejects.toThrow('no encontrado durante la validación final');

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.commitTransaction).not.toHaveBeenCalled();
      // Verificar que NO se creó la venta
      expect(mockSaleModel).not.toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      mockUserModel.findById.mockReturnValue({
        session: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockUser),
        }),
      });

      mockProductModel.findById.mockReturnValue({
        session: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null), // Product not found
        }),
      });

      await expect(
        service.createWithPayment(createSaleWithPaymentDto),
      ).rejects.toThrow(BadRequestException);

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.commitTransaction).not.toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });
  });
});
