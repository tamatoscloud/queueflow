import type { Business, BusinessSettings } from '@prisma/client';

export type BusinessWithSettings = Business & {
  settings: BusinessSettings | null;
};

export function toBusinessResponse(row: BusinessWithSettings) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    email: row.email,
    phone: row.phone,
    timezone: row.timezone,
    status: row.status,
    logoUrl: row.logoUrl,
    businessType: row.businessType,
    settings: row.settings
      ? {
          ...row.settings,
          enabledModes: row.settings.enabledModes,
        }
      : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
