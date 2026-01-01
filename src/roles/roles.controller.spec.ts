import { Test, TestingModule } from '@nestjs/testing';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CreateRoleDto } from './dto/create-role.dto';
import { Types } from 'mongoose';

describe('RolesController', () => {
  let controller: RolesController;
  let service: RolesService;

  const mockRolesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
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
      controllers: [RolesController],
      providers: [
        {
          provide: RolesService,
          useValue: mockRolesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(mockPermissionsGuard)
      .compile();

    controller = module.get<RolesController>(RolesController);
    service = module.get<RolesService>(RolesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a role successfully', async () => {
      const createDto: CreateRoleDto = {
        name: 'editor',
        description: 'Editor role',
        permissions: ['products:read', 'products:update'],
      };

      const mockRole = {
        _id: new Types.ObjectId(),
        ...createDto,
        isActive: true,
      };

      mockRolesService.create.mockResolvedValue(mockRole);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual({
        message: 'Rol creado exitosamente',
        role: mockRole,
      });
    });
  });

  describe('findAll', () => {
    it('should return all roles', async () => {
      const mockRoles = [
        {
          _id: new Types.ObjectId(),
          name: 'viewer',
          description: 'Viewer role',
        },
        {
          _id: new Types.ObjectId(),
          name: 'editor',
          description: 'Editor role',
        },
      ];

      mockRolesService.findAll.mockResolvedValue(mockRoles);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual({ roles: mockRoles });
    });
  });

  describe('findOne', () => {
    it('should return a role by id', async () => {
      const roleId = new Types.ObjectId().toString();
      const mockRole = {
        _id: roleId,
        name: 'viewer',
        description: 'Viewer role',
      };

      mockRolesService.findById.mockResolvedValue(mockRole);

      const result = await controller.findOne(roleId);

      expect(service.findById).toHaveBeenCalledWith(roleId);
      expect(result).toEqual({ role: mockRole });
    });

    it('should return message when role not found', async () => {
      const roleId = new Types.ObjectId().toString();

      mockRolesService.findById.mockResolvedValue(null);

      const result = await controller.findOne(roleId);

      expect(result).toEqual({ message: 'Rol no encontrado' });
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

      const mockRole = {
        _id: roleId,
        ...updateDto,
      };

      mockRolesService.update.mockResolvedValue(mockRole);

      const result = await controller.update(roleId, updateDto);

      expect(service.update).toHaveBeenCalledWith(roleId, updateDto);
      expect(result).toEqual({
        message: 'Rol actualizado exitosamente',
        role: mockRole,
      });
    });
  });

  describe('delete', () => {
    it('should delete a role successfully', async () => {
      const roleId = new Types.ObjectId().toString();

      mockRolesService.delete.mockResolvedValue(undefined);

      const result = await controller.delete(roleId);

      expect(service.delete).toHaveBeenCalledWith(roleId);
      expect(result).toEqual({ message: 'Rol desactivado exitosamente' });
    });
  });
});
