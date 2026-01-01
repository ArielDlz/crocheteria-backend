import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserDocument } from './schemas/user.schema';
import { RolesService } from '../roles/roles.service';
import { PermissionsService } from '../permissions/permissions.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UsersService', () => {
  let service: UsersService;
  let userModel: Model<UserDocument>;
  let rolesService: RolesService;
  let permissionsService: PermissionsService;

  // Mock constructor function for Mongoose Model
  const mockUserModel: any = jest.fn().mockImplementation((data) => ({
    ...data,
    save: jest.fn().mockResolvedValue({ _id: new Types.ObjectId(), ...data }),
  }));

  // Add static methods to the mock
  mockUserModel.findOne = jest.fn();
  mockUserModel.find = jest.fn();
  mockUserModel.findById = jest.fn();

  const mockRolesService = {
    findById: jest.fn(),
    findByName: jest.fn(),
  };

  const mockPermissionsService = {
    findAll: jest.fn(),
    findByCodes: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: RolesService,
          useValue: mockRolesService,
        },
        {
          provide: PermissionsService,
          useValue: mockPermissionsService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
    rolesService = module.get<RolesService>(RolesService);
    permissionsService = module.get<PermissionsService>(PermissionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a user successfully', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test',
        familyName: 'User',
      };

      const mockRole = {
        _id: new Types.ObjectId(),
        name: 'viewer',
      };

      const mockUser = {
        _id: new Types.ObjectId(),
        email: createUserDto.email,
        password: 'hashedPassword',
        role: mockRole._id,
        name: createUserDto.name,
        family_name: createUserDto.familyName,
        extraPermissions: [],
        deniedPermissions: [],
        save: jest.fn().mockResolvedValue(true),
      };

      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      mockRolesService.findByName.mockResolvedValue(mockRole);

      const savedUser = {
        _id: new Types.ObjectId(),
        email: createUserDto.email,
        password: 'hashedPassword',
        role: mockRole._id,
        name: createUserDto.name,
        family_name: createUserDto.familyName,
        extraPermissions: [],
        deniedPermissions: [],
      };

      const mockInstance = {
        ...savedUser,
        save: jest.fn().mockResolvedValue(savedUser),
      };

      mockUserModel.mockReturnValue(mockInstance);

      const result = await service.create(createUserDto);

      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: createUserDto.email });
      expect(result).toBeDefined();
    });

    it('should throw ConflictException if email already exists', async () => {
      const createUserDto: CreateUserDto = {
        email: 'existing@example.com',
        password: 'password123',
      };

      const existingUser = {
        _id: new Types.ObjectId(),
        email: createUserDto.email,
      };

      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingUser),
      });

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createUserDto)).rejects.toThrow(
        'El correo electrónico ya está registrado',
      );
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      const email = 'test@example.com';
      const mockUser = {
        _id: new Types.ObjectId(),
        email,
        name: 'Test',
      };

      mockUserModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockUser),
        }),
      });

      const result = await service.findByEmail(email);

      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      const email = 'notfound@example.com';

      mockUserModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      const result = await service.findByEmail(email);

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return a user by id', async () => {
      const userId = new Types.ObjectId().toString();
      const mockUser = {
        _id: userId,
        email: 'test@example.com',
      };

      mockUserModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockUser),
        }),
      });

      const result = await service.findById(userId);

      expect(mockUserModel.findById).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockUser);
    });
  });

  describe('validatePassword', () => {
    it('should return true for valid password', async () => {
      const plainPassword = 'password123';
      const hashedPassword = 'hashedPassword';

      // Mock bcrypt.compare
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(true);

      const result = await service.validatePassword(plainPassword, hashedPassword);

      expect(result).toBe(true);
    });

    it('should return false for invalid password', async () => {
      const plainPassword = 'wrongPassword';
      const hashedPassword = 'hashedPassword';

      // Mock bcrypt.compare
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(false);

      const result = await service.validatePassword(plainPassword, hashedPassword);

      expect(result).toBe(false);
    });
  });

  describe('getEffectivePermissions', () => {
    it('should return all permissions for super admin', async () => {
      const userId = new Types.ObjectId().toString();
      const mockUser = {
        _id: userId,
        role: {
          isSuperAdmin: true,
        },
      };

      const mockPermissions = [
        { code: 'sales:read' },
        { code: 'products:read' },
      ];

      mockUserModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockUser),
        }),
      });

      mockPermissionsService.findAll.mockResolvedValue(mockPermissions);

      const result = await service.getEffectivePermissions(userId);

      expect(result).toEqual(['sales:read', 'products:read']);
    });

    it('should return role permissions for regular user', async () => {
      const userId = new Types.ObjectId().toString();
      const mockUser = {
        _id: userId,
        role: {
          isSuperAdmin: false,
          permissions: ['sales:read', 'products:read'],
        },
        extraPermissions: [],
        deniedPermissions: [],
      };

      mockUserModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockUser),
        }),
      });

      const result = await service.getEffectivePermissions(userId);

      expect(result).toEqual(['sales:read', 'products:read']);
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
        name: 'Original Name',
        save: jest.fn().mockResolvedValue(true),
      };

      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await service.update(userId, updateDto);

      expect(mockUserModel.findById).toHaveBeenCalledWith(userId);
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = new Types.ObjectId().toString();
      const updateDto: UpdateUserDto = {};

      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.update(userId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deactivate', () => {
    it('should deactivate a user successfully', async () => {
      const userId = new Types.ObjectId().toString();
      const mockUser = {
        _id: userId,
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };

      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await service.deactivate(userId);

      expect(mockUser.isActive).toBe(false);
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('reactivate', () => {
    it('should reactivate a user successfully', async () => {
      const userId = new Types.ObjectId().toString();
      const mockUser = {
        _id: userId,
        isActive: false,
        save: jest.fn().mockResolvedValue(true),
      };

      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await service.reactivate(userId);

      expect(mockUser.isActive).toBe(true);
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});

