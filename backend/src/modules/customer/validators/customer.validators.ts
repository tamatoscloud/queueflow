import { BadRequestException } from '@nestjs/common';

export function assertValidPhone(phone: string): void {
  const normalized = phone.replace(/\s/g, '');
  if (normalized.length < 8 || normalized.length > 20) {
    throw new BadRequestException('Phone must be between 8 and 20 characters');
  }
}
