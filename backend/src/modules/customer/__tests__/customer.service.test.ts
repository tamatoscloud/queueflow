import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
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
    service = new CustomerService(repository as unknown as CustomerRepository);
  });

  it('get returns customer when found', async () => {
    repository.findByIdAndBusiness.mockResolvedValue(customer);
    const result = await service.get('cust-1', { businessId: 'biz-1' });
    expect(result.id).toBe('cust-1');
  });

  it('get throws when customer missing', async () => {
    repository.findByIdAndBusiness.mockResolvedValue(null);
    await expect(
      service.get('cust-1', { businessId: 'biz-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('getActiveStatus includes active entries', async () => {
    repository.findByIdAndBusiness.mockResolvedValue(customer);
    repository.findActiveEntries.mockResolvedValue([{ id: 'entry-1' }]);
    const result = await service.getActiveStatus('cust-1', {
      businessId: 'biz-1',
    });
    expect(result.hasActiveEntry).toBe(true);
    expect(result.activeEntries).toHaveLength(1);
  });
});
