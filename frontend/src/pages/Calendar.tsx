import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, CalendarDays, Sun, Moon, X } from 'lucide-react';
import { useClock } from '../hooks/useClock';
import {
  gregorianToPersian, persianYearMonths, weekdaySatFirstCol, weekdayFull,
  dateHoliday, todayHoliday, toFaDigits, WEEKDAY_SHORT_SAT_FIRST,
} from '../utils/jalali';

function utc(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d));
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400000);
}

interface DayCell {
  d: number;
  date: Date;
  holiday: { name: string; lunar: boolean } | null;
  isFriday: boolean;
  isToday: boolean;
}

const MONTH_GRID_TEMPLATE: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, minmax(0,1fr))',
  gap: 4,
};

export default function CalendarPage() {
  const today = useClock(); // refreshes each second for live "today"
  const todayP = gregorianToPersian(today);
  const [year, setYear] = useState<number>(todayP.y);
  const [selected, setSelected] = useState<{ date: Date; p: { m: number; d: number }; holiday: { name: string; lunar: boolean } | null } | null>(null);

  const todayHoli = todayHoliday(today);
  const todayFa = `${todayP.d} ${PERSIAN_MONTHS[todayP.m - 1]} ${toFaDigits(todayP.y)}`;
  const weekdayName = weekdayFull(today.getUTCDay());

  const months = useMemo(() => persianYearMonths(year), [year]);

  const monthCells = useMemo<{ month: number; name: string; cells: (DayCell | null)[] }[]>(
    () =>
      months.map((mo) => {
        const lead = weekdaySatFirstCol(mo.first);
        const cells: (DayCell | null)[] = Array(lead).fill(null);
        let cursor = mo.first;
        const todayO = gregorianToPersian(today);
        for (let k = 0; k < mo.days; k++) {
          const isToday = todayO.y === year && todayO.m === mo.month && todayO.d === k + 1;
          const holiday = dateHoliday({ m: mo.month, d: k + 1 }, cursor);
          cells.push({
            d: k + 1,
            date: cursor,
            holiday,
            isFriday: cursor.getUTCDay() === 5,
            isToday,
          });
          cursor = addDays(cursor, 1);
        }
        return { month: mo.month, name: mo.name, cells, offset: lead };
      }),
    [months, year, todayP, today]
  );

  // Upcoming holidays (next ~380 days from today)
  const upcoming = useMemo(() => {
    const list: { date: Date; p: { m: number; d: number }; name: string; lunar: boolean }[] = [];
    for (let i = 0; i < 390; i++) {
      const d = addDays(today, i);
      const p = gregorianToPersian(d);
      const h = dateHoliday(p, d);
      if (h && !list.some((x) => x.name === h.name)) {
        list.push({ date: d, p, name: h.name, lunar: h.lunar });
      }
      if (list.length >= 12) break;
    }
    return list;
  }, [today]);

  const isCurrentYear = year === todayP.y;

  return (
    <div
      dir="rtl"
      className="max-w-7xl mx-auto space-y-4 pb-10"
      style={{ fontFamily: "'Vazirmatn', Tahoma, system-ui, sans-serif" }}
    >
      {/* Header / today panel */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass-card p-5 relative overflow-hidden">
          <div className="absolute -left-6 -top-6 w-40 h-40 rounded-full bg-cosmic-gold/10 blur-2xl" />
          <div className="flex items-center gap-2 text-cosmic-gold mb-1">
            <Sun size={15} />
            <span className="text-[10px] uppercase tracking-widest opacity-70">روز جاری</span>
          </div>
          <div className="text-3xl md:text-4xl font-semibold text-white leading-snug">{todayH}</div>
          <div className="mt-1 text-sm text-navy-200/70">{todayWeek}</div>
          {todayHoliday && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs bg-gold/15 text-cosmic-gold px-2.5 py-1 rounded-full">
              <CalendarDays size={12} /> {todayH.month === 12 && todayH.day === todayDay ? todayH.name : holiPoloName(todayH)}
            </div>
          )}
          <div className="mt-4 text-[11px] text-navy-300/60">
            مساوی با {today.toISOString().slice(0, 10)} میلادی
          </div>
        </div>

        {/* Upcoming holidays */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 text-cosmic-cyan mb-3">
            <Sun size={14} />
            <span className="text-sm font-semibold text-white">تعطیلی‌های پیش رو</span>
          </div>
          <div className="space-y-1.5">
            {upcoming.map((u, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs px-2 py-1 rounded-lg bg-white/[0.03]"
                style={userDir}
              >
                <span className={u.lunar ? 'text-amber-200/80' : 'text-cosmic-rose'}>
                  {u.name}
                </span>
                <span className="text-navy-300/70 tabular-nums">
                  {toFaDigits(u.p.d)} {PERSIAN_MONTHS[u.p.m - 1]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Year selector */}
      <div className="flex items-center justify-center gap-3">
        <button onClick={() => setYear((y) => y - 1)} className="p-1.5 rounded-lg hover:bg-white/5 text-navy-200" aria-label="سال قبل">
          <ChevronRight size={18} />
        </button>
        <span className="text-xl md:text-2xl font-display font-semibold text-white tabular-nums">
          {toFaDigits(year)}
        </span>
        <button onClick={() => setYear((y) => y + 1)} className="p-1.5 rounded-lg hover:bg-white/5 text-navy-200" aria-label="سال بعد">
          <ChevronLeft size={18} />
        </button>
        {!badgeYear && (
          <button
            onClick={() => setYear(todayP.y)}
            className="text-[11px] px-2 py-1 rounded-full bg-cosmic-cyan/10 text-cosmic-cyan hover:bg-cosmic-cyan/20"
          >
            بازگشت به امسال
          </button>
        )}
      </div>

      {/* Month grids */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {cells.map((mo) => (
          <div key={mo.month} className="glass-card p-3">
            <div className="text-center font-display font-semibold text-white mb-2">
              {PERSIAN_MONTHS[mo.month - 1]}
              <span className="text-navy-300/50 font-normal text-xs mr-1">۱۴{toFaDigits(year) % 100 ? String(year).slice(2) : ''}</span>
            </div>

            {/* weekday header */}
            <div style={MONTH_GRID_TEMPLATE} className="mb-1">
              {WEEKDAY_SHORT_SAT_FIRST.map((w, i) => (
                <div key={i} className={`text-center text-[10px] ${i === 6 ? 'text-cosmic-rose' : 'text-navy-300/60'}`}>
                  {w}
                </div>
              ))}
            </div>

            <div style={MONTH_GRID_TEMPLATE}>
              {mo.cells.map((c, idx) =>
                c === null ? (
                  <div key={idx} />
                ) : (
                  <button
                    key={idx}
                    onClick={() => setSelected({ date: c.date, p: { m: mo.month, d: c.d }, holiday: c.holiday })}
                    className={`relative aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all ${
                      c.isToday
                        ? 'ring-2 ring-cosmic-gold bg-cosmic-gold/15 text-white font-bold'
                        : c.holiday
                        ? 'text-cosmic-rose hover:bg-white/5'
                        : c.isFriday
                        ? 'text-cosmic-rose/80 hover:bg-white/5'
                        : 'text-navy-100 hover:bg-white/5'
                    }`}
                  >
                    <span className="leading-none">{toFaDigits(c.d)}</span>
                    <span
                      className={`mt-0.5 w-1 h-1 rounded-full ${
                        c.holiday ? 'bg-cosmic-gold' : c.isToday ? 'bg-cosmic-gold' : c.isFriday ? 'bg-cosmic-rose/40' : 'bg-transparent'
                      }`}
                    />
                  </button>
                )
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Selected day detail */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
              onClick={() => setSelected(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-24 md:bottom-1/2 md:translate-y-1/2 left-1/2 -translate-x-1/2 z-[61] w-[17rem] glass-card p-4"
              dir="rtl"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg font-semibold text-white">
                    {toFaDigits(selected.day = selected.p.d)} {PERSIAN_MONTHS[selected.p.m - 1]}
                  </div>
                  <div className="text-xs text-navy-300/70 mt-1">{weekdayFull(selected.date.getUTCDay())}</div>
                </div>
                <button onClick={() => setSelected(null)} className="p-1 text-navy-300 hover:text-white">
                  <X size={15} />
                </button>
              </div>
              {selected.holiday ? (
                <div className="mt-3 text-sm text-cosmic-gold">{selected.holiday.name}</div>
              ) : (
                <div className="mt-3 text-sm text-navy-200/50">روز معمولی</div>
              )}
              <div className="mt-2 text-[11px] text-navy-300/60">
                {toFaDigits(year)} / تعطیل؟ {selected.holiday ? 'بله' : 'خیر'}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}