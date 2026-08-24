import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantScopeService } from '../../common/tenant/tenant-scope.service';
import { paginatedMeta } from '../../common/dto/pagination.dto';
import type {
  CustomerHistoryQueryDto,
  CustomerListQueryDto,
  CustomerLookupQueryDto,
  GetCustomerQueryDto,
} from './dto/customer.dto';
import { CustomerRepository } from './customer.repository';
import {
  toActiveStatusResponse,
  toCustomerListItem,
  toCustomerResponse,
  toHistoryEntryResponse,
} from './customer.mapper';
import { assertValidPhone } from './validators/customer.validators';

@Injectable()
export class CustomerService {
  constructor(
    private readonly repository: CustomerRepository,
    private readonly tenantScope: TenantScopeService,
  ) {}

  async list(query: CustomerListQueryDto) {
    const businessId = this.tenantScope.resolveRequiredBusinessId(
      query.businessId,
    );
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 30;
    const activeOnly = query.activeOnly !== false;
    const { customers, totalItems } = await this.repository.listForBusiness({
      businessId,
      q: query.q,
      activeOnly,
      page,
      pageSize,
    });
    return {
      data: customers.map(toCustomerListItem),
      meta: paginatedMeta(page, pageSize, totalItems),
    };
  }

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
    const businessId = this.tenantScope.resolveRequiredBusinessId(
      query.businessId,
    );
    const raw = (query.q ?? query.phone ?? '').trim();
    if (!raw) {
      throw new BadRequestException('Provide q or phone to look up a guest');
    }

    let customer =
      query.phone && !query.q
        ? await (async () => {
            assertValidPhone(query.phone!);
            const exact = await this.repository.findByBusinessAndPhone(
              businessId,
              query.phone!.replace(/\s/g, ''),
            );
            if (exact) return exact;
            return this.repository.findByBusinessQuery(businessId, query.phone!);
          })()
        : await this.repository.findByBusinessQuery(businessId, raw);

    if (!customer && query.phone && query.q) {
      assertValidPhone(query.phone);
      customer = await this.repository.findByBusinessAndPhone(
        businessId,
        query.phone.replace(/\s/g, ''),
      );
    }

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
      data: entries.map(toHistoryEntryResponse),
      meta: paginatedMeta(page, pageSize, totalItems),
    };
  }
}
