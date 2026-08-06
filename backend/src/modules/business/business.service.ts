import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paginatedMeta } from '../../common/dto/pagination.dto';
import type {
  CreateBusinessDto,
  ListBusinessQueryDto,
  UpdateBusinessDto,
} from './dto/business.dto';
import { BusinessRepository } from './business.repository';
import { toBusinessResponse } from './business.mapper';
import { assertValidBusinessSlug } from './validators/business.validators';

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

  async update(id: string, dto: UpdateBusinessDto) {
    await this.require(id);
    const row = await this.repository.update(id, dto);
    return toBusinessResponse({ ...row, settings: null });
  }

  async get(id: string) {
    const row = await this.repository.findById(id);
    if (!row) {
      throw new NotFoundException(`Business ${id} not found`);
    }
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

  private async require(id: string) {
    const row = await this.repository.findById(id);
    if (!row) {
      throw new NotFoundException(`Business ${id} not found`);
    }
    return row;
  }
}
