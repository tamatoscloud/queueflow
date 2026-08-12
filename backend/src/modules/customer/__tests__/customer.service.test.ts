import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CustomerService } from '../customer.service';
import { CustomerRepository } from '../customer.repository';

describe('CustomerService', () => {
  let service: CustomerService;
  let repository: {
    findByIdAndBusiness: ReturnType<typeof vi.fn>;
    findByBusinessAndPhone: ReturnType<typeof vi.fn>;
    findActiveEntries: ReturnType<typeof vi.fn>;
    findHistory: ReturnType<typeof vi.fn>;
  };
  let tenantScope: {
    requireCustomer: ReturnType<typeof vi.fn>;
    resolveRequiredBusinessId: ReturnType<typeof vi.fn>;
  };

  const customer = {
    id: 'cust-1',
    businessId: 'biz-1',
    fullName: 'Ali',
    phone: '+923001111111',
    email: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    repository = {
      findByIdAndBusiness: vi.fn(),
      findByBusinessAndPhone: vi.fn(),
      findActiveEntries: vi.fn(),
      findHistory: vi.fn(),
    };
    tenantScope = {
      requireCustomer: vi.fn(),
      resolveRequiredBusinessId: vi.fn((id?: string) => id ?? 'biz-1'),
    };
    service = new CustomerService(
      repository as unknown as CustomerRepository,
      tenantScope as never,
    );
  });

  it('get returns customer when found', async () => {
    tenantScope.requireCustomer.mockResolvedValue(customer);
    const result = await service.get('cust-1', { businessId: 'biz-1' });
    expect(result.id).toBe('cust-1');
    expect(tenantScope.requireCustomer).toHaveBeenCalledWith('cust-1');
  });

  it('get propagates tenant denial as 403', async () => {
    tenantScope.requireCustomer.mockRejectedValue(
      new ForbiddenException('TENANT_ACCESS_DENIED'),
    );
    await expect(
      service.get('cust-1', { businessId: 'biz-1' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('get throws when customer missing', async () => {
    tenantScope.requireCustomer.mockRejectedValue(
      new NotFoundException('Customer not found'),
    );
    await expect(
      service.get('cust-1', { businessId: 'biz-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('getActiveStatus includes active entries', async () => {
    tenantScope.requireCustomer.mockResolvedValue(customer);
    repository.findActiveEntries.mockResolvedValue([{ id: 'entry-1' }]);
    const result = await service.getActiveStatus('cust-1', {
      businessId: 'biz-1',
    });
    expect(result.hasActiveEntry).toBe(true);
    expect(result.activeEntries).toHaveLength(1);
  });
});
