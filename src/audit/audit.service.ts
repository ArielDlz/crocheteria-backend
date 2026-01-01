import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  PermissionAudit,
  PermissionAuditDocument,
  PermissionAuditAction,
} from './schemas/permission-audit.schema';
import {
  LoginAudit,
  LoginAuditDocument,
  LoginAuditAction,
} from './schemas/login-audit.schema';

interface AuditUser {
  userId: string | Types.ObjectId;
  email: string;
}

interface PermissionAuditDetails {
  permission?: string;
  previousRole?: string;
  newRole?: string;
  initialRole?: string;
  permissionsAfter?: string[];
}

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(PermissionAudit.name)
    private permissionAuditModel: Model<PermissionAuditDocument>,
    @InjectModel(LoginAudit.name)
    private loginAuditModel: Model<LoginAuditDocument>,
  ) {}

  // ==================== PERMISSION AUDIT ====================

  async logPermissionChange(
    performedBy: AuditUser,
    targetUser: AuditUser,
    action: PermissionAuditAction,
    details: PermissionAuditDetails,
    reason?: string,
    ipAddress?: string,
  ): Promise<PermissionAuditDocument> {
    const audit = new this.permissionAuditModel({
      performedBy: {
        userId: new Types.ObjectId(performedBy.userId.toString()),
        email: performedBy.email,
      },
      targetUser: {
        userId: new Types.ObjectId(targetUser.userId.toString()),
        email: targetUser.email,
      },
      action,
      details,
      reason,
      ipAddress,
    });

    return audit.save();
  }

  async getPermissionAuditByUser(
    userId: string,
    limit = 50,
  ): Promise<PermissionAuditDocument[]> {
    return this.permissionAuditModel
      .find({ 'targetUser.userId': new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getPermissionAuditByAdmin(
    adminId: string,
    limit = 50,
  ): Promise<PermissionAuditDocument[]> {
    return this.permissionAuditModel
      .find({ 'performedBy.userId': new Types.ObjectId(adminId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getAllPermissionAudits(
    limit = 50,
    from?: Date,
    to?: Date,
  ): Promise<PermissionAuditDocument[]> {
    const query: any = {};

    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = from;
      if (to) query.createdAt.$lte = to;
    }

    return this.permissionAuditModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async deletePermissionAudit(id: string): Promise<boolean> {
    const result = await this.permissionAuditModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async deletePermissionAuditsBefore(date: Date): Promise<number> {
    const result = await this.permissionAuditModel
      .deleteMany({
        createdAt: { $lt: date },
      })
      .exec();
    return result.deletedCount;
  }

  // ==================== LOGIN AUDIT ====================

  async logLogin(
    email: string,
    action: LoginAuditAction,
    success: boolean,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    message?: string,
  ): Promise<LoginAuditDocument> {
    const audit = new this.loginAuditModel({
      userId: userId ? new Types.ObjectId(userId) : undefined,
      email,
      action,
      success,
      ipAddress,
      userAgent,
      message,
    });

    return audit.save();
  }

  async getLoginAuditByUser(
    userId: string,
    limit = 50,
  ): Promise<LoginAuditDocument[]> {
    return this.loginAuditModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getLoginAuditByEmail(
    email: string,
    limit = 50,
  ): Promise<LoginAuditDocument[]> {
    return this.loginAuditModel
      .find({ email })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getAllLoginAudits(
    limit = 50,
    from?: Date,
    to?: Date,
  ): Promise<LoginAuditDocument[]> {
    const query: any = {};

    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = from;
      if (to) query.createdAt.$lte = to;
    }

    return this.loginAuditModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getFailedLoginAttempts(email: string, since: Date): Promise<number> {
    return this.loginAuditModel
      .countDocuments({
        email,
        action: LoginAuditAction.LOGIN_FAILED,
        createdAt: { $gte: since },
      })
      .exec();
  }

  async deleteLoginAudit(id: string): Promise<boolean> {
    const result = await this.loginAuditModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async deleteLoginAuditsBefore(date: Date): Promise<number> {
    const result = await this.loginAuditModel
      .deleteMany({
        createdAt: { $lt: date },
      })
      .exec();
    return result.deletedCount;
  }
}
