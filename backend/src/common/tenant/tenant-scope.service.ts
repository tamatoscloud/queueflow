import { Injectable, NotFoundException, Scope } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessContext } from '../context/business-context';

/**
 * Resolves tenant-scoped resources and enforces business ownership using
 * the authenticated user's JWT context (never client-supplied businessId alone).
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantScopeService {
  constructor(
    private readonly businessContext: BusinessContext,
    private readonly prisma: PrismaService,
  ) {}

  /** Tenant users always get their businessId; platform admins may omit to list all. */
  resolveOptionalListBusinessId(requestedBusinessId?: string): string | undefined {
    if (requestedBusinessId) {
      return this.businessContext.resolveBusinessId(requestedBusinessId);
    }
    if (this.businessContext.isPlatformAdmin()) {
      return undefined;
    }
    return this.businessContext.resolveBusinessId();
  }

  /** Resolves businessId from JWT, validating an optional client hint for platform admins. */
  resolveRequiredBusinessId(requestedBusinessId?: string): string {
    if (requestedBusinessId) {
      return this.businessContext.resolveBusinessId(requestedBusinessId);
    }
    return this.businessContext.resolveBusinessId();
  }

  async requireQueue(queueId: string) {
    const row = await this.prisma.queue.findFirst({
      where: { id: queueId, deletedAt: null },
    });
    if (!row) {
      throw new NotFoundException(`Queue ${queueId} not found`);
    }
    this.businessContext.assertTenantAccess(row.businessId);
    return row;
  }

  async requireQueueEntry(entryId: string) {
    const row = await this.prisma.queueEntry.findFirst({
      where: { id: entryId, deletedAt: null },
    });
    if (!row) {
      throw new NotFoundException(`Queue entry ${entryId} not found`);
    }
    this.businessContext.assertTenantAccess(row.businessId);
    return row;
  }

  async requireBranch(branchId: string) {
    const row = await this.prisma.branch.findFirst({
      where: { id: branchId, deletedAt: null },
    });
    if (!row) {
      throw new NotFoundException(`Branch ${branchId} not found`);
    }
    this.businessContext.assertTenantAccess(row.businessId);
    return row;
  }

  async requireCustomer(customerId: string) {
    const row = await this.prisma.customer.findFirst({
      where: { id: customerId, deletedAt: null },
    });
    if (!row) {
      throw new NotFoundException('Customer not found');
    }
    this.businessContext.assertTenantAccess(row.businessId);
    return row;
  }

  async requireFeedback(feedbackId: string) {
    const row = await this.prisma.feedback.findFirst({
      where: { id: feedbackId, deletedAt: null },
    });
    if (!row) {
      throw new NotFoundException('Feedback not found');
    }
    this.businessContext.assertTenantAccess(row.businessId);
    return row;
  }
}
