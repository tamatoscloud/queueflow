import { Injectable } from '@nestjs/common';
import { Prisma, StaffInvitationStatus, UserStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class StaffRepository {
  constructor(private readonly prisma: PrismaService) {}

  findRole(roleId: string, businessId: string) {
    return this.prisma.role.findFirst({
      where: {
        id: roleId,
        deletedAt: null,
        OR: [{ businessId }, { businessId: null, isSystem: true }],
      },
    });
  }

  createInvitation(data: Prisma.StaffInvitationCreateInput) {
    return this.prisma.staffInvitation.create({ data });
  }

  findInvitationByToken(token: string) {
    return this.prisma.staffInvitation.findUnique({
      where: { token },
      include: { role: true, business: true, branch: true },
    });
  }

  findInvitationById(id: string) {
    return this.prisma.staffInvitation.findUnique({
      where: { id },
      include: { role: true },
    });
  }

  updateInvitation(id: string, data: Prisma.StaffInvitationUpdateInput) {
    return this.prisma.staffInvitation.update({ where: { id }, data });
  }

  createUser(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({ data });
  }

  assignRole(userId: string, roleId: string, businessId: string, createdBy?: string) {
    return this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      create: { userId, roleId, businessId, createdBy },
      update: { businessId, createdBy },
    });
  }

  replaceUserRoles(userId: string, roleId: string, businessId: string, createdBy?: string) {
    return this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId } }),
      this.prisma.userRole.create({
        data: { userId, roleId, businessId, createdBy },
      }),
    ]);
  }

  replaceUserBranches(
    userId: string,
    branchIds: string[],
    primaryBranchId?: string,
    createdBy?: string,
  ) {
    return this.prisma.$transaction([
      this.prisma.userBranch.deleteMany({ where: { userId } }),
      ...branchIds.map((branchId) =>
        this.prisma.userBranch.create({
          data: {
            userId,
            branchId,
            isPrimary: branchId === primaryBranchId,
            createdBy,
          },
        }),
      ),
    ]);
  }

  findStaffUser(userId: string, businessId: string) {
    return this.prisma.user.findFirst({
      where: { id: userId, businessId, deletedAt: null },
    });
  }

  disableUser(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.DEACTIVATED },
    });
  }

  findPendingInvitation(businessId: string, email: string) {
    return this.prisma.staffInvitation.findFirst({
      where: {
        businessId,
        email: email.toLowerCase(),
        status: StaffInvitationStatus.PENDING,
      },
    });
  }
}
