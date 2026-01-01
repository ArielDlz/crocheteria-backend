import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { Types } from 'mongoose';

describe('PermissionsController', () => {
  let controller: PermissionsController;
  let service: PermissionsService;

  const mockPermissionsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    getGroupedByModule: jest.fn(),
    findByModule: jest.fn(),
    delete: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockPermissionsGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PermissionsController],
      providers: [
        {
          provide: PermissionsService,
          useValue: mockPermissionsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(mockPermissionsGuard)
      .compile();

    controller = module.get<PermissionsController>(PermissionsController);
    service = module.get<PermissionsService>(PermissionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a permission successfully', async () => {
      const createDto: CreatePermissionDto = {
        module: 'products',
        action: 'create',
        description: 'Create products',
      };

      const mockPermission = {
        _id: new Types.ObjectId(),
        ...createDto,
        code: 'products:create',
        isActive: true,
      };

      mockPermissionsService.create.mockResolvedValue(mockPermission);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual({
        message: 'Permiso creado exitosamente',
        permission: mockPermission,
      });
    });
  });

  describe('findAll', () => {
    it('should return all permissions', async () => {
      const mockPermissions = [
        {
          _id: new Types.ObjectId(),
          module: 'products',
          action: 'read',
          code: 'products:read',
        },
        {
          _id: new Types.ObjectId(),
          module: 'sales',
          action: 'create',
          code: 'sales:create',
        },
      ];

      mockPermissionsService.findAll.mockResolvedValue(mockPermissions);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual({ permissions: mockPermissions });
    });
  });

  describe('getGrouped', () => {
    it('should return permissions grouped by module', async () => {
      const mockGrouped = {
        products: [
          {
            _id: new Types.ObjectId(),
            module: 'products',
            action: 'read',
            code: 'products:read',
          },
          {
            _id: new Types.ObjectId(),
            module: 'products',
            action: 'create',
            code: 'products:create',
          },
        ],
        sales: [
          {
            _id: new Types.ObjectId(),
            module: 'sales',
            action: 'read',
            code: 'sales:read',
          },
        ],
      };

      mockPermissionsService.getGroupedByModule.mockResolvedValue(mockGrouped);

      const result = await controller.getGrouped();

      expect(service.getGroupedByModule).toHaveBeenCalled();
      expect(result).toEqual({ permissions: mockGrouped });
    });
  });

  describe('findByModule', () => {
    it('should return permissions by module', async () => {
      const module = 'products';
      const mockPermissions = [
        {
          _id: new Types.ObjectId(),
          module: 'products',
          action: 'read',
          code: 'products:read',
        },
        {
          _id: new Types.ObjectId(),
          module: 'products',
          action: 'create',
          code: 'products:create',
        },
      ];

      mockPermissionsService.findByModule.mockResolvedValue(mockPermissions);

      const result = await controller.findByModule(module);

      expect(service.findByModule).toHaveBeenCalledWith(module);
      expect(result).toEqual({ permissions: mockPermissions });
    });
  });

  describe('delete', () => {
    it('should delete a permission successfully', async () => {
      const code = 'products:create';

      mockPermissionsService.delete.mockResolvedValue(undefined);

      const result = await controller.delete(code);

      expect(service.delete).toHaveBeenCalledWith(code);
      expect(result).toEqual({ message: 'Permiso desactivado exitosamente' });
    });
  });
});
