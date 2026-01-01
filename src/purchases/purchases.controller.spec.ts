import { Test, TestingModule } from '@nestjs/testing';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

describe('PurchasesController', () => {
  let controller: PurchasesController;
  let service: PurchasesService;

  const mockPurchasesService = {
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
      controllers: [PurchasesController],
      providers: [
        {
          provide: PurchasesService,
          useValue: mockPurchasesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(mockPermissionsGuard)
      .compile();

    controller = module.get<PurchasesController>(PurchasesController);
    service = module.get<PurchasesService>(PurchasesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a purchase', async () => {
      const createDto: CreatePurchaseDto = {
        product: new Types.ObjectId().toString(),
        quantity: 10,
        purchase_price: 100,
        total_cost: 1000,
        startup: false,
      };

      const mockPurchase = {
        _id: new Types.ObjectId(),
        ...createDto,
        available: 10,
        isActive: true,
      };

      mockPurchasesService.create.mockResolvedValue(mockPurchase);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual({
        message: 'Compra registrada exitosamente',
        purchase: mockPurchase,
      });
    });
  });

  describe('findAll', () => {
    it('should return all active purchases by default', async () => {
      const mockPurchases = [
        {
          _id: new Types.ObjectId(),
          product: new Types.ObjectId(),
          quantity: 10,
          isActive: true,
        },
      ];

      mockPurchasesService.findAll.mockResolvedValue(mockPurchases);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual({ purchases: mockPurchases });
    });

    it('should return inactive purchases when onlyInactive is true', async () => {
      const mockPurchases = [
        {
          _id: new Types.ObjectId(),
          isActive: false,
        },
      ];

      mockPurchasesService.findInactive.mockResolvedValue(mockPurchases);

      const result = await controller.findAll(undefined, 'true');

      expect(service.findInactive).toHaveBeenCalled();
      expect(result).toEqual({ purchases: mockPurchases });
    });

    it('should return all purchases when includeInactive is true', async () => {
      const mockPurchases = [
        {
          _id: new Types.ObjectId(),
          isActive: true,
        },
        {
          _id: new Types.ObjectId(),
          isActive: false,
        },
      ];

      mockPurchasesService.findAllIncludingInactive.mockResolvedValue(mockPurchases);

      const result = await controller.findAll('true');

      expect(service.findAllIncludingInactive).toHaveBeenCalled();
      expect(result).toEqual({ purchases: mockPurchases });
    });

    it('should filter by startup when provided', async () => {
      const mockPurchases = [
        {
          _id: new Types.ObjectId(),
          startup: true,
        },
      ];

      mockPurchasesService.findAll.mockResolvedValue(mockPurchases);

      const result = await controller.findAll(undefined, undefined, 'true');

      expect(service.findAll).toHaveBeenCalledWith(true);
      expect(result).toEqual({ purchases: mockPurchases });
    });
  });

  describe('findOne', () => {
    it('should return a purchase by id', async () => {
      const purchaseId = new Types.ObjectId().toString();
      const mockPurchase = {
        _id: purchaseId,
        product: new Types.ObjectId(),
        quantity: 10,
      };

      mockPurchasesService.findById.mockResolvedValue(mockPurchase);

      const result = await controller.findOne(purchaseId);

      expect(service.findById).toHaveBeenCalledWith(purchaseId);
      expect(result).toEqual({ purchase: mockPurchase });
    });

    it('should return message when purchase not found', async () => {
      const purchaseId = new Types.ObjectId().toString();

      mockPurchasesService.findById.mockResolvedValue(null);

      const result = await controller.findOne(purchaseId);

      expect(result).toEqual({ message: 'Compra no encontrada' });
    });
  });

  describe('update', () => {
    it('should update a purchase', async () => {
      const purchaseId = new Types.ObjectId().toString();
      const updateDto: UpdatePurchaseDto = {
        quantity: 15,
      };

      const mockPurchase = {
        _id: purchaseId,
        ...updateDto,
      };

      mockPurchasesService.update.mockResolvedValue(mockPurchase);

      const result = await controller.update(purchaseId, updateDto);

      expect(service.update).toHaveBeenCalledWith(purchaseId, updateDto);
      expect(result).toEqual({
        message: 'Compra actualizada exitosamente',
        purchase: mockPurchase,
      });
    });
  });

  describe('deactivate', () => {
    it('should deactivate a purchase', async () => {
      const purchaseId = new Types.ObjectId().toString();
      const mockPurchase = {
        _id: purchaseId,
        isActive: false,
      };

      mockPurchasesService.deactivate.mockResolvedValue(mockPurchase);

      const result = await controller.deactivate(purchaseId);

      expect(service.deactivate).toHaveBeenCalledWith(purchaseId);
      expect(result).toEqual({
        message: 'Compra desactivada exitosamente',
        purchase: mockPurchase,
      });
    });
  });

  describe('reactivate', () => {
    it('should reactivate a purchase', async () => {
      const purchaseId = new Types.ObjectId().toString();
      const mockPurchase = {
        _id: purchaseId,
        isActive: true,
      };

      mockPurchasesService.reactivate.mockResolvedValue(mockPurchase);

      const result = await controller.reactivate(purchaseId);

      expect(service.reactivate).toHaveBeenCalledWith(purchaseId);
      expect(result).toEqual({
        message: 'Compra reactivada exitosamente',
        purchase: mockPurchase,
      });
    });
  });

  describe('deletePermanently', () => {
    it('should delete a purchase permanently', async () => {
      const purchaseId = new Types.ObjectId().toString();

      mockPurchasesService.deletePermanently.mockResolvedValue(undefined);

      const result = await controller.deletePermanently(purchaseId);

      expect(service.deletePermanently).toHaveBeenCalledWith(purchaseId);
      expect(result).toEqual({ message: 'Compra eliminada permanentemente' });
    });
  });
});

