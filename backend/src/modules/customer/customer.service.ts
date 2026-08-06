import { Injectable, NotFoundException } from '@nestjs/common';
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
  constructor(private readonly repository: CustomerRepository) {}

  async get(id: string, query: GetCustomerQueryDto) {
    const customer = await this.repository.findByIdAndBusiness(
      id,
      query.businessId,
    );
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return toCustomerResponse(customer);
  }

  async getActiveStatus(id: string, query: GetCustomerQueryDto) {
    const customer = await this.repository.findByIdAndBusiness(
      id,
      query.businessId,
    );
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    const activeEntries = await this.repository.findActiveEntries(customer.id);
    return toActiveStatusResponse(customer, activeEntries);
  }

  async lookupActive(query: CustomerLookupQueryDto) {
    assertValidPhone(query.phone);
    const customer = await this.repository.findByBusinessAndPhone(
      query.businessId,
      query.phone,
    );
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    const activeEntries = await this.repository.findActiveEntries(customer.id);
    return toActiveStatusResponse(customer, activeEntries);
  }

  async history(customerId: string, query: CustomerHistoryQueryDto) {
    const customer = await this.repository.findByIdAndBusiness(
      customerId,
      query.businessId,
    );
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    const { entries, totalItems, page, pageSize } =
      await this.repository.findHistory(customerId, query);
    return {
      data: { customer: toCustomerResponse(customer), entries },
      meta: paginatedMeta(page, pageSize, totalItems),
    };
  }
}
