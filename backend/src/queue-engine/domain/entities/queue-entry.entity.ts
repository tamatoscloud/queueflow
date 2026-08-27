import { randomUUID } from 'crypto';
import {
  NotificationPreference,
  QueueEntrySource,
  QueueEntryStatus,
} from '../enums';
import { EntryLifecyclePolicy } from '../policies/entry-lifecycle-policy';
import { ValidationError } from '../exceptions/domain-errors';

export interface QueueEntryProps {
  id: string;
  businessId: string;
  branchId: string;
  queueId: string;
  customerId: string;
  queueTokenId: string;
  displayCode: string;
  tokenNumber: number;
  status: QueueEntryStatus;
  source: QueueEntrySource;
  partySize: number;
  notes: string | null;
  /** Mode-specific JSON from Prisma — read path only (not mutated by domain). */
  metadata?: Record<string, unknown>;
  notificationPreference: NotificationPreference;
  priority: number;
  isVip: boolean;
  sortOrder: number;
  lastKnownPosition: number | null;
  estimatedWaitMinutes: number | null;
  actualWaitMinutes: number | null;
  joinedAt: Date;
  calledAt: Date | null;
  holdingStartedAt: Date | null;
  skippedAt: Date | null;
  recalledAt: Date | null;
  servedAt: Date | null;
  cancelledAt: Date | null;
  noShowAt: Date | null;
  calledByUserId: string | null;
  servedByUserId: string | null;
  customerPhone: string;
  customerName: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateQueueEntryInput {
  businessId: string;
  branchId: string;
  queueId: string;
  customerId: string;
  queueTokenId: string;
  displayCode: string;
  tokenNumber: number;
  source: QueueEntrySource;
  partySize: number;
  notes?: string | null;
  notificationPreference: NotificationPreference;
  priority: number;
  isVip: boolean;
  sortOrder: number;
  customerPhone: string;
  customerName: string;
  estimatedWaitMinutes?: number | null;
  lastKnownPosition?: number | null;
}

export class QueueEntry {
  private props: QueueEntryProps;

  private constructor(props: QueueEntryProps) {
    this.props = props;
  }

