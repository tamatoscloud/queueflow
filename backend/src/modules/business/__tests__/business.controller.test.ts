import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BusinessController } from '../business.controller';
import { BusinessService } from '../business.service';

describe('BusinessController', () => {
  let controller: BusinessController;
  let service: {
    create: ReturnType<typeof vi.fn>;
    list: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    service = {
      create: vi.fn(),
      list: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
    };
    controller = new BusinessController(service as unknown as BusinessService);
  });

  it('create delegates to service', async () => {
    const dto = {
      name: 'Cafe',
      slug: 'cafe',
      email: 'a@b.com',
    };
    service.create.mockResolvedValue({ id: '1', ...dto });
    await expect(controller.create(dto)).resolves.toMatchObject({ slug: 'cafe' });
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('get delegates to service with actor', async () => {
    service.get.mockResolvedValue({ id: 'biz-1' });
    const actor = { businessId: 'biz-1', isPlatformAdmin: false };
    await expect(controller.get('biz-1', actor as never)).resolves.toEqual({ id: 'biz-1' });
    expect(service.get).toHaveBeenCalledWith('biz-1', actor);
  });
});
