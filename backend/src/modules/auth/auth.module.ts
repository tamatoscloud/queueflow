import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { BusinessContext } from '../../common/context/business-context';
import { TenantScopeService } from '../../common/tenant/tenant-scope.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { TokenService } from './token.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard, PermissionsGuard } from './guards/auth.guards';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'CHANGE_ME_LOCAL_ONLY',
      signOptions: {
        expiresIn: Number(process.env.JWT_EXPIRY_SECONDS ?? 3600),
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepository,
    PasswordService,
    SessionService,
    TokenService,
    JwtStrategy,
    BusinessContext,
    TenantScopeService,
    JwtAuthGuard,
    PermissionsGuard,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [
    AuthService,
    PasswordService,
    BusinessContext,
    TenantScopeService,
    AuthRepository,
    TokenService,
  ],
})
export class AuthModule {}
