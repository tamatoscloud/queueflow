import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { JwtAccessPayload } from './interfaces/auth.interfaces';

@Injectable()
export class TokenService {
  private readonly accessTtlSeconds: number;

  constructor(private readonly jwt: JwtService) {
    this.accessTtlSeconds = Number(process.env.JWT_EXPIRY_SECONDS ?? 3600);
  }

  get accessExpiresIn(): number {
    return this.accessTtlSeconds;
  }

  signAccess(payload: Omit<JwtAccessPayload, 'type'>): string {
    return this.jwt.sign({ ...payload, type: 'access' });
  }

  verifyAccess(token: string): JwtAccessPayload {
    return this.jwt.verify<JwtAccessPayload>(token);
  }
}
