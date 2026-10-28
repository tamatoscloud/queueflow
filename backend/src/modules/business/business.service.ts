import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paginatedMeta } from '../../common/dto/pagination.dto';
import type {
  CreateBusinessDto,
  ListBusinessQueryDto,
  UpdateBusinessDto,
  UpsertGuestMenuDto,
} from './dto/business.dto';
import { BusinessRepository } from './business.repository';
import { toBusinessResponse } from './business.mapper';
import { assertValidBusinessSlug } from './validators/business.validators';
import { normalizeGuestMenu } from './guest-menu';

@Injectable()
export class BusinessService {
  constructor(private readonly repository: BusinessRepository) {}

  async create(dto: CreateBusinessDto) {
    assertValidBusinessSlug(dto.slug);
    try {
      const row = await this.repository.create(dto);
      return toBusinessResponse({ ...row, settings: null });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Business slug or email already exists');
      }
      throw e;
    }
  }

  async update(
    id: string,
    dto: UpdateBusinessDto,
    actor: { businessId: string | null; isPlatformAdmin: boolean },
  ) {
    const row = await this.require(id);
    this.assertActorCanAccess(actor, row.id);
    if (dto.status !== undefined && !actor.isPlatformAdmin) {
      // Status (active / suspended / cancelled) is a platform decision; an
      // owner must not be able to lift a suspension from their own profile.
      throw new ForbiddenException('Only platform admins can change business status');
    }
    const updated = await this.repository.update(id, dto);
    return toBusinessResponse({ ...updated, settings: null });
  }

  async get(id: string, actor: { businessId: string | null; isPlatformAdmin: boolean }) {
    const row = await this.repository.findById(id);
    if (!row) {
      throw new NotFoundException(`Business ${id} not found`);
    }
    this.assertActorCanAccess(actor, row.id);
    return toBusinessResponse(row);
  }

  async list(query: ListBusinessQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { rows, totalItems } = await this.repository.findMany(query);
    return {
      data: rows.map((r) => toBusinessResponse({ ...r, settings: null })),
      meta: paginatedMeta(page, pageSize, totalItems),
    };
  }

  async getGuestMenu(
    id: string,
    actor: { businessId: string | null; isPlatformAdmin: boolean },
  ) {
    const row = await this.require(id);
    this.assertActorCanAccess(actor, row.id);
    const menu = normalizeGuestMenu(row.settings?.guestMenu ?? null);
    return {
      businessId: row.id,
      businessName: row.name,
      menu,
      isDefault: row.settings?.guestMenu == null,
    };
  }

  async upsertGuestMenu(
    id: string,
    dto: UpsertGuestMenuDto,
    actor: { businessId: string | null; isPlatformAdmin: boolean },
  ) {
    const row = await this.require(id);
    this.assertActorCanAccess(actor, row.id);
    const menu = normalizeGuestMenu(dto);
    await this.repository.upsertGuestMenu(id, menu);
    return {
      businessId: row.id,
      businessName: row.name,
      menu,
      isDefault: false,
    };
  }

  private async require(id: string) {
    const row = await this.repository.findById(id);
    if (!row) {
      throw new NotFoundException(`Business ${id} not found`);
    }
    return row;
  }

  private assertActorCanAccess(
    actor: { businessId: string | null; isPlatformAdmin: boolean },
    businessId: string,
  ) {
    if (actor.isPlatformAdmin) return;
    if (actor.businessId !== businessId) {
      throw new ForbiddenException('TENANT_ACCESS_DENIED');
    }
  }
}
