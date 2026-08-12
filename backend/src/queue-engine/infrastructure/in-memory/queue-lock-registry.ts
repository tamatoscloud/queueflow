/**
 * Per-queue async mutex for in-memory concurrency simulation.
 * Locks are acquired in sorted queue-id order to avoid deadlocks.
 */
export class QueueLockRegistry {
  private readonly tails = new Map<string, Promise<void>>();

  async runExclusive<T>(queueIds: readonly string[], fn: () => Promise<T>): Promise<T> {
    const sorted = [...new Set(queueIds)].sort();
    if (sorted.length === 0) {
      return fn();
    }
    const [head, ...rest] = sorted;
    return this.runExclusiveOne(head!, () => this.runExclusive(rest, fn));
  }

  private async runExclusiveOne<T>(queueId: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(queueId) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.tails.set(
      queueId,
      previous.then(() => gate),
    );
    await previous;
    try {
      return await fn();
    } finally {
      release();
    }
  }
}
