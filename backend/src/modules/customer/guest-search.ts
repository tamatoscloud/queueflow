import type { Prisma } from '@prisma/client';

export type ParsedGuestSearch = {
  /** Query with leading # stripped. */
  text: string;
  digits: string;
  tokenNumber: number | null;
  displayCodeVariants: string[];
  isTicketLike: boolean;
};

/**
 * Staff type "74", "#74", or "A-074". Stored codes are usually "A-074".
 */
export function parseGuestSearchQuery(raw: string): ParsedGuestSearch {
  const text = raw.trim().replace(/^#+/, '').trim();
  const digits = text.replace(/\D/g, '');
  const prefixMatch = /^([A-Za-z]{1,4})[- ]?(\d{1,6})$/.exec(text);
  const prefix = prefixMatch?.[1];
  const prefixDigits = prefixMatch?.[2];
  const numericOnly = /^\d{1,6}$/.test(text);

  let tokenNumber: number | null = null;
  if (numericOnly) {
    tokenNumber = Number.parseInt(text, 10);
  } else if (prefixDigits) {
    tokenNumber = Number.parseInt(prefixDigits, 10);
  }
  if (tokenNumber !== null && (!Number.isFinite(tokenNumber) || tokenNumber < 1)) {
    tokenNumber = null;
  }

  const variants = new Set<string>();
  if (text) variants.add(text);

  if (prefix && prefixDigits) {
    const codePrefix = prefix.toUpperCase();
    const n = Number.parseInt(prefixDigits, 10);
    const padded = String(n).padStart(3, '0');
    variants.add(`${codePrefix}-${padded}`);
    variants.add(`${codePrefix}-${n}`);
    variants.add(`${codePrefix}${padded}`);
    variants.add(padded);
    variants.add(String(n));
  }

  if (numericOnly && tokenNumber !== null) {
    const padded = String(tokenNumber).padStart(3, '0');
    variants.add(padded);
    variants.add(String(tokenNumber));
  }

  return {
    text,
    digits,
    tokenNumber,
    displayCodeVariants: [...variants],
    isTicketLike: tokenNumber !== null,
  };
}

export function queueTokenSearchWhere(
  raw: string,
): Prisma.QueueTokenWhereInput | null {
  const parsed = parseGuestSearchQuery(raw);
  if (!parsed.text) return null;

  const or: Prisma.QueueTokenWhereInput[] = [];

  for (const code of parsed.displayCodeVariants) {
    or.push({ displayCode: { equals: code, mode: 'insensitive' } });
  }

  if (parsed.tokenNumber !== null) {
    or.push({ tokenNumber: parsed.tokenNumber });
    const n = parsed.tokenNumber;
    or.push({ displayCode: { endsWith: `-${String(n).padStart(3, '0')}` } });
    or.push({ displayCode: { endsWith: `-${n}` } });
  } else {
    or.push({
      displayCode: { contains: parsed.text, mode: 'insensitive' },
    });
  }

  return { OR: or };
}
