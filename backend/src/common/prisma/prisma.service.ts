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

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
