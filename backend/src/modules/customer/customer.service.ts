import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantScopeService } from '../../common/tenant/tenant-scope.service';
import { paginatedMeta } from '../../common/dto/pagination.dto';
import type {
  CustomerHistoryQueryDto,
  CustomerLookupQueryDto,
  GetCustomerQueryDto,
} from './dto/customer.dto';
import { CustomerRepository } from './customer.repository';
import {
  toActiveStatusResponse,
  toCustomerResponse,
} from './customer.mapper';
import { assertValidPhone } from './validators/customer.validators';

@Injectable()
export class CustomerService {
  constructor(
    private readonly repository: CustomerRepository,
    private readonly tenantScope: TenantScopeService,
  ) {}

  async get(id: string, _query: GetCustomerQueryDto) {
    const customer = await this.tenantScope.requireCustomer(id);
    return toCustomerResponse(customer);
  }

  async getActiveStatus(id: string, _query: GetCustomerQueryDto) {
    const customer = await this.tenantScope.requireCustomer(id);
    const activeEntries = await this.repository.findActiveEntries(customer.id);
    return toActiveStatusResponse(customer, activeEntries);
  }

  async lookupActive(query: CustomerLookupQueryDto) {
    assertValidPhone(query.phone);
    const businessId = this.tenantScope.resolveRequiredBusinessId(
      query.businessId,
    );
    const customer = await this.repository.findByBusinessAndPhone(
      businessId,
      query.phone,
    );
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    const activeEntries = await this.repository.findActiveEntries(customer.id);
    return toActiveStatusResponse(customer, activeEntries);
  }

  async history(customerId: string, query: CustomerHistoryQueryDto) {
    const customer = await this.tenantScope.requireCustomer(customerId);
    const { entries, totalItems, page, pageSize } =
      await this.repository.findHistory(customer.id, query);
    return {
      data: { customer: toCustomerResponse(customer), entries },
      meta: paginatedMeta(page, pageSize, totalItems),
    };
  }
}
