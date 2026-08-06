import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtAccessPayload } from '../interfaces/auth.interfaces';
import type { AuthenticatedUser } from '../interfaces/auth.interfaces';
import { SystemRole } from '../constants/roles-permissions';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'CHANGE_ME_LOCAL_ONLY',
    });
  }

  validate(payload: JwtAccessPayload): AuthenticatedUser {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }
    return {
      id: payload.sub,
      email: payload.email,
      fullName: '',
      businessId: payload.businessId,
      sessionId: payload.sessionId,
      roles: payload.roles,
      permissions: payload.permissions,
      branchIds: payload.branchIds,
      isPlatformAdmin: payload.roles.includes(SystemRole.SUPER_ADMIN),
    };
  }
}
