import { randomUUID } from 'crypto';
import { PhoneNumber } from '../value-objects';
import { ValidationError } from '../exceptions/domain-errors';

export interface CustomerProps {
  id: string;
  businessId: string;
  fullName: string;
  phone: string;
  email: string | null;
  notes: string | null;
  totalVisits: number;
  lastVisitAt: Date | null;
  isBlacklisted: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class Customer {
  private props: CustomerProps;

  private constructor(props: CustomerProps) {
    this.props = props;
  }

  static create(
    input: {
      businessId: string;
      fullName: string;
      phone: string;
      email?: string | null;
      notes?: string | null;
    },
    now: Date,
  ): Customer {
    const name = input.fullName.trim();
    if (!name) {
      throw new ValidationError('Customer name is required');
    }
    const phone = PhoneNumber.create(input.phone);
    return new Customer({
      id: randomUUID(),
      businessId: input.businessId,
      fullName: name,
      phone: phone.value,
      email: input.email ?? null,
      notes: input.notes ?? null,
      totalVisits: 0,
      lastVisitAt: null,
      isBlacklisted: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  static rehydrate(props: CustomerProps): Customer {
    return new Customer({ ...props });
  }

  get id(): string {
    return this.props.id;
  }
  get businessId(): string {
    return this.props.businessId;
  }
  get fullName(): string {
    return this.props.fullName;
  }
  get phone(): string {
    return this.props.phone;
  }
  get isBlacklisted(): boolean {
    return this.props.isBlacklisted;
  }
  get totalVisits(): number {
    return this.props.totalVisits;
  }

  recordVisit(now: Date): void {
    this.props = {
      ...this.props,
      totalVisits: this.props.totalVisits + 1,
      lastVisitAt: now,
      updatedAt: now,
    };
  }

  toProps(): CustomerProps {
    return { ...this.props };
  }
}
