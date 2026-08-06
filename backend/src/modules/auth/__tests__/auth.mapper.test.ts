import { describe, it, expect } from 'vitest';
import { extractPermissions, isPlatformAdmin } from '../auth.mapper';
import { SystemRole } from '../constants/roles-permissions';

describe('auth.mapper', () => {
  it('extracts unique permissions from roles', () => {
    const user = {
      userRoles: [
        {
          role: {
            name: 'STAFF',
            rolePermissions: [
              { permission: { key: 'queue:operate' } },
              { permission: { key: 'customer:view' } },
            ],
          },
        },
      ],
      userBranches: [],
    } as unknown as Parameters<typeof extractPermissions>[0];

    expect(extractPermissions(user).sort()).toEqual(['customer:view', 'queue:operate']);
  });

  it('detects platform admin role', () => {
    expect(isPlatformAdmin([SystemRole.SUPER_ADMIN])).toBe(true);
    expect(isPlatformAdmin(['OWNER'])).toBe(false);
  });
});
