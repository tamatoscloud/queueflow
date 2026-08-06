import { BadRequestException } from '@nestjs/common';

const BRANCH_CODE_PATTERN = /^[A-Z0-9_-]{2,20}$/;

export function assertValidBranchCode(code: string): void {
  if (!BRANCH_CODE_PATTERN.test(code)) {
    throw new BadRequestException(
      'Branch code must be 2–20 uppercase alphanumeric characters, underscores, or hyphens',
    );
  }
}
