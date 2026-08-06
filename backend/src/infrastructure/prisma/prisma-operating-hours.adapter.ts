import { Injectable } from '@nestjs/common';
import type { DayWindow, OperatingHoursPort } from '../../queue-engine';
import { PrismaService } from '../../common/prisma/prisma.service';

const WEEKDAY_INDEX: Record<string, number> = {
  MONDAY: 0,
  TUESDAY: 1,
  WEDNESDAY: 2,
  THURSDAY: 3,
  FRIDAY: 4,
  SATURDAY: 5,
  SUNDAY: 6,
};

function minutesFromTime(d: Date): number {
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/**
 * Rough offset lookup for common IANA zones used in seed data.
 * Full tzdb support can replace this later without changing the port.
 */
const TZ_OFFSET_MINUTES: Record<string, number> = {
  UTC: 0,
  'Asia/Karachi': 300,
  'Asia/Dubai': 240,
  'Europe/London': 0,
  'America/New_York': -300,
};

@Injectable()
export class PrismaOperatingHoursAdapter implements OperatingHoursPort {
  constructor(private readonly prisma: PrismaService) {}

  async getWindowsForBranch(branchId: string): Promise<DayWindow[]> {
    const rows = await this.prisma.workingHours.findMany({
      where: { branchId },
    });
    return rows.map((r) => ({
      dayOfWeek: WEEKDAY_INDEX[r.dayOfWeek] ?? 0,
      openMinutes: minutesFromTime(r.openTime),
      closeMinutes: minutesFromTime(r.closeTime),
      isClosed: r.isClosed,
    }));
  }

  async getTimezoneOffsetMinutes(branchId: string): Promise<number> {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: {
        timezone: true,
        business: { select: { timezone: true } },
      },
    });
    const tz = branch?.timezone ?? branch?.business.timezone ?? 'UTC';
    return TZ_OFFSET_MINUTES[tz] ?? 0;
  }
}