  static create(input: CreateQueueEntryInput, now: Date): QueueEntry {
    if (input.partySize < 1) {
      throw new ValidationError('partySize must be >= 1');
    }
    return new QueueEntry({
      id: randomUUID(),
      businessId: input.businessId,
      branchId: input.branchId,
      queueId: input.queueId,
      customerId: input.customerId,
      queueTokenId: input.queueTokenId,
      displayCode: input.displayCode,
      tokenNumber: input.tokenNumber,
      status: QueueEntryStatus.WAITING,
      source: input.source,
      partySize: input.partySize,
      notes: input.notes ?? null,
      metadata: {},
      notificationPreference: input.notificationPreference,
      priority: input.priority,
      isVip: input.isVip,
      sortOrder: input.sortOrder,
      lastKnownPosition: input.lastKnownPosition ?? null,
      estimatedWaitMinutes: input.estimatedWaitMinutes ?? null,
      actualWaitMinutes: null,
      joinedAt: now,
      calledAt: null,
      holdingStartedAt: null,
      skippedAt: null,
      recalledAt: null,
      servedAt: null,
      cancelledAt: null,
      noShowAt: null,
      calledByUserId: null,
      servedByUserId: null,
      customerPhone: input.customerPhone,
      customerName: input.customerName,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  static rehydrate(props: QueueEntryProps): QueueEntry {
    return new QueueEntry({ ...props, metadata: props.metadata ?? {} });
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
  get queueId(): string {
    return this.props.queueId;
  }
  get customerId(): string {
    return this.props.customerId;
  }
  get queueTokenId(): string {
    return this.props.queueTokenId;
  }
  get displayCode(): string {
    return this.props.displayCode;
  }
  get tokenNumber(): number {
    return this.props.tokenNumber;
  }
  get status(): QueueEntryStatus {
    return this.props.status;
  }
  get source(): QueueEntrySource {
    return this.props.source;
  }
  get partySize(): number {
    return this.props.partySize;
  }
  get notes(): string | null {
    return this.props.notes;
  }
  get metadata(): Record<string, unknown> {
    return this.props.metadata ?? {};
  }
  get notificationPreference(): NotificationPreference {
    return this.props.notificationPreference;
  }
  get priority(): number {
    return this.props.priority;
  }
  get isVip(): boolean {
    return this.props.isVip;
  }
  get sortOrder(): number {
    return this.props.sortOrder;
  }
  get lastKnownPosition(): number | null {
    return this.props.lastKnownPosition;
  }
  get estimatedWaitMinutes(): number | null {
    return this.props.estimatedWaitMinutes;
  }
  get actualWaitMinutes(): number | null {
    return this.props.actualWaitMinutes;
  }
  get joinedAt(): Date {
    return this.props.joinedAt;
  }
  get calledAt(): Date | null {
    return this.props.calledAt;
  }
  get holdingStartedAt(): Date | null {
    return this.props.holdingStartedAt;
  }
  get skippedAt(): Date | null {
    return this.props.skippedAt;
  }
  get recalledAt(): Date | null {
    return this.props.recalledAt;
  }
  get servedAt(): Date | null {
    return this.props.servedAt;
  }
  get cancelledAt(): Date | null {
    return this.props.cancelledAt;
  }
  get noShowAt(): Date | null {
    return this.props.noShowAt;
  }
  get calledByUserId(): string | null {
    return this.props.calledByUserId;
  }
  get servedByUserId(): string | null {
    return this.props.servedByUserId;
  }
  get customerPhone(): string {
    return this.props.customerPhone;
  }
  get customerName(): string {
    return this.props.customerName;
  }

  private transition(to: QueueEntryStatus, now: Date, patch: Partial<QueueEntryProps>): void {
    EntryLifecyclePolicy.assertCanTransition(this.props.status, to);
    this.props = {
      ...this.props,
      ...patch,
      status: to,
      updatedAt: now,
    };
  }

  call(staffUserId: string | null, now: Date): void {
    this.transition(QueueEntryStatus.CALLED, now, {
      calledAt: now,
      calledByUserId: staffUserId,
    });
  }

  /** Re-notify a CALLED customer after recall timeout. Stays CALLED. */
  recall(now: Date): void {
    if (this.props.status !== QueueEntryStatus.CALLED) {
      EntryLifecyclePolicy.assertCanTransition(
        this.props.status,
        QueueEntryStatus.CALLED,
      );
    }
    this.props = {
      ...this.props,
      recalledAt: now,
      updatedAt: now,
    };
  }

  hold(now: Date): void {
    this.transition(QueueEntryStatus.HOLDING, now, {
      holdingStartedAt: now,
    });
  }

  resumeFromHold(now: Date): void {
    this.transition(QueueEntryStatus.WAITING, now, {
      holdingStartedAt: null,
    });
  }

  /**
   * Skip: move through SKIPPED then immediately back to WAITING at a new
   * sortOrder (end of line). Transient SKIPPED is recorded via skippedAt.
   */
  skipToEnd(newSortOrder: number, now: Date): void {
    EntryLifecyclePolicy.assertCanTransition(
      this.props.status,
      QueueEntryStatus.SKIPPED,
    );
    this.props = {
      ...this.props,
      status: QueueEntryStatus.SKIPPED,
      skippedAt: now,
      updatedAt: now,
    };
    this.transition(QueueEntryStatus.WAITING, now, {
      sortOrder: newSortOrder,
      calledAt: null,
      calledByUserId: null,
    });
  }

  complete(staffUserId: string | null, now: Date): void {
    const waitMinutes = Math.max(
      0,
      Math.round((now.getTime() - this.props.joinedAt.getTime()) / 60_000),
    );
    this.transition(QueueEntryStatus.COMPLETED, now, {
      servedAt: now,
      servedByUserId: staffUserId,
      actualWaitMinutes: waitMinutes,
    });
  }

  cancel(now: Date): void {
    this.transition(QueueEntryStatus.CANCELLED, now, {
      cancelledAt: now,
    });
  }

  markNoShow(now: Date): void {
    this.transition(QueueEntryStatus.NO_SHOW, now, {
      noShowAt: now,
    });
  }

  moveTo(sortOrder: number, now: Date): void {
    if (EntryLifecyclePolicy.isTerminal(this.props.status)) {
      throw new ValidationError('Cannot move a terminal queue entry');
    }
    this.props = {
      ...this.props,
      sortOrder,
      updatedAt: now,
    };
  }

  setPriority(priority: number, isVip: boolean, now: Date): void {
    if (EntryLifecyclePolicy.isTerminal(this.props.status)) {
      throw new ValidationError('Cannot prioritize a terminal queue entry');
    }
    if (!Number.isInteger(priority) || priority < 0) {
      throw new ValidationError('priority must be a non-negative integer');
    }
    this.props = {
      ...this.props,
      priority,
      isVip,
      updatedAt: now,
    };
  }

  updateEstimate(position: number, estimatedWaitMinutes: number, now: Date): void {
    this.props = {
      ...this.props,
      lastKnownPosition: position,
      estimatedWaitMinutes,
      updatedAt: now,
    };
  }

  /** Used by transfer: re-bind to a different queue with a fresh token. */
  rebindToQueue(opts: {
    queueId: string;
    branchId: string;
    queueTokenId: string;
    displayCode: string;
    tokenNumber: number;
    sortOrder: number;
    now: Date;
  }): void {
    if (EntryLifecyclePolicy.isTerminal(this.props.status)) {
      throw new ValidationError('Cannot transfer a terminal queue entry');
    }
    this.props = {
      ...this.props,
      queueId: opts.queueId,
      branchId: opts.branchId,
      queueTokenId: opts.queueTokenId,
      displayCode: opts.displayCode,
      tokenNumber: opts.tokenNumber,
      sortOrder: opts.sortOrder,
      status: QueueEntryStatus.WAITING,
      calledAt: null,
      calledByUserId: null,
      holdingStartedAt: null,
      updatedAt: opts.now,
    };
  }

  toProps(): QueueEntryProps {
    return { ...this.props };
  }
}
