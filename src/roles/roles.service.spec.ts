import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { RolesService } from './roles.service';
import { Role, RoleDocument } from './schemas/role.schema';
import { PermissionsService } from '../permissions/permissions.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { Types } from 'mongoose';

describe('RolesService', () => {
  let service: RolesService;
  let roleModel: Model<RoleDocument>;
  let permissionsService: PermissionsService;

  // Mock constructor function for Mongoose Model
  const mockRoleModel: any = jest.fn().mockImplementation((data) => ({
    ...data,
    save: jest.fn().mockResolvedValue({ _id: new Types.ObjectId(), ...data }),
  }));

  // Add static methods to the mock
  mockRoleModel.findOne = jest.fn();
  mockRoleModel.find = jest.fn();
  mockRoleModel.findById = jest.fn();
  mockRoleModel.findByIdAndUpdate = jest.fn();

  const mockPermissionsService = {
    findByCodes: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: getModelToken(Role.name),
          useValue: mockRoleModel,
        },
        {
          provide: PermissionsService,
          useValue: mockPermissionsService,
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    roleModel = module.get<Model<RoleDocument>>(getModelToken(Role.name));
    permissionsService = module.get<PermissionsService>(PermissionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a role successfully', async () => {
      const createDto: CreateRoleDto = {
        name: 'editor',
        description: 'Editor role',
        permissions: ['products:read', 'products:update'],
      };

      const mockPermissions = [
        { code: 'products:read' },
        { code: 'products:update' },
      ];

      mockRoleModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      mockPermissionsService.findByCodes.mockResolvedValue(mockPermissions);

      const savedRole = {
        _id: new Types.ObjectId(),
        ...createDto,
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };

      const mockInstance = {
        ...savedRole,
        save: jest.fn().mockResolvedValue(savedRole),
      };

      mockRoleModel.mockReturnValue(mockInstance);

      const result = await service.create(createDto);

      expect(mockRoleModel.findOne).toHaveBeenCalledWith({ name: createDto.name });
      expect(result).toBeDefined();
    });

    it('should throw ConflictException if role already exists', async () => {
      const createDto: CreateRoleDto = {
        name: 'existing',
        description: 'Existing role',
        permissions: [],
      };

      const existingRole = {
        _id: new Types.ObjectId(),
        name: 'existing',
      };

      mockRoleModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingRole),
      });

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createDto)).rejects.toThrow('El rol existing ya existe');
    });

    it('should throw BadRequestException if invalid permissions', async () => {
      const createDto: CreateRoleDto = {
        name: 'editor',
        description: 'Editor role',
        permissions: ['invalid:permission'],
      };

      mockRoleModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      mockPermissionsService.findByCodes.mockResolvedValue([]);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow('Permisos inválidos');
    });
  });

  describe('findAll', () => {
    it('should return all active roles', async () => {
      const mockRoles = [
        {
          _id: new Types.ObjectId(),
          name: 'viewer',
          isActive: true,
        },
        {
          _id: new Types.ObjectId(),
          name: 'editor',
          isActive: true,
        },
      ];

      mockRoleModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockRoles),
        }),
      });

      const result = await service.findAll();

      expect(mockRoleModel.find).toHaveBeenCalledWith({ isActive: true });
      expect(result).toEqual(mockRoles);
    });
  });

  describe('findById', () => {
    it('should return a role by id', async () => {
      const roleId = new Types.ObjectId().toString();
      const mockRole = {
        _id: roleId,
        name: 'viewer',
      };

      mockRoleModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockRole),
      });

      const result = await service.findById(roleId);

      expect(mockRoleModel.findById).toHaveBeenCalledWith(roleId);
      expect(result).toEqual(mockRole);
    });

    it('should return null if role not found', async () => {
      const roleId = new Types.ObjectId().toString();

      mockRoleModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findById(roleId);

      expect(result).toBeNull();
    });
  });

  describe('findByName', () => {
    it('should return a role by name', async () => {
      const roleName = 'viewer';
      const mockRole = {
        _id: new Types.ObjectId(),
        name: roleName,
      };

      mockRoleModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockRole),
      });

      const result = await service.findByName(roleName);

      expect(mockRoleModel.findOne).toHaveBeenCalledWith({ name: roleName, isActive: true });
      expect(result).toEqual(mockRole);
    });
  });

  describe('update', () => {
    it('should update a role successfully', async () => {
      const roleId = new Types.ObjectId().toString();
      const updateDto: CreateRoleDto = {
        name: 'editor',
        description: 'Updated description',
        permissions: ['products:read'],
      };

      const updatedRole = {
        _id: roleId,
        name: 'editor',
        description: 'Updated description',
        permissions: ['products:read'],
        isSystem: false,
      };

      const mockRole = {
        _id: roleId,
        name: 'editor',
        description: 'Old description',
        permissions: [],
        isSystem: false,
        save: jest.fn().mockResolvedValue(updatedRole),
      };

      const mockPermissions = [{ code: 'products:read' }];

      mockRoleModel.findById.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(mockRole),
      });

      mockPermissionsService.findByCodes.mockResolvedValue(mockPermissions);

      const result = await service.update(roleId, updateDto);

      expect(mockRoleModel.findById).toHaveBeenCalledWith(roleId);
      expect(mockRole.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if role not found', async () => {
      const roleId = new Types.ObjectId().toString();
      const updateDto: CreateRoleDto = {
        name: 'editor',
        description: 'Description',
        permissions: [],
      };

      // Clear previous mocks and set new one
      mockRoleModel.findById.mockReset();
      mockRoleModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.update(roleId, updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a role successfully', async () => {
      const roleId = new Types.ObjectId().toString();
      const mockRole = {
        _id: roleId,
        isActive: true,
        isSystem: false,
        save: jest.fn().mockResolvedValue(true),
      };

      // Clear previous mocks and set new one
      mockRoleModel.findById.mockReset();
      mockRoleModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockRole),
      });

      await service.delete(roleId);

      expect(mockRole.isActive).toBe(false);
      expect(mockRole.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if role not found', async () => {
      const roleId = new Types.ObjectId().toString();

      // Clear previous mocks and set new one
      mockRoleModel.findById.mockReset();
      mockRoleModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.delete(roleId)).rejects.toThrow(NotFoundException);
    });
  });
});

