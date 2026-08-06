import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StaffInvitationStatus, UserStatus } from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import { BusinessContext } from '../../common/context/business-context';
import { PasswordService } from '../auth/password.service';
import { generateOpaqueToken } from '../auth/utils/token.util';
import { Permission } from '../auth/constants/roles-permissions';
import { StaffRepository } from './staff.repository';
import type {
  AcceptInvitationDto,
  AssignBranchesDto,
  ChangeStaffRoleDto,
  InviteStaffDto,
} from './dto/staff.dto';

@Injectable()
export class StaffService {
  constructor(
    private readonly staffRepo: StaffRepository,
    private readonly passwordService: PasswordService,
    private readonly audit: AuditService,
    private readonly businessContext: BusinessContext,
  ) {}

  private assertStaffPermission(): void {
    if (!this.businessContext.hasPermission(Permission.STAFF_INVITE)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }

  async invite(dto: InviteStaffDto, meta?: { ipAddress?: string; userAgent?: string }) {
    this.businessContext.resolveBusinessId(dto.businessId);
    this.assertStaffPermission();

    const role = await this.staffRepo.findRole(dto.roleId, dto.businessId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const existing = await this.staffRepo.findPendingInvitation(dto.businessId, dto.email);
    if (existing) {
      throw new ConflictException('A pending invitation already exists for this email');
    }

    const token = generateOpaqueToken(32);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invitation = await this.staffRepo.createInvitation({
      business: { connect: { id: dto.businessId } },
      role: { connect: { id: dto.roleId } },
      ...(dto.branchId ? { branch: { connect: { id: dto.branchId } } } : {}),
      email: dto.email.toLowerCase(),
      token,
      expiresAt,
      invitedByUser: { connect: { id: this.businessContext.userId } },
      createdBy: this.businessContext.userId,
    });

    await this.audit.log({
      businessId: dto.businessId,
      actorUserId: this.businessContext.userId,
      action: 'staff.invited',
      entityType: 'staff_invitation',
      entityId: invitation.id,
      afterData: { email: dto.email, roleId: dto.roleId },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    const payload: Record<string, unknown> = {
      id: invitation.id,
      email: invitation.email,
      expiresAt: invitation.expiresAt,
      status: invitation.status,
    };
    if (process.env.APP_ENV === 'development') {
      payload.inviteToken = token;
    }
    return payload;
  }

  async accept(dto: AcceptInvitationDto, meta?: { ipAddress?: string; userAgent?: string }) {
    const invitation = await this.staffRepo.findInvitationByToken(dto.token);
    if (!invitation || invitation.status !== StaffInvitationStatus.PENDING) {
      throw new BadRequestException('Invalid invitation');
    }
    if (invitation.expiresAt < new Date()) {
      await this.staffRepo.updateInvitation(invitation.id, {
        status: StaffInvitationStatus.EXPIRED,
      });
      throw new BadRequestException('Invitation has expired');
    }

    const passwordHash = await this.passwordService.hash(dto.password);
    const user = await this.staffRepo.createUser({
      business: { connect: { id: invitation.businessId } },
      email: invitation.email,
      fullName: dto.fullName,
      passwordHash,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      createdBy: invitation.invitedByUserId ?? undefined,
    });

    await this.staffRepo.assignRole(user.id, invitation.roleId, invitation.businessId, invitation.invitedByUserId ?? undefined);
    if (invitation.branchId) {
      await this.staffRepo.replaceUserBranches(user.id, [invitation.branchId], invitation.branchId);
    }

    await this.staffRepo.updateInvitation(invitation.id, {
      status: StaffInvitationStatus.ACCEPTED,
      acceptedAt: new Date(),
      acceptedByUser: { connect: { id: user.id } },
    });

    await this.audit.log({
      businessId: invitation.businessId,
      actorUserId: user.id,
      action: 'staff.invitation_accepted',
      entityType: 'staff_invitation',
      entityId: invitation.id,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return { userId: user.id, businessId: invitation.businessId };
  }

  async resend(invitationId: string, businessId: string, meta?: { ipAddress?: string; userAgent?: string }) {
    this.businessContext.resolveBusinessId(businessId);
    this.assertStaffPermission();

    const invitation = await this.staffRepo.findInvitationById(invitationId);
    if (!invitation || invitation.businessId !== businessId) {
      throw new NotFoundException('Invitation not found');
    }
    if (invitation.status !== StaffInvitationStatus.PENDING) {
      throw new BadRequestException('Only pending invitations can be resent');
    }

    const token = generateOpaqueToken(32);
    const updated = await this.staffRepo.updateInvitation(invitationId, {
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await this.audit.log({
      businessId,
      actorUserId: this.businessContext.userId,
      action: 'staff.invitation_resent',
      entityType: 'staff_invitation',
      entityId: invitationId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    const payload: Record<string, unknown> = { id: updated.id, expiresAt: updated.expiresAt };
    if (process.env.APP_ENV === 'development') {
      payload.inviteToken = token;
    }
    return payload;
  }

  async disable(userId: string, businessId: string, meta?: { ipAddress?: string; userAgent?: string }) {
    this.businessContext.resolveBusinessId(businessId);
    this.assertStaffPermission();

    const user = await this.staffRepo.findStaffUser(userId, businessId);
    if (!user) {
      throw new NotFoundException('Staff user not found');
    }

    await this.staffRepo.disableUser(userId);
    await this.audit.log({
      businessId,
      actorUserId: this.businessContext.userId,
      action: 'staff.disabled',
      entityType: 'user',
      entityId: userId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
    return { userId, status: UserStatus.DEACTIVATED };
  }

  async changeRole(
    userId: string,
    dto: ChangeStaffRoleDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ) {
    this.businessContext.resolveBusinessId(dto.businessId);
    if (!this.businessContext.hasPermission(Permission.STAFF_MANAGE_ROLES)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const user = await this.staffRepo.findStaffUser(userId, dto.businessId);
    if (!user) {
      throw new NotFoundException('Staff user not found');
    }
    const role = await this.staffRepo.findRole(dto.roleId, dto.businessId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    await this.staffRepo.replaceUserRoles(userId, dto.roleId, dto.businessId, this.businessContext.userId);
    await this.audit.log({
      businessId: dto.businessId,
      actorUserId: this.businessContext.userId,
      action: 'staff.role_changed',
      entityType: 'user',
      entityId: userId,
      afterData: { roleId: dto.roleId },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
    return { userId, roleId: dto.roleId };
  }

  async assignBranches(
    userId: string,
    dto: AssignBranchesDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ) {
    this.businessContext.resolveBusinessId(dto.businessId);
    if (!this.businessContext.hasPermission(Permission.STAFF_MANAGE_ROLES)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const user = await this.staffRepo.findStaffUser(userId, dto.businessId);
    if (!user) {
      throw new NotFoundException('Staff user not found');
    }

    await this.staffRepo.replaceUserBranches(
      userId,
      dto.branchIds,
      dto.primaryBranchId,
      this.businessContext.userId,
    );
    await this.audit.log({
      businessId: dto.businessId,
      actorUserId: this.businessContext.userId,
      action: 'staff.branches_assigned',
      entityType: 'user',
      entityId: userId,
      afterData: { branchIds: dto.branchIds },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
    return { userId, branchIds: dto.branchIds };
  }
}
