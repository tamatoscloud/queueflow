import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { BusinessService } from '../business.service';

describe('BusinessService tenant isolation', () => {
  it('denies get across tenants', async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue({ id: 'biz-b', name: 'Other' }),
    };
    const service = new BusinessService(repository as never);
    await expect(
      service.get('biz-b', { businessId: 'biz-a', isPlatformAdmin: false }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.get('biz-b', { businessId: 'biz-a', isPlatformAdmin: false }),
    ).rejects.toMatchObject({ message: 'TENANT_ACCESS_DENIED' });
  });

  it('denies update across tenants', async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue({ id: 'biz-b', name: 'Other' }),
      update: vi.fn(),
    };
    const service = new BusinessService(repository as never);
    await expect(
      service.update(
        'biz-b',
        { name: 'Hacked' },
        { businessId: 'biz-a', isPlatformAdmin: false },
      ),
    ).rejects.toMatchObject({ message: 'TENANT_ACCESS_DENIED' });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('allows owner to get their own business', async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue({
        id: 'biz-a',
        name: 'Cafe',
        slug: 'cafe',
        email: 'a@b.com',
        phone: null,
        timezone: 'UTC',
        status: 'ACTIVE',
        logoUrl: null,
        businessType: 'RESTAURANT',
        settings: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };
    const service = new BusinessService(repository as never);
    const result = await service.get('biz-a', {
      businessId: 'biz-a',
      isPlatformAdmin: false,
    });
    expect(result.id).toBe('biz-a');
  });
});
