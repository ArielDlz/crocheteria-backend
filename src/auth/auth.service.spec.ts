import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { LoginAuditAction } from '../audit/schemas/login-audit.schema';
import { Types } from 'mongoose';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let auditService: AuditService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    validatePassword: jest.fn(),
    getEffectivePermissions: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockAuditService = {
    logLogin: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    auditService = module.get<AuditService>(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user without password when credentials are valid', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const userId = new Types.ObjectId();

      const mockUser = {
        _id: userId,
        email,
        password: 'hashedPassword',
        name: 'Test',
        toObject: jest.fn().mockReturnValue({
          _id: userId,
          email,
          name: 'Test',
        }),
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockUsersService.validatePassword.mockResolvedValue(true);

      const result = await service.validateUser(email, password);

      expect(usersService.findByEmail).toHaveBeenCalledWith(email);
      expect(usersService.validatePassword).toHaveBeenCalledWith(
        password,
        mockUser.password,
      );
      expect(result).toBeDefined();
      expect(result).not.toHaveProperty('password');
    });

    it('should return null when user not found', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser(email, password);

      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      const email = 'test@example.com';
      const password = 'wrongPassword';
      const userId = new Types.ObjectId();

      const mockUser = {
        _id: userId,
        email,
        password: 'hashedPassword',
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockUsersService.validatePassword.mockResolvedValue(false);

      const result = await service.validateUser(email, password);

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should login successfully and return access token', async () => {
      const userId = new Types.ObjectId();
      const mockUser = {
        _id: userId,
        email: 'test@example.com',
      };

      const mockFullUser = {
        _id: userId,
        email: 'test@example.com',
        role: {
          _id: new Types.ObjectId(),
          name: 'admin',
          isSuperAdmin: false,
        },
      };

      const mockPermissions = ['sales:read', 'sales:create'];
      const mockToken = 'jwt-token';

      mockUsersService.getEffectivePermissions.mockResolvedValue(mockPermissions);
      mockUsersService.findById.mockResolvedValue(mockFullUser);
      mockJwtService.sign.mockReturnValue(mockToken);
      mockAuditService.logLogin.mockResolvedValue(undefined);

      const result = await service.login(mockUser, '127.0.0.1', 'Mozilla/5.0');

      expect(usersService.getEffectivePermissions).toHaveBeenCalledWith(
        userId.toString(),
      );
      expect(jwtService.sign).toHaveBeenCalled();
      expect(auditService.logLogin).toHaveBeenCalledWith(
        mockUser.email,
        LoginAuditAction.LOGIN_SUCCESS,
        true,
        userId.toString(),
        '127.0.0.1',
        'Mozilla/5.0',
      );
      expect(result).toEqual({
        message: 'Inicio de sesión exitoso',
        user: {
          id: userId,
          email: mockUser.email,
          role: {
            id: mockFullUser.role._id,
            name: mockFullUser.role.name,
            isSuperAdmin: mockFullUser.role.isSuperAdmin,
          },
        },
        permissions: mockPermissions,
        access_token: mockToken,
      });
    });
  });

  describe('logFailedLogin', () => {
    it('should log failed login attempt', async () => {
      const email = 'test@example.com';
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla/5.0';

      mockAuditService.logLogin.mockResolvedValue(undefined);

      await service.logFailedLogin(email, ipAddress, userAgent);

      expect(auditService.logLogin).toHaveBeenCalledWith(
        email,
        LoginAuditAction.LOGIN_FAILED,
        false,
        undefined,
        ipAddress,
        userAgent,
        'Credenciales inválidas',
      );
    });
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const email = 'newuser@example.com';
      const password = 'password123';
      const userId = new Types.ObjectId();

      const mockNewUser = {
        _id: userId,
        email,
        password: 'hashedPassword',
      };

      const mockFullUser = {
        _id: userId,
        email,
        role: {
          _id: new Types.ObjectId(),
          name: 'viewer',
          isSuperAdmin: false,
        },
      };

      const mockPermissions = ['products:read'];
      const mockToken = 'jwt-token';

      mockUsersService.create.mockResolvedValue(mockNewUser);
      mockUsersService.getEffectivePermissions.mockResolvedValue(mockPermissions);
      mockUsersService.findById.mockResolvedValue(mockFullUser);
      mockJwtService.sign.mockReturnValue(mockToken);
      mockAuditService.logLogin.mockResolvedValue(undefined);

      const result = await service.register(email, password, '127.0.0.1', 'Mozilla/5.0');

      expect(usersService.create).toHaveBeenCalledWith({ email, password });
      expect(jwtService.sign).toHaveBeenCalled();
      expect(auditService.logLogin).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'Usuario registrado exitosamente',
        user: {
          id: userId,
          email,
          role: {
            id: mockFullUser.role._id,
            name: mockFullUser.role.name,
            isSuperAdmin: mockFullUser.role.isSuperAdmin,
          },
        },
        permissions: mockPermissions,
        access_token: mockToken,
      });
    });
  });
});

