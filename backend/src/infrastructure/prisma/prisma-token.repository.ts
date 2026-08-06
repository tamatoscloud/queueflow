import { Injectable } from '@nestjs/common';
import type { IssuedToken } from '../../queue-engine/domain/factories/token-factory';
import type { TokenRepository } from '../../queue-engine';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PrismaTokenRepository implements TokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(token: IssuedToken): Promise<void> {
    await this.prisma.queueToken.create({
      data: {
        id: token.id,
        queueId: token.queueId,
        tokenNumber: token.tokenNumber,
        displayCode: token.displayCode,
        issuedDate: token.issuedDate,
        status: 'ISSUED',
      },
    });
  }
}
