import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantScopeService } from '../../common/tenant/tenant-scope.service';
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
  constructor(
    private readonly repository: BranchRepository,
    private readonly tenantScope: TenantScopeService,
  ) {}

  async create(dto: CreateBranchDto) {
    assertValidBranchCode(dto.code);
    const businessId = this.tenantScope.resolveRequiredBusinessId(dto.businessId);
    const business = await this.repository.findBusiness(businessId);
    if (!business) {
      throw new NotFoundException(`Business ${businessId} not found`);
    }
    try {
      return await this.repository.create({ ...dto, businessId });
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
    await this.tenantScope.requireBranch(id);
    return this.repository.update(id, dto);
  }

  async get(id: string) {
    return this.tenantScope.requireBranch(id);
  }

  async remove(id: string) {
    await this.tenantScope.requireBranch(id);
    return this.repository.softDelete(id);
  }

  async list(query: ListBranchQueryDto) {
    const businessId = this.tenantScope.resolveOptionalListBusinessId(
      query.businessId,
    );
    const { rows, totalItems, page, pageSize } =
      await this.repository.findMany({ ...query, businessId });
    return { data: rows, meta: paginatedMeta(page, pageSize, totalItems) };
  }
}
