/**
 * System role names stored in the database (seeded).
 * API-facing labels map to these via ROLE_LABELS.
 */
export const SystemRole = {
  SUPER_ADMIN: 'PLATFORM_ADMIN',
  BUSINESS_OWNER: 'OWNER',
  BRANCH_MANAGER: 'MANAGER',
  RECEPTIONIST: 'RECEPTIONIST',
  STAFF: 'STAFF',
  VIEWER: 'VIEWER',
} as const;

export type SystemRoleName = (typeof SystemRole)[keyof typeof SystemRole];

export const ROLE_LABELS: Record<string, string> = {
  PLATFORM_ADMIN: 'Super Admin',
  OWNER: 'Business Owner',
  MANAGER: 'Branch Manager',
  RECEPTIONIST: 'Receptionist',
  STAFF: 'Staff',
  VIEWER: 'Viewer',
};

export const Permission = {
  BUSINESS_MANAGE: 'business:manage',
  BRANCH_MANAGE: 'branch:manage',
  STAFF_INVITE: 'staff:invite',
  STAFF_MANAGE_ROLES: 'staff:manage_roles',
  QUEUE_MANAGE: 'queue:manage',
  QUEUE_OPERATE: 'queue:operate',
  CUSTOMER_VIEW: 'customer:view',
  REPORTS_VIEW: 'reports:view',
  BILLING_MANAGE: 'billing:manage',
  PLATFORM_MANAGE_TENANTS: 'platform:manage_tenants',
  SETTINGS_MANAGE: 'settings:manage',
  NOTIFICATIONS_VIEW: 'notifications:view',
} as const;

export type PermissionKey = (typeof Permission)[keyof typeof Permission];

export const ALL_PERMISSIONS: Array<{
  key: PermissionKey;
  category: string;
  description: string;
}> = [
  { key: Permission.BUSINESS_MANAGE, category: 'BUSINESS', description: 'Manage business profile and branding' },
  { key: Permission.BRANCH_MANAGE, category: 'BRANCH', description: 'Create, edit, and archive branches' },
  { key: Permission.STAFF_INVITE, category: 'STAFF', description: 'Invite and manage staff accounts' },
  { key: Permission.STAFF_MANAGE_ROLES, category: 'STAFF', description: 'Assign roles and branch access to staff' },
  { key: Permission.QUEUE_MANAGE, category: 'QUEUE', description: 'Create, edit, pause, and close queues' },
  { key: Permission.QUEUE_OPERATE, category: 'QUEUE', description: 'Call, hold, skip, and complete queue entries' },
  { key: Permission.CUSTOMER_VIEW, category: 'CUSTOMER', description: 'View customer records and history' },
  { key: Permission.REPORTS_VIEW, category: 'REPORTS', description: 'View analytics and reporting dashboards' },
  { key: Permission.BILLING_MANAGE, category: 'BILLING', description: 'Manage subscription and billing' },
  { key: Permission.SETTINGS_MANAGE, category: 'SETTINGS', description: 'Manage business and branch settings' },
  { key: Permission.NOTIFICATIONS_VIEW, category: 'NOTIFICATIONS', description: 'View notifications and delivery logs' },
  { key: Permission.PLATFORM_MANAGE_TENANTS, category: 'PLATFORM', description: 'Manage any business tenant (platform admin only)' },
];

export const ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  [SystemRole.SUPER_ADMIN]: [Permission.PLATFORM_MANAGE_TENANTS],
  [SystemRole.BUSINESS_OWNER]: ALL_PERMISSIONS.filter((p) => p.category !== 'PLATFORM').map((p) => p.key),
  [SystemRole.BRANCH_MANAGER]: [
    Permission.BRANCH_MANAGE,
    Permission.STAFF_INVITE,
    Permission.QUEUE_MANAGE,
    Permission.QUEUE_OPERATE,
    Permission.CUSTOMER_VIEW,
    Permission.REPORTS_VIEW,
    Permission.NOTIFICATIONS_VIEW,
    Permission.SETTINGS_MANAGE,
  ],
  [SystemRole.RECEPTIONIST]: [
    Permission.QUEUE_OPERATE,
    Permission.CUSTOMER_VIEW,
    Permission.NOTIFICATIONS_VIEW,
  ],
  [SystemRole.STAFF]: [
    Permission.QUEUE_OPERATE,
    Permission.CUSTOMER_VIEW,
    Permission.NOTIFICATIONS_VIEW,
  ],
  [SystemRole.VIEWER]: [Permission.REPORTS_VIEW, Permission.CUSTOMER_VIEW, Permission.NOTIFICATIONS_VIEW],
};
