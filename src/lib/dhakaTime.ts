const BANGLA_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'] as const;

export function toBanglaDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => BANGLA_DIGITS[Number(d)] ?? d);
}

/**
 * Returns YYYY-MM-DD strictly in Asia/Dhaka (UTC+6) timezone.
 * offsetDays = 0 -> today in Dhaka, -1 -> yesterday in Dhaka.
 */
export function getDhakaDateStr(offsetDays = 0, baseDate: Date = new Date()): string {
  // Format current instant in Asia/Dhaka to YYYY-MM-DD first, then shift calendar days safely via UTC noon
  const dhakaToday = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(baseDate);

  if (offsetDays === 0) return dhakaToday;

  const [y, m, d] = dhakaToday.split('-').map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + offsetDays, 12, 0, 0));
  return shifted.toISOString().slice(0, 10);
}

export function getDhakaClockParts(baseDate: Date = new Date()): {
  dateStr: string;
  hhmm: string;
  dayOfWeek: number;
  displayDateBn: string;
} {
  const dateStr = getDhakaDateStr(0, baseDate);
  const timeStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dhaka',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(baseDate);

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const weekdayShort = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    weekday: 'short',
  }).format(baseDate);

  const displayDateBn = formatDhakaDisplayDateBn(dateStr);

  return {
    dateStr,
    hhmm: timeStr,
    dayOfWeek: weekdayMap[weekdayShort] ?? 0,
    displayDateBn,
  };
}

export function formatDhakaDisplayDateBn(dateStr: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [y, m, d] = dateStr.split('-').map(Number);
  const utcMid = new Date(Date.UTC(y, m - 1, d, 6, 0, 0));
  try {
    return new Intl.DateTimeFormat('bn-BD', {
      timeZone: 'Asia/Dhaka',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(utcMid);
  } catch {
    return toBanglaDigits(dateStr);
  }
}

export function formatDhakaShortDateBn(dateStr: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [y, m, d] = dateStr.split('-').map(Number);
  const utcMid = new Date(Date.UTC(y, m - 1, d, 6, 0, 0));
  try {
    return new Intl.DateTimeFormat('bn-BD', {
      timeZone: 'Asia/Dhaka',
      day: 'numeric',
      month: 'short',
    }).format(utcMid);
  } catch {
    return toBanglaDigits(dateStr.slice(5));
  }
}

export function formatMinutesBn(minutes: number | null | undefined): string {
  const safe = Math.max(0, Math.round(Number(minutes) || 0));
  const hrs = Math.floor(safe / 60);
  const mins = safe % 60;
  if (hrs === 0) return `${toBanglaDigits(mins)} মিনিট`;
  if (mins === 0) return `${toBanglaDigits(hrs)} ঘণ্টা`;
  return `${toBanglaDigits(hrs)} ঘণ্টা ${toBanglaDigits(mins)} মিনিট`;
}

export function formatMinutesCompactBn(minutes: number | null | undefined): string {
  const safe = Math.max(0, Math.round(Number(minutes) || 0));
  const hrs = Math.floor(safe / 60);
  const mins = safe % 60;
  if (hrs === 0) return `${toBanglaDigits(mins)} মি.`;
  if (mins === 0) return `${toBanglaDigits(hrs)} ঘ.`;
  return `${toBanglaDigits(hrs)}ঘ ${toBanglaDigits(mins)}মি`;
}

/**
 * Pure calculation for Daily Productive Time:
 * - Only checked items (items[key] === true) contribute.
 * - Items with null / 0 / missing time are NEVER guessed or added.
 * - Changing duration or unchecking recomputes cleanly without double-counting.
 */
export function computeProductiveMinutes(
  items: Record<string, boolean> | null | undefined,
  itemMinutes: Record<string, number> | null | undefined,
  validKeys?: Set<string>
): number {
  if (!items || !itemMinutes) return 0;
  let total = 0;
  for (const [key, isChecked] of Object.entries(items)) {
    if (!isChecked) continue;
    if (validKeys && !validKeys.has(key)) continue;
    const rawMin = Number(itemMinutes[key]);
    if (Number.isFinite(rawMin) && rawMin > 0) {
      total += Math.min(600, Math.round(rawMin));
    }
  }
  return total;
}

export function sanitizeItemMinutes(
  input: Record<string, any> | null | undefined
): Record<string, number> {
  const out: Record<string, number> = {};
  if (!input || typeof input !== 'object') return out;
  for (const [k, v] of Object.entries(input)) {
    if (v === null || v === undefined || v === '') continue;
    const num = Math.round(Number(v));
    if (Number.isFinite(num) && num > 0 && num <= 600) {
      out[String(k)] = num;
    }
  }
  return out;
}
