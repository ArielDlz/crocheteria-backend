import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { Permission, PermissionDocument } from './schemas/permission.schema';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { Types } from 'mongoose';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let permissionModel: Model<PermissionDocument>;

  // Mock constructor function for Mongoose Model
  const mockPermissionModel: any = jest.fn().mockImplementation((data) => ({
    ...data,
    save: jest.fn().mockResolvedValue({ _id: new Types.ObjectId(), ...data }),
  }));

  // Add static methods to the mock
  mockPermissionModel.findOne = jest.fn();
  mockPermissionModel.find = jest.fn();
  mockPermissionModel.findOneAndUpdate = jest.fn();
  mockPermissionModel.create = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        {
          provide: getModelToken(Permission.name),
          useValue: mockPermissionModel,
        },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
    permissionModel = module.get<Model<PermissionDocument>>(getModelToken(Permission.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a permission successfully', async () => {
      const createDto: CreatePermissionDto = {
        module: 'products',
        action: 'create',
        description: 'Create products',
      };

      mockPermissionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const savedPermission = {
        _id: new Types.ObjectId(),
        ...createDto,
        code: 'products:create',
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };

      const mockInstance = {
        ...savedPermission,
        save: jest.fn().mockResolvedValue(savedPermission),
      };

      mockPermissionModel.mockReturnValue(mockInstance);

      const result = await service.create(createDto);

      expect(mockPermissionModel.findOne).toHaveBeenCalledWith({ code: 'products:create' });
      expect(result).toBeDefined();
    });

    it('should throw ConflictException if permission already exists', async () => {
      const createDto: CreatePermissionDto = {
        module: 'products',
        action: 'read',
        description: 'Read products',
      };

      const existingPermission = {
        _id: new Types.ObjectId(),
        code: 'products:read',
      };

      mockPermissionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingPermission),
      });

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createDto)).rejects.toThrow('El permiso products:read ya existe');
    });
  });

  describe('findAll', () => {
    it('should return all active permissions', async () => {
      const mockPermissions = [
        {
          _id: new Types.ObjectId(),
          module: 'products',
          action: 'read',
          code: 'products:read',
          isActive: true,
        },
        {
          _id: new Types.ObjectId(),
          module: 'sales',
          action: 'create',
          code: 'sales:create',
          isActive: true,
        },
      ];

      mockPermissionModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPermissions),
        }),
      });

      const result = await service.findAll();

      expect(mockPermissionModel.find).toHaveBeenCalledWith({ isActive: true });
      expect(result).toEqual(mockPermissions);
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
      ];

      mockPermissionModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPermissions),
      });

      const result = await service.findByModule(module);

      expect(mockPermissionModel.find).toHaveBeenCalledWith({ module, isActive: true });
      expect(result).toEqual(mockPermissions);
    });
  });

  describe('findByCode', () => {
    it('should return a permission by code', async () => {
      const code = 'products:read';
      const mockPermission = {
        _id: new Types.ObjectId(),
        code,
        module: 'products',
        action: 'read',
      };

      mockPermissionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPermission),
      });

      const result = await service.findByCode(code);

      expect(mockPermissionModel.findOne).toHaveBeenCalledWith({ code });
      expect(result).toEqual(mockPermission);
    });
  });

  describe('findByCodes', () => {
    it('should return permissions by codes', async () => {
      const codes = ['products:read', 'sales:create'];
      const mockPermissions = [
        {
          _id: new Types.ObjectId(),
          code: 'products:read',
        },
        {
          _id: new Types.ObjectId(),
          code: 'sales:create',
        },
      ];

      mockPermissionModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPermissions),
      });

      const result = await service.findByCodes(codes);

      expect(mockPermissionModel.find).toHaveBeenCalledWith({
        code: { $in: codes },
        isActive: true,
      });
      expect(result).toEqual(mockPermissions);
    });
  });

  describe('getGroupedByModule', () => {
    it('should return permissions grouped by module', async () => {
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
        {
          _id: new Types.ObjectId(),
          module: 'sales',
          action: 'read',
          code: 'sales:read',
        },
      ];

      mockPermissionModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPermissions),
        }),
      });

      const result = await service.getGroupedByModule();

      expect(result).toEqual({
        products: [mockPermissions[0], mockPermissions[1]],
        sales: [mockPermissions[2]],
      });
    });
  });

  describe('delete', () => {
    it('should delete a permission successfully', async () => {
      const code = 'products:create';
      const mockPermission = {
        _id: new Types.ObjectId(),
        code,
      };

      mockPermissionModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPermission),
      });

      await service.delete(code);

      expect(mockPermissionModel.findOneAndUpdate).toHaveBeenCalledWith(
        { code },
        { isActive: false },
      );
    });

    it('should throw NotFoundException if permission not found', async () => {
      const code = 'nonexistent:permission';

      mockPermissionModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.delete(code)).rejects.toThrow(NotFoundException);
      await expect(service.delete(code)).rejects.toThrow(`Permiso ${code} no encontrado`);
    });
  });
});

