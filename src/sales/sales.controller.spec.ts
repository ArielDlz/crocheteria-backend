import { Test, TestingModule } from '@nestjs/testing';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { StockValidationGuard } from './guards/stock-validation.guard';

describe('SalesController', () => {
  let controller: SalesController;
  let service: SalesService;

  const mockSalesService = {
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

  const mockStockValidationGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalesController],
      providers: [
        {
          provide: SalesService,
          useValue: mockSalesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(mockPermissionsGuard)
      .overrideGuard(StockValidationGuard)
      .useValue(mockStockValidationGuard)
      .compile();

    controller = module.get<SalesController>(SalesController);
    service = module.get<SalesService>(SalesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a sale', async () => {
      const createDto: CreateSaleDto = {
        user: new Types.ObjectId().toString(),
        sales_lines: [
          {
            product: new Types.ObjectId().toString(),
            quantity: 2,
            sell_price: 150,
            line_total: 300,
          },
        ],
        total_ammount: 300,
      };

      const mockSale = {
        _id: new Types.ObjectId(),
        ...createDto,
        isActive: true,
      };

      mockSalesService.create.mockResolvedValue(mockSale);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual({
        message: 'Venta registrada exitosamente',
        sale: mockSale,
      });
    });
  });

  describe('findAll', () => {
    it('should return all active sales by default', async () => {
      const mockSales = [
        {
          _id: new Types.ObjectId(),
          user: new Types.ObjectId(),
          sales_lines: [],
          total_ammount: 100,
        },
      ];

      mockSalesService.findAll.mockResolvedValue(mockSales);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual({ sales: mockSales });
    });

    it('should return inactive sales when onlyInactive is true', async () => {
      const mockSales = [
        {
          _id: new Types.ObjectId(),
          isActive: false,
        },
      ];

      mockSalesService.findInactive.mockResolvedValue(mockSales);

      const result = await controller.findAll(undefined, 'true');

      expect(service.findInactive).toHaveBeenCalled();
      expect(result).toEqual({ sales: mockSales });
    });

    it('should return all sales when includeInactive is true', async () => {
      const mockSales = [
        {
          _id: new Types.ObjectId(),
          isActive: true,
        },
        {
          _id: new Types.ObjectId(),
          isActive: false,
        },
      ];

      mockSalesService.findAllIncludingInactive.mockResolvedValue(mockSales);

      const result = await controller.findAll('true');

      expect(service.findAllIncludingInactive).toHaveBeenCalled();
      expect(result).toEqual({ sales: mockSales });
    });
  });

  describe('findOne', () => {
    it('should return a sale by id', async () => {
      const saleId = new Types.ObjectId().toString();
      const mockSale = {
        _id: saleId,
        user: new Types.ObjectId(),
        sales_lines: [],
        total_ammount: 100,
      };

      mockSalesService.findById.mockResolvedValue(mockSale);

      const result = await controller.findOne(saleId);

      expect(service.findById).toHaveBeenCalledWith(saleId);
      expect(result).toEqual({ sale: mockSale });
    });

    it('should return message when sale not found', async () => {
      const saleId = new Types.ObjectId().toString();

      mockSalesService.findById.mockResolvedValue(null);

      const result = await controller.findOne(saleId);

      expect(result).toEqual({ message: 'Venta no encontrada' });
    });
  });

  describe('update', () => {
    it('should update a sale', async () => {
      const saleId = new Types.ObjectId().toString();
      const updateDto: UpdateSaleDto = {
        total_ammount: 200,
      };

      const mockSale = {
        _id: saleId,
        ...updateDto,
      };

      mockSalesService.update.mockResolvedValue(mockSale);

      const result = await controller.update(saleId, updateDto);

      expect(service.update).toHaveBeenCalledWith(saleId, updateDto);
      expect(result).toEqual({
        message: 'Venta actualizada exitosamente',
        sale: mockSale,
      });
    });
  });

  describe('deactivate', () => {
    it('should deactivate a sale', async () => {
      const saleId = new Types.ObjectId().toString();
      const mockSale = {
        _id: saleId,
        isActive: false,
      };

      mockSalesService.deactivate.mockResolvedValue(mockSale);

      const result = await controller.deactivate(saleId);

      expect(service.deactivate).toHaveBeenCalledWith(saleId);
      expect(result).toEqual({
        message: 'Venta desactivada exitosamente',
        sale: mockSale,
      });
    });
  });

  describe('reactivate', () => {
    it('should reactivate a sale', async () => {
      const saleId = new Types.ObjectId().toString();
      const mockSale = {
        _id: saleId,
        isActive: true,
      };

      mockSalesService.reactivate.mockResolvedValue(mockSale);

      const result = await controller.reactivate(saleId);

      expect(service.reactivate).toHaveBeenCalledWith(saleId);
      expect(result).toEqual({
        message: 'Venta reactivada exitosamente',
        sale: mockSale,
      });
    });
  });

  describe('deletePermanently', () => {
    it('should delete a sale permanently', async () => {
      const saleId = new Types.ObjectId().toString();

      mockSalesService.deletePermanently.mockResolvedValue(undefined);

      const result = await controller.deletePermanently(saleId);

      expect(service.deletePermanently).toHaveBeenCalledWith(saleId);
      expect(result).toEqual({ message: 'Venta eliminada permanentemente' });
    });
  });
});

