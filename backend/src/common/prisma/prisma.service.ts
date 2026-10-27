import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    const maxAttempts = Number(process.env.PRISMA_CONNECT_RETRIES ?? 5);
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.$connect();
        this.logger.log('Prisma connected');
        void this.logRoundTrip();
        return;
      } catch (err) {
        lastError = err;
        const delayMs = Math.min(1000 * 2 ** (attempt - 1), 8000);
        this.logger.warn(
          `Prisma connect attempt ${attempt}/${maxAttempts} failed; retrying in ${delayMs}ms`,
        );
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    throw lastError;
  }

  /**
   * Logs the API↔database round-trip time once at boot. Every DB call pays
   * this cost at least once, and staff actions make several sequential calls,
   * so a value above ~20 ms usually means the API and database run in
   * different regions — the main cause of slow consoles and logins.
   */
  private async logRoundTrip(): Promise<void> {
    try {
      const samples: number[] = [];
      for (let i = 0; i < 3; i++) {
        const started = Date.now();
        await this.$queryRaw`SELECT 1`;
        samples.push(Date.now() - started);
      }
      samples.sort((a, b) => a - b);
      const median = samples[1] ?? samples[0] ?? 0;
      const msg = `Database round trip: ${median} ms (median of 3)`;
      if (median > 20) {
        this.logger.warn(
          `${msg} — high for a co-located database; check that the API and database regions match`,
        );
      } else {
        this.logger.log(msg);
      }
    } catch (err) {
      this.logger.warn(`Database round-trip probe failed: ${String(err)}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
