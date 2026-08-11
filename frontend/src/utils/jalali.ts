// Jalali (Persian/Shamsi) calendar via the browser's native Intl API.
// No external deps: Intl.DateTimeFormat with the `persian` and
// `islamic-umalqura` calendars does the astronomical conversion for us.

export interface PyDate {
  y: number;
  m: number;
  d: number;
}

export const PERSIAN_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

export const WEEKDAY_SHORT_SAT_FIRST = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
export const WEEKDAY_FULL = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

const persianFmt = new Intl.DateTimeFormat('en-US-u-ca-persian', {
  timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric',
});

const islamicFmt = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
  timeZone: 'UTC', month: 'numeric', day: 'numeric',
});

function readParts(fmt: Intl.DateTimeFormat, date: Date): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of fmt.formatToParts(date)) {
    if (p.type === 'year' || p.type === 'month' || p.type === 'day') {
      out[p.type] = parseInt(p.value, 10);
    }
  }
  return out;
}

export function gregorianToPersian(date: Date): PyDate {
  const p = readParts(persianFmt, date);
  return { y: p.year, m: p.month, d: p.day };
}

function gregorianToIslamic(date: Date): { m: number; d: number } | null {
  try {
    const p = readParts(islamicFmt, date);
    return { m: p.month, d: p.day };
  } catch {
    return null;
  }
}

export function toFaDigits(n: number | string): string {
  const fa = '۰۱۲۳۴۵۶۷۸۹';
  return String(n).replace(/[0-9]/g, (c) => fa[+c]);
}

function utc(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d));
}

/** Gregorian UTC date that is the 1st of Farvardin (month 1) of the given Persian year. */
export function firstFarvardin(persianYear: number): Date {
  const estGreg = persianYear + 621;
  let cursor = utc(estGreg - 1, 12, 20);
  while (true) {
    const p = gregorianToPersian(cursor);
    if (p.y === persianYear && p.m === 1 && p.d === 1) return cursor;
    cursor = new Date(cursor.getTime() + 86400000);
    if (cursor.getTime() - utc(estGreg - 1, 12, 20).getTime() > 160 * 86400000) {
      throw new Error('could not locate Farvardin 1');
    }
  }
}

export interface PersianMonth {
  month: number;     // 1..12
  name: string;
  first: Date;       // UTC date of day 1
  days: number;
}

export function persianYearMonths(persianYear: number): PersianMonth[] {
  const months: PersianMonth[] = [];
  let cursor = firstFarvardin(persianYear);
  let m = 1;
  while (m <= 12) {
    // advance cursor to day 1 of month m (already correct for m===1)
    let probe = cursor;
    let count = 0;
    while (gregorianToPersian(probe).m === m) {
      count++;
      probe = new Date(probe.getTime() + 86400000);
    }
    months.push({ month: m, name: PERSIAN_MONTHS[m - 1], first: cursor, days: count });
    cursor = probe;
    m++;
  }
  return months;
}

export function weekdaySatFirstCol(date: Date): number {
  // 0 = Saturday ... 6 = Friday
  return (date.getUTCDay() + 1) % 7;
}

export function weekdayFull(utcDay: number): string {
  return WEEKDAY_FULL[(utcDay + 1) % 7];
}

// ─── Holidays ───
export interface HolidayInfo {
  name: string;
  lunar: boolean;
}

// Fixed solar (Gregorian-anchored) official public holidays of Iran.
const SOLAR_HOLIDAYS: Record<number, Record<number, HolidayInfo>> = {
  1: {
    1: { name: 'نوروز', lunar: false },
    2: { name: 'نوروز', lunar: false },
    3: { name: 'نوروز', lunar: false },
    4: { name: 'نوروز', lunar: false },
    12: { name: 'روز جمهوری اسلامی', lunar: false },
    13: { name: 'روز طبیعت', lunar: false },
  },
  3: {
    14: { name: 'رحلت امام خمینی (ره)', lunar: false },
    15: { name: 'قیام ۱۵ خرداد', lunar: false },
  },
  11: {
    22: { name: 'پیروزی انقلاب اسلامی', lunar: false },
  },
  12: {
    29: { name: 'ملی‌شدن صنعت نفت', lunar: false },
  },
};

// Lunar (Islamic) holidays, matched by the islamic-umalqura calendar.
// Islamic month numbering: 1=Muharram,2=Safar,3=Rabi I,4=Rabi II,
// 5=Jamada I,6=Jamada II,7=Rajab,8=Sha'ban,9=Ramadan,
// 10=Shawwal,11=Dhu al-Qi'dah,12=Dhu al-Hijjah.
const LUNAR_HOLIDAYS: Record<number, Record<number, HolidayInfo>> = {
  1: {
    9: { name: 'تاسوعا', lunar: true },
    10: { name: 'عاشورا', lunar: true },
  },
  2: {
    20: { name: 'اربعین', lunar: true },
    28: { name: 'رحلت پیامبر و شهادت امام حسن (ع)', lunar: true },
    30: { name: 'شهادت امام رضا (ع)', lunar: true },
  },
  3: {
    17: { name: 'میلاد پیامبر و امام جعفر صادق (ع)', lunar: true },
  },
  10: {
    1: { name: 'عید فطر', lunar: true },
    2: { name: 'عید فطر', lunar: true },
  },
  12: {
    10: { name: 'عید قربان', lunar: true },
    18: { name: 'عید غدیر خم', lunar: true },
  },
};

export function todayHoliday(date: Date): HolidayInfo | null {
  const p = gregorianToPersian(date);
  const sol = SOLAR_HOLIDAYS[p.m]?.[p.d];
  if (sol) return sol;
  const isl = gregorianToIslamic(date);
  return (isl && LUNAR_HOLIDAYS[isl.m]?.[isl.d]) || null;
}

export function dateHoliday(p: { m: number; d: number }, date: Date): HolidayInfo | null {
  const sol = SOLAR_HOLIDAYS[p.m]?.[p.d];
  if (sol) return sol;
  const isl = gregorianToIslamic(date);
  return (isl && LUNAR_HOLIDAYS[isl.m]?.[isl.d]) || null;
}

export function isFriday(date: Date): boolean {
  return date.getUTCDay() === 5;
}