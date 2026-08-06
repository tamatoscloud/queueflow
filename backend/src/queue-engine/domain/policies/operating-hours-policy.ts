import { OutsideOperatingHoursError } from '../exceptions/domain-errors';

export interface DayWindow {
  /** 0=Monday … 6=Sunday to match domain Weekday ordering used by the engine. */
  dayOfWeek: number;
  openMinutes: number;
  closeMinutes: number;
  isClosed: boolean;
}

/**
 * Pure operating-hours check. Branch windows are supplied by a port so the
 * domain never reads Prisma WorkingHours rows directly.
 */
export class OperatingHoursPolicy {
  static isOpen(now: Date, windows: readonly DayWindow[], timezoneOffsetMinutes = 0): boolean {
    if (windows.length === 0) {
      // No schedule configured → treat as always open (common for early tenants).
      return true;
    }
    const local = new Date(now.getTime() + timezoneOffsetMinutes * 60_000);
    // JS: 0=Sunday … convert to 0=Monday
    const jsDay = local.getUTCDay();
    const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1;
    const minutes = local.getUTCHours() * 60 + local.getUTCMinutes();

    const today = windows.filter((w) => w.dayOfWeek === dayOfWeek);
    if (today.length === 0) {
      return false;
    }
    return today.some(
      (w) => !w.isClosed && minutes >= w.openMinutes && minutes < w.closeMinutes,
    );
  }

  static assertOpen(
    branchId: string,
    now: Date,
    windows: readonly DayWindow[],
    timezoneOffsetMinutes = 0,
  ): void {
    if (!OperatingHoursPolicy.isOpen(now, windows, timezoneOffsetMinutes)) {
      throw new OutsideOperatingHoursError(branchId);
    }
  }
}
