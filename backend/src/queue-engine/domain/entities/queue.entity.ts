import { randomUUID } from 'crypto';
import { QueueStatus } from '../enums';
import type { DomainEvent } from '../events/queue-events';
import { QueueEvents } from '../events/queue-events';
import { QueueStatePolicy } from '../policies/queue-policies';
import { ValidationError } from '../exceptions/domain-errors';

export interface QueueProps {
  id: string;
  businessId: string;
  branchId: string;
  name: string;
  description: string | null;
  status: QueueStatus;
  prefix: string;
  maxCapacity: number | null;
  averageServiceTimeMinutes: number;
  isAcceptingEntries: boolean;
  autoCallNext: boolean;
  priorityEnabled: boolean;
  recallTimeoutSeconds: number;
  noShowTimeoutSeconds: number;
  notifyBeforeTurns: number;
  lastTokenNumber: number;
  lastTokenResetAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateQueueInput {
  businessId: string;
  branchId: string;
  name: string;
  description?: string | null;
  prefix?: string;
  maxCapacity?: number | null;
  averageServiceTimeMinutes?: number;
  priorityEnabled?: boolean;
  recallTimeoutSeconds?: number;
  noShowTimeoutSeconds?: number;
  notifyBeforeTurns?: number;
  autoCallNext?: boolean;
  createdBy?: string | null;
}

export class Queue {
  private readonly _events: DomainEvent[] = [];
  private props: QueueProps;

  private constructor(props: QueueProps) {
    this.props = props;
  }

  static create(input: CreateQueueInput, now: Date): Queue {
    const name = input.name.trim();
    if (!name) {
      throw new ValidationError('Queue name is required');
    }
    const prefix = (input.prefix ?? 'A').trim().toUpperCase();
    if (!prefix || prefix.length > 4) {
      throw new ValidationError('Queue prefix must be 1–4 characters');
    }
    const avg = input.averageServiceTimeMinutes ?? 10;
    if (!Number.isInteger(avg) || avg < 1) {
      throw new ValidationError('averageServiceTimeMinutes must be >= 1');
    }

    const id = randomUUID();
    const queue = new Queue({
      id,
      businessId: input.businessId,
      branchId: input.branchId,
      name,
      description: input.description ?? null,
      status: QueueStatus.ACTIVE,
      prefix,
      maxCapacity: input.maxCapacity ?? null,
      averageServiceTimeMinutes: avg,
      isAcceptingEntries: true,
      autoCallNext: input.autoCallNext ?? false,
      priorityEnabled: input.priorityEnabled ?? false,
      recallTimeoutSeconds: input.recallTimeoutSeconds ?? 120,
      noShowTimeoutSeconds: input.noShowTimeoutSeconds ?? 300,
      notifyBeforeTurns: input.notifyBeforeTurns ?? 3,
      lastTokenNumber: 0,
      lastTokenResetAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    queue._events.push(
      QueueEvents.created(
        id,
        input.businessId,
        {
          name,
          branchId: input.branchId,
          prefix,
        },
        now,
      ),
    );
    return queue;
  }

  static rehydrate(props: QueueProps): Queue {
    return new Queue({ ...props });
  }

  get id(): string {
    return this.props.id;
  }
  get businessId(): string {
    return this.props.businessId;
  }
  get branchId(): string {
    return this.props.branchId;
  }
  get name(): string {
    return this.props.name;
  }
  get description(): string | null {
    return this.props.description;
  }
  get status(): QueueStatus {
    return this.props.status;
  }
  get prefix(): string {
    return this.props.prefix;
  }
  get maxCapacity(): number | null {
    return this.props.maxCapacity;
  }
  get averageServiceTimeMinutes(): number {
    return this.props.averageServiceTimeMinutes;
  }
  get isAcceptingEntries(): boolean {
    return this.props.isAcceptingEntries;
  }
  get autoCallNext(): boolean {
    return this.props.autoCallNext;
  }
  get priorityEnabled(): boolean {
    return this.props.priorityEnabled;
  }
  get recallTimeoutSeconds(): number {
    return this.props.recallTimeoutSeconds;
  }
  get noShowTimeoutSeconds(): number {
    return this.props.noShowTimeoutSeconds;
  }
  get notifyBeforeTurns(): number {
    return this.props.notifyBeforeTurns;
  }
  get lastTokenNumber(): number {
    return this.props.lastTokenNumber;
  }
  get lastTokenResetAt(): Date | null {
    return this.props.lastTokenResetAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }
  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }

  pullDomainEvents(): DomainEvent[] {
    const events = [...this._events];
    this._events.length = 0;
    return events;
  }

  open(now: Date): void {
    QueueStatePolicy.assertCanOpen(this);
    this.props = {
      ...this.props,
      status: QueueStatus.ACTIVE,
      isAcceptingEntries: true,
      updatedAt: now,
    };
    this._events.push(QueueEvents.opened(this.id, this.businessId, now));
  }

  pause(now: Date): void {
    QueueStatePolicy.assertCanPause(this);
    this.props = {
      ...this.props,
      status: QueueStatus.PAUSED,
      isAcceptingEntries: false,
      updatedAt: now,
    };
    this._events.push(QueueEvents.paused(this.id, this.businessId, now));
  }

  resume(now: Date): void {
    QueueStatePolicy.assertCanResume(this);
    this.props = {
      ...this.props,
      status: QueueStatus.ACTIVE,
      isAcceptingEntries: true,
      updatedAt: now,
    };
    this._events.push(QueueEvents.resumed(this.id, this.businessId, now));
  }

  close(now: Date): void {
    QueueStatePolicy.assertCanClose(this);
    this.props = {
      ...this.props,
      status: QueueStatus.CLOSED,
      isAcceptingEntries: false,
      updatedAt: now,
    };
    this._events.push(QueueEvents.closed(this.id, this.businessId, now));
  }

  /**
   * Atomic-style token bump for join. In-memory / single-threaded engines
   * call this; Prisma adapters should use UPDATE … RETURNING instead and
   * sync the returned number back onto the aggregate.
   */
  issueNextTokenNumber(now: Date): number {
    const next = this.props.lastTokenNumber + 1;
    this.props = {
      ...this.props,
      lastTokenNumber: next,
      updatedAt: now,
    };
    return next;
  }

  updateAverageServiceTime(minutes: number, now: Date): void {
    if (!Number.isInteger(minutes) || minutes < 1) {
      throw new ValidationError('averageServiceTimeMinutes must be >= 1');
    }
    this.props = {
      ...this.props,
      averageServiceTimeMinutes: minutes,
      updatedAt: now,
    };
    this._events.push(
      QueueEvents.updated(
        this.id,
        this.businessId,
        { averageServiceTimeMinutes: minutes },
        now,
      ),
    );
  }

  /**
   * Exponential-ish rolling average after a completed visit.
   * weight=0.2 means new sample moves average by 20%.
   */
  recordServiceSample(actualWaitMinutes: number, now: Date, weight = 0.2): void {
    if (actualWaitMinutes < 0) {
      return;
    }
    const prev = this.props.averageServiceTimeMinutes;
    const next = Math.max(
      1,
      Math.round(prev * (1 - weight) + actualWaitMinutes * weight),
    );
    this.updateAverageServiceTime(next, now);
  }

  toProps(): QueueProps {
    return { ...this.props };
  }
}
