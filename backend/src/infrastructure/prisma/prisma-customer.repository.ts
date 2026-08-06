import { Injectable } from '@nestjs/common';
import type {
  Customer,
  CustomerRepository,
} from '../../queue-engine';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  toDomainCustomer,
  toPrismaCustomerData,
} from './mappers/queue-engine.mapper';

@Injectable()
export class PrismaCustomerRepository implements CustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByBusinessAndPhone(
    businessId: string,
    phone: string,
  ): Promise<Customer | null> {
    const row = await this.prisma.customer.findFirst({
      where: { businessId, phone, deletedAt: null },
    });
    return row ? toDomainCustomer(row) : null;
  }

  async save(customer: Customer): Promise<void> {
    const data = toPrismaCustomerData(customer);
    await this.prisma.customer.upsert({
      where: { id: data.id },
      create: data,
      update: {
        fullName: data.fullName,
        phone: data.phone,
        email: data.email,
        notes: data.notes,
        totalVisits: data.totalVisits,
        lastVisitAt: data.lastVisitAt,
        isBlacklisted: data.isBlacklisted,
        updatedAt: data.updatedAt,
        deletedAt: data.deletedAt,
      },
    });
  }
}
