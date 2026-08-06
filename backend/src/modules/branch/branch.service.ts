import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paginatedMeta } from '../../common/dto/pagination.dto';
import type {
  CreateBranchDto,
  ListBranchQueryDto,
  UpdateBranchDto,
} from './dto/branch.dto';
import { BranchRepository } from './branch.repository';
import { assertValidBranchCode } from './validators/branch.validators';

@Injectable()
export class BranchService {
  constructor(private readonly repository: BranchRepository) {}

  async create(dto: CreateBranchDto) {
    assertValidBranchCode(dto.code);
    const business = await this.repository.findBusiness(dto.businessId);
    if (!business) {
      throw new NotFoundException(`Business ${dto.businessId} not found`);
    }
    try {
      return await this.repository.create(dto);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Branch code already exists for business');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateBranchDto) {
    await this.require(id);
    return this.repository.update(id, dto);
  }

  async get(id: string) {
    return this.require(id);
  }

  async remove(id: string) {
    await this.require(id);
    return this.repository.softDelete(id);
  }

  async list(query: ListBranchQueryDto) {
    const { rows, totalItems, page, pageSize } =
      await this.repository.findMany(query);
    return { data: rows, meta: paginatedMeta(page, pageSize, totalItems) };
  }

  private async require(id: string) {
    const row = await this.repository.findById(id);
    if (!row) {
      throw new NotFoundException(`Branch ${id} not found`);
    }
    return row;
  }
}
