import { Injectable, Scope } from '@nestjs/common';
import type { AuthenticatedUser } from '../../modules/auth/interfaces/auth.interfaces';

/**
 * Request-scoped tenant + actor context populated by JwtAuthGuard.
 */
@Injectable({ scope: Scope.REQUEST })
export class BusinessContext {
  private user: AuthenticatedUser | null = null;

  setUser(user: AuthenticatedUser): void {
    this.user = user;
  }

  getUser(): AuthenticatedUser {
    if (!this.user) {
      throw new Error('BusinessContext not initialized — route may be missing auth');
    }
    return this.user;
  }

  get userId(): string {
    return this.getUser().id;
  }

  get businessId(): string | null {
    return this.getUser().businessId;
  }

  get sessionId(): string {
    return this.getUser().sessionId;
  }

  get permissions(): Set<string> {
    return new Set(this.getUser().permissions);
  }

  get branchIds(): string[] | null {
    return this.getUser().branchIds;
  }

  isPlatformAdmin(): boolean {
    return this.getUser().isPlatformAdmin;
  }

  hasPermission(key: string): boolean {
    return this.permissions.has(key);
  }

  /** Ensures the actor may access a tenant-owned resource. */
  assertTenantAccess(resourceBusinessId: string): void {
    if (this.isPlatformAdmin()) {
      return;
    }
    if (!this.businessId || this.businessId !== resourceBusinessId) {
      throw new Error('TENANT_ACCESS_DENIED');
    }
  }

  /** Resolves effective businessId for queries (platform admin may pass override). */
  resolveBusinessId(override?: string): string {
    if (override) {
      if (!this.isPlatformAdmin() && this.businessId !== override) {
        throw new Error('TENANT_ACCESS_DENIED');
      }
      return override;
    }
    if (!this.businessId) {
      throw new Error('BUSINESS_CONTEXT_REQUIRED');
    }
    return this.businessId;
  }
}
