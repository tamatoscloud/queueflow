import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ContextIdFactory, ModuleRef, Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { BusinessContext } from '../../../common/context/business-context';
import { AuthService } from '../auth.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PERMISSIONS_KEY, PERMISSIONS_ANY_KEY } from '../decorators/permissions.decorator';
import type { AuthenticatedUser } from '../interfaces/auth.interfaces';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(ModuleRef) private readonly moduleRef: ModuleRef,
  ) {
    super();
  }

  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const result = await super.canActivate(context);
    if (!result) {
      return false;
    }

    const request = context.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    await this.authService.validateSession(user.sessionId);
    const contextId = ContextIdFactory.getByRequest(request);
    this.moduleRef.registerRequestByContextId(request, contextId);
    const businessContext = await this.moduleRef.resolve(BusinessContext, contextId, {
      strict: false,
    });
    businessContext.setUser(user);
    this.assertPermissions(context, user);
    return true;
  }

  private assertPermissions(context: ExecutionContext, user: AuthenticatedUser): void {
    const requiredAll = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredAny = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_ANY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if ((!requiredAll || requiredAll.length === 0) && (!requiredAny || requiredAny.length === 0)) {
      return;
    }

    if (requiredAll?.length) {
      const hasAll = requiredAll.every((p) =>
        user.permissions.includes(p as AuthenticatedUser['permissions'][number]),
      );
      if (!hasAll) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    if (requiredAny?.length) {
      const hasAny = requiredAny.some((p) =>
        user.permissions.includes(p as AuthenticatedUser['permissions'][number]),
      );
      if (!hasAny) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }
  }

  override handleRequest<TUser>(err: Error | null, user: TUser | false): TUser {
    if (err || !user) {
      throw err ?? new UnauthorizedException('Authentication required');
    }
    return user;
  }
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    const requiredAll = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredAny = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_ANY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if ((!requiredAll || requiredAll.length === 0) && (!requiredAny || requiredAny.length === 0)) {
      return true;
    }

    if (requiredAll?.length) {
      const hasAll = requiredAll.every((p) =>
        user.permissions.includes(p as AuthenticatedUser['permissions'][number]),
      );
      if (!hasAll) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    if (requiredAny?.length) {
      const hasAny = requiredAny.some((p) =>
        user.permissions.includes(p as AuthenticatedUser['permissions'][number]),
      );
      if (!hasAny) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    return true;
  }
}
