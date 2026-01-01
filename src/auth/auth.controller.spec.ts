import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { Types } from 'mongoose';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let usersService: UsersService;

  const mockAuthService = {
    login: jest.fn(),
  };

  const mockUsersService = {
    getEffectivePermissions: jest.fn(),
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should login successfully', async () => {
      const mockRequest = {
        user: {
          _id: new Types.ObjectId(),
          email: 'test@example.com',
        },
        ip: '127.0.0.1',
      };

      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockResponse = {
        message: 'Inicio de sesión exitoso',
        user: {
          id: mockRequest.user._id,
          email: mockRequest.user.email,
        },
        access_token: 'jwt-token',
      };

      mockAuthService.login.mockResolvedValue(mockResponse);

      const result = await controller.login(mockRequest, loginDto, 'Mozilla/5.0');

      expect(authService.login).toHaveBeenCalledWith(
        mockRequest.user,
        mockRequest.ip,
        'Mozilla/5.0',
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const userId = new Types.ObjectId();
      const mockRequest = {
        user: {
          userId: userId.toString(),
          email: 'test@example.com',
        },
      };

      const mockPermissions = ['sales:read', 'products:read'];
      const mockUser = {
        _id: userId,
        email: 'test@example.com',
        role: {
          _id: new Types.ObjectId(),
          name: 'admin',
          isSuperAdmin: false,
        },
      };

      mockUsersService.getEffectivePermissions.mockResolvedValue(mockPermissions);
      mockUsersService.findById.mockResolvedValue(mockUser);

      const result = await controller.getProfile(mockRequest);

      expect(usersService.getEffectivePermissions).toHaveBeenCalledWith(
        userId.toString(),
      );
      expect(usersService.findById).toHaveBeenCalledWith(userId.toString());
      expect(result).toEqual({
        message: 'Perfil del usuario',
        user: {
          id: userId.toString(),
          email: mockRequest.user.email,
          role: {
            id: mockUser.role._id,
            name: mockUser.role.name,
            isSuperAdmin: mockUser.role.isSuperAdmin,
          },
        },
        permissions: mockPermissions,
      });
    });
  });
});

