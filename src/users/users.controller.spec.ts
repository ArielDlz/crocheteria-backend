import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserPermissionsDto, ChangeUserRoleDto } from './dto/update-user-permissions.dto';
import { PermissionAuditAction } from '../audit/schemas/permission-audit.schema';
import { Types } from 'mongoose';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;
  let auditService: AuditService;

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    changeRole: jest.fn(),
    addExtraPermissions: jest.fn(),
    removeExtraPermissions: jest.fn(),
    addDeniedPermissions: jest.fn(),
    removeDeniedPermissions: jest.fn(),
    deactivate: jest.fn(),
    reactivate: jest.fn(),
    getEffectivePermissions: jest.fn(),
  };

  const mockAuditService = {
    logPermissionChange: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockPermissionsGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(mockPermissionsGuard)
      .compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
    auditService = module.get<AuditService>(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a user successfully', async () => {
      const userId = new Types.ObjectId();
      const roleId = new Types.ObjectId();
      const dto: AdminCreateUserDto = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New',
        familyName: 'User',
        roleId: roleId.toString(),
      };

      const mockUser = {
        _id: userId,
        email: dto.email,
        name: dto.name,
        family_name: dto.familyName,
        role: { _id: roleId, name: 'viewer' },
        extraPermissions: [],
        isActive: true,
      };

      const mockUserWithRole = {
        ...mockUser,
        role: { _id: roleId, name: 'viewer' },
      };

      mockUsersService.create.mockResolvedValue(mockUser);
      mockUsersService.findById.mockResolvedValue(mockUserWithRole);
      mockUsersService.getEffectivePermissions.mockResolvedValue(['products:read']);

      const mockRequest = {
        user: {
          userId: new Types.ObjectId().toString(),
          email: 'admin@example.com',
        },
        ip: '127.0.0.1',
      };

      const result = await controller.create(dto, mockRequest);

      expect(usersService.create).toHaveBeenCalledWith(
        {
          email: dto.email,
          password: dto.password,
          name: dto.name,
          familyName: dto.familyName,
        },
        dto.roleId,
      );
      expect(auditService.logPermissionChange).toHaveBeenCalled();
      expect(result.message).toBe('Usuario creado exitosamente');
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const mockUsers = [
        {
          _id: new Types.ObjectId(),
          email: 'user1@example.com',
        },
        {
          _id: new Types.ObjectId(),
          email: 'user2@example.com',
        },
      ];

      mockUsersService.findAll.mockResolvedValue(mockUsers);

      const result = await controller.findAll();

      expect(usersService.findAll).toHaveBeenCalled();
      expect(result).toEqual({ users: mockUsers });
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      const userId = new Types.ObjectId().toString();
      const mockUser = {
        _id: userId,
        email: 'test@example.com',
        name: 'Test',
        familyName: 'User',
        role: { _id: new Types.ObjectId(), name: 'viewer' },
        extraPermissions: [],
        deniedPermissions: [],
        isActive: true,
        toObject: jest.fn().mockReturnValue({
          _id: userId,
          email: 'test@example.com',
          name: 'Test',
          familyName: 'User',
          role: { _id: new Types.ObjectId(), name: 'viewer' },
          extraPermissions: [],
          deniedPermissions: [],
          isActive: true,
        }),
      };

      mockUsersService.findById.mockResolvedValue(mockUser);
      mockUsersService.getEffectivePermissions.mockResolvedValue(['products:read']);

      const result = await controller.findOne(userId);

      expect(usersService.findById).toHaveBeenCalledWith(userId);
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('effectivePermissions');
    });

    it('should return message when user not found', async () => {
      const userId = new Types.ObjectId().toString();

      mockUsersService.findById.mockResolvedValue(null);

      const result = await controller.findOne(userId);

      expect(result).toEqual({ message: 'Usuario no encontrado' });
    });
  });

  describe('getPermissions', () => {
    it('should return user permissions', async () => {
      const userId = new Types.ObjectId().toString();
      const mockPermissions = ['products:read', 'sales:read'];

      mockUsersService.getEffectivePermissions.mockResolvedValue(mockPermissions);

      const result = await controller.getPermissions(userId);

      expect(usersService.getEffectivePermissions).toHaveBeenCalledWith(userId);
      expect(result).toEqual({ permissions: mockPermissions });
    });
  });

  describe('update', () => {
    it('should update a user successfully', async () => {
      const userId = new Types.ObjectId().toString();
      const updateDto: UpdateUserDto = {
        name: 'Updated Name',
      };

      const mockUser = {
        _id: userId,
        email: 'test@example.com',
        name: 'Updated Name',
        family_name: 'User',
        role: { _id: new Types.ObjectId(), name: 'viewer' },
        isActive: true,
      };

      mockUsersService.findById.mockResolvedValue(mockUser);
      mockUsersService.update.mockResolvedValue(mockUser);
      mockUsersService.getEffectivePermissions.mockResolvedValue(['products:read']);

      const mockRequest = {
        user: {
          userId: new Types.ObjectId().toString(),
          email: 'admin@example.com',
        },
        ip: '127.0.0.1',
      };

      const result = await controller.update(userId, updateDto, mockRequest);

      expect(usersService.update).toHaveBeenCalledWith(userId, updateDto);
      expect(result.message).toBe('Usuario actualizado exitosamente');
    });
  });

  describe('changeRole', () => {
    it('should change user role successfully', async () => {
      const userId = new Types.ObjectId().toString();
      const newRoleId = new Types.ObjectId().toString();
      const dto: ChangeUserRoleDto = {
        roleId: newRoleId,
        reason: 'Role change test',
      };

      const mockUser = {
        _id: userId,
        email: 'test@example.com',
        role: { _id: newRoleId, name: 'admin' },
      };

      mockUsersService.findById.mockResolvedValue(mockUser);
      mockUsersService.changeRole.mockResolvedValue(mockUser);
      mockUsersService.getEffectivePermissions.mockResolvedValue(['*']);

      const mockRequest = {
        user: {
          userId: new Types.ObjectId().toString(),
          email: 'admin@example.com',
        },
        ip: '127.0.0.1',
      };

      const result = await controller.changeRole(userId, dto, mockRequest);

      expect(usersService.changeRole).toHaveBeenCalledWith(userId, dto.roleId);
      expect(auditService.logPermissionChange).toHaveBeenCalled();
      expect(result.message).toBe('Rol actualizado exitosamente');
    });
  });

  describe('updatePermissions', () => {
    it('should update user permissions successfully', async () => {
      const userId = new Types.ObjectId().toString();
      const dto: UpdateUserPermissionsDto = {
        addPermissions: ['products:create'],
        reason: 'Adding permissions',
      };

      const mockUser = {
        _id: userId,
        email: 'test@example.com',
        extraPermissions: ['products:create'],
        deniedPermissions: [],
      };

      mockUsersService.findById.mockResolvedValue(mockUser);
      mockUsersService.addExtraPermissions.mockResolvedValue(mockUser);
      mockUsersService.getEffectivePermissions.mockResolvedValue(['products:read', 'products:create']);

      const mockRequest = {
        user: {
          userId: new Types.ObjectId().toString(),
          email: 'admin@example.com',
        },
        ip: '127.0.0.1',
      };

      const result = await controller.updatePermissions(userId, dto, mockRequest);

      expect(usersService.addExtraPermissions).toHaveBeenCalledWith(userId, dto.addPermissions);
      expect(auditService.logPermissionChange).toHaveBeenCalled();
      expect(result.message).toBe('Permisos actualizados exitosamente');
    });
  });

  describe('deactivate', () => {
    it('should deactivate a user successfully', async () => {
      const userId = new Types.ObjectId().toString();
      const mockUser = {
        _id: userId,
        email: 'test@example.com',
      };

      mockUsersService.findById.mockResolvedValue(mockUser);
      mockUsersService.deactivate.mockResolvedValue({ ...mockUser, isActive: false });

      const mockRequest = {
        user: {
          userId: new Types.ObjectId().toString(),
          email: 'admin@example.com',
        },
        ip: '127.0.0.1',
      };

      const result = await controller.deactivate(userId, mockRequest);

      expect(usersService.deactivate).toHaveBeenCalledWith(userId);
      expect(auditService.logPermissionChange).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        PermissionAuditAction.USER_DEACTIVATED,
        {},
        undefined,
        mockRequest.ip,
      );
      expect(result.message).toBe('Usuario desactivado exitosamente');
    });
  });

  describe('reactivate', () => {
    it('should reactivate a user successfully', async () => {
      const userId = new Types.ObjectId().toString();
      const mockUser = {
        _id: userId,
        email: 'test@example.com',
      };

      mockUsersService.findById.mockResolvedValue(mockUser);
      mockUsersService.reactivate.mockResolvedValue({ ...mockUser, isActive: true });

      const mockRequest = {
        user: {
          userId: new Types.ObjectId().toString(),
          email: 'admin@example.com',
        },
        ip: '127.0.0.1',
      };

      const result = await controller.reactivate(userId, mockRequest);

      expect(usersService.reactivate).toHaveBeenCalledWith(userId);
      expect(auditService.logPermissionChange).toHaveBeenCalled();
      expect(result.message).toBe('Usuario reactivado exitosamente');
    });
  });
});

