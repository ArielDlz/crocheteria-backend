import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: ProductsService;

  const mockProductsService = {
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
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(mockPermissionsGuard)
      .compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get<ProductsService>(ProductsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a product', async () => {
      const createDto: CreateProductDto = {
        name: 'Test Product',
        description: 'Test Description',
        sell_price: 150,
        stock: 10,
      };

      const mockProduct = {
        _id: new Types.ObjectId(),
        ...createDto,
        isActive: true,
      };

      mockProductsService.create.mockResolvedValue(mockProduct);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual({
        message: 'Producto creado exitosamente',
        product: mockProduct,
      });
    });
  });

  describe('findAll', () => {
    it('should return all active products by default', async () => {
      const mockProducts = [
        {
          _id: new Types.ObjectId(),
          name: 'Product 1',
          isActive: true,
        },
      ];

      mockProductsService.findAll.mockResolvedValue(mockProducts);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual({ products: mockProducts });
    });

    it('should return inactive products when onlyInactive is true', async () => {
      const mockProducts = [
        {
          _id: new Types.ObjectId(),
          name: 'Product 1',
          isActive: false,
        },
      ];

      mockProductsService.findInactive.mockResolvedValue(mockProducts);

      const result = await controller.findAll(undefined, 'true');

      expect(service.findInactive).toHaveBeenCalled();
      expect(result).toEqual({ products: mockProducts });
    });

    it('should return all products when includeInactive is true', async () => {
      const mockProducts = [
        {
          _id: new Types.ObjectId(),
          name: 'Product 1',
          isActive: true,
        },
        {
          _id: new Types.ObjectId(),
          name: 'Product 2',
          isActive: false,
        },
      ];

      mockProductsService.findAllIncludingInactive.mockResolvedValue(
        mockProducts,
      );

      const result = await controller.findAll('true');

      expect(service.findAllIncludingInactive).toHaveBeenCalled();
      expect(result).toEqual({ products: mockProducts });
    });
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      const productId = new Types.ObjectId().toString();
      const mockProduct = {
        _id: productId,
        name: 'Test Product',
      };

      mockProductsService.findById.mockResolvedValue(mockProduct);

      const result = await controller.findOne(productId);

      expect(service.findById).toHaveBeenCalledWith(productId);
      expect(result).toEqual({ product: mockProduct });
    });

    it('should return message when product not found', async () => {
      const productId = new Types.ObjectId().toString();

      mockProductsService.findById.mockResolvedValue(null);

      const result = await controller.findOne(productId);

      expect(result).toEqual({ message: 'Producto no encontrado' });
    });
  });

  describe('update', () => {
    it('should update a product', async () => {
      const productId = new Types.ObjectId().toString();
      const updateDto: UpdateProductDto = {
        name: 'Updated Product',
      };

      const mockProduct = {
        _id: productId,
        ...updateDto,
      };

      mockProductsService.update.mockResolvedValue(mockProduct);

      const result = await controller.update(productId, updateDto);

      expect(service.update).toHaveBeenCalledWith(productId, updateDto);
      expect(result).toEqual({
        message: 'Producto actualizado exitosamente',
        product: mockProduct,
      });
    });
  });

  describe('deactivate', () => {
    it('should deactivate a product', async () => {
      const productId = new Types.ObjectId().toString();
      const mockProduct = {
        _id: productId,
        isActive: false,
      };

      mockProductsService.deactivate.mockResolvedValue(mockProduct);

      const result = await controller.deactivate(productId);

      expect(service.deactivate).toHaveBeenCalledWith(productId);
      expect(result).toEqual({
        message: 'Producto desactivado exitosamente',
        product: mockProduct,
      });
    });
  });

  describe('reactivate', () => {
    it('should reactivate a product', async () => {
      const productId = new Types.ObjectId().toString();
      const mockProduct = {
        _id: productId,
        isActive: true,
      };

      mockProductsService.reactivate.mockResolvedValue(mockProduct);

      const result = await controller.reactivate(productId);

      expect(service.reactivate).toHaveBeenCalledWith(productId);
      expect(result).toEqual({
        message: 'Producto reactivado exitosamente',
        product: mockProduct,
      });
    });
  });

  describe('deletePermanently', () => {
    it('should delete a product permanently', async () => {
      const productId = new Types.ObjectId().toString();

      mockProductsService.deletePermanently.mockResolvedValue(undefined);

      const result = await controller.deletePermanently(productId);

      expect(service.deletePermanently).toHaveBeenCalledWith(productId);
      expect(result).toEqual({ message: 'Producto eliminado permanentemente' });
    });
  });
});
