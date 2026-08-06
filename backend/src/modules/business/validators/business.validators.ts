import { BadRequestException } from '@nestjs/common';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function assertValidBusinessSlug(slug: string): void {
  if (!SLUG_PATTERN.test(slug)) {
    throw new BadRequestException(
      'Slug must be lowercase alphanumeric with hyphens only (e.g. cafe-aroma)',
    );
  }
}
