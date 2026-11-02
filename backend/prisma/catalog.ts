/**
 * Built-in permission/role/plan catalog shared by the dev seed and the
 * production bootstrap. Changing these changes what a fresh database gets.
 */
export const SYSTEM_ROLE_NAMES = ['OWNER', 'MANAGER', 'RECEPTIONIST', 'STAFF', 'VIEWER'] as const;
export const PLATFORM_ROLE_NAME = 'PLATFORM_ADMIN';

export const PERMISSIONS: Array<{ key: string; category: string; description: string }> = [
  { key: 'business:manage', category: 'BUSINESS', description: 'Manage business profile and branding' },
  { key: 'branch:manage', category: 'BRANCH', description: 'Create, edit, and archive branches' },
  { key: 'staff:invite', category: 'STAFF', description: 'Invite and manage staff accounts' },
  { key: 'staff:manage_roles', category: 'STAFF', description: 'Assign roles and branch access to staff' },
  { key: 'queue:manage', category: 'QUEUE', description: 'Create, edit, pause, and close queues' },
  { key: 'queue:operate', category: 'QUEUE', description: 'Call, hold, skip, and complete queue entries' },
  { key: 'customer:view', category: 'CUSTOMER', description: 'View customer records and history' },
  { key: 'reports:view', category: 'REPORTS', description: 'View analytics and reporting dashboards' },
  { key: 'billing:manage', category: 'BILLING', description: 'Manage subscription and billing' },
  { key: 'settings:manage', category: 'SETTINGS', description: 'Manage business and branch settings' },
  { key: 'notifications:view', category: 'NOTIFICATIONS', description: 'View notifications and delivery logs' },
  { key: 'platform:manage_tenants', category: 'PLATFORM', description: 'Manage any business tenant (platform admin only)' },
];

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  OWNER: PERMISSIONS.filter((p) => p.category !== 'PLATFORM').map((p) => p.key),
  MANAGER: ['branch:manage', 'staff:invite', 'staff:manage_roles', 'queue:manage', 'queue:operate', 'customer:view', 'reports:view', 'settings:manage', 'notifications:view'],
  RECEPTIONIST: ['queue:operate', 'customer:view', 'notifications:view'],
  STAFF: ['queue:operate', 'customer:view', 'notifications:view'],
  VIEWER: ['reports:view', 'customer:view', 'notifications:view'],
  PLATFORM_ADMIN: ['platform:manage_tenants'],
};

export const SUBSCRIPTION_PLANS = [
  {
    name: 'Starter',
    slug: 'starter',
    priceMonthly: '0.00',
    priceYearly: '0.00',
    maxBranches: 1,
    maxStaff: 3,
    maxQueuesPerBranch: 2,
    maxActiveEntriesPerQueue: 50,
    featureFlags: { customBranding: false, whatsappNotifications: false },
    sortOrder: 0,
  },
  {
    name: 'Growth',
    slug: 'growth',
    priceMonthly: '29.00',
    priceYearly: '290.00',
    maxBranches: 5,
    maxStaff: 25,
    maxQueuesPerBranch: 10,
    maxActiveEntriesPerQueue: 300,
    featureFlags: { customBranding: true, whatsappNotifications: true },
    sortOrder: 1,
  },
  {
    name: 'Scale',
    slug: 'scale',
    priceMonthly: '99.00',
    priceYearly: '990.00',
    maxBranches: null,
    maxStaff: null,
    maxQueuesPerBranch: null,
    maxActiveEntriesPerQueue: null,
    featureFlags: { customBranding: true, whatsappNotifications: true, prioritySupport: true },
    sortOrder: 2,
  },
];
