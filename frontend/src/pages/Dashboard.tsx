import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Clock, Target, TrendingUp, AlertTriangle,
  Calendar, BarChart3, Shield, Check, X, Plus, Pencil, Trash2,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { useClock } from '../hooks/useClock';
import { formatCountdownPrecise, toLocalDateStr } from '../utils/formatTime';
import type { Deadline } from '../types';
import { TIME_BLOCK_TAGS, type TimeBlockTag } from '../types';
import { useTranslation } from '../i18n/t';

// ─── Shared components ───

function StatCard({ icon, label, value, color, pct }: { icon: React.ReactNode; label: string; value: string | number; color: string; pct?: number }) {
  return (
    <motion.div whileHover={{ y: -2 }} className="glass-card p-5 md:p-6 fade-in">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
        <p className="text-sm text-navy-200/60">{label}</p>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      {pct !== undefined && (
        <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div className={`h-full rounded-full ${color.split(' ')[0].replace('/20', '/40')}`}
            style={{ width: `${pct}%` }} />
        </div>
      )}
    </motion.div>
  );
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function DeadlineCard({ deadline }: { deadline: Deadline }) {
  const now = useClock();
  const dueDate = new Date(deadline.due_date);
  return (
    <div className="glass-card p-4 fade-in flex items-center justify-between">
      <div className="min-w-0 flex-1">
        <p className="text-base font-medium text-white truncate">{deadline.title}</p>
        <p className="text-sm font-mono tabular-nums text-navy-300/60 mt-1">
          {formatCountdownPrecise(dueDate, now)}
        </p>
      </div>
      <span className={`tag text-sm ${deadline.priority === 'high' ? 'tag-rose' : deadline.priority === 'medium' ? 'tag-gold' : 'tag-cyan'}`}>
        {deadline.priority}
      </span>
    </div>
  );
}

// ─── Date range picker + chart ───

type RangePreset = '1w' | '2w' | '1m' | 'custom';

function ChartSection({ planner }: { planner: any[] }) {
  const now = useClock();
  const { t } = useTranslation();

  const chartRef = useRef<HTMLDivElement>(null);
  const [chartH, setChartH] = useState(176);

  useEffect(() => {
    if (chartRef.current) {
      setChartH(chartRef.current.clientHeight);
    }
  }, []);

  const [preset, setPreset] = useState<RangePreset>('1w');
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return toLocalDateStr(d);
  });
  const [customEnd, setCustomEnd] = useState(() => toLocalDateStr(now));

  const range = useMemo(() => {
    const end = new Date(customEnd + 'T23:59:59');
    let start: Date;
    if (preset === '1w') {
      start = new Date(now);
      start.setDate(start.getDate() - 6);
    } else if (preset === '2w') {
      start = new Date(now);
      start.setDate(start.getDate() - 13);
    } else if (preset === '1m') {
      start = new Date(now);
      start.setMonth(start.getMonth() - 1);
    } else {
      start = new Date(customStart + 'T00:00:00');
    }
    return { start, end };
  }, [preset, customStart, customEnd, now]);

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const labels: string[] = [];
  const data: { work: number }[] = [];

  const cursor = new Date(range.start);
  while (cursor <= range.end) {
    const ds = toLocalDateStr(cursor);
    labels.push(cursor.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));

    const workHours = planner
      .filter((e) => e.date === ds)
      .reduce((sum, e) => {
        const blocks: any[] = e.time_blocks || [];
        return sum + blocks.reduce((s, tb) => {
          if (!tb.done) return s;
          if (tb.is_work === false) return s;
          if (!tb.time || !tb.completed_time) return s;
          const [sh, sm] = tb.time.split(':').map(Number);
          const [eh, em] = tb.completed_time.split(':').map(Number);
          const mins = (eh * 60 + em) - (sh * 60 + sm);
          return s + Math.max(0, mins / 60);
        }, 0);
      }, 0);
    data.push({ work: workHours });

    cursor.setDate(cursor.getDate() + 1);
  }

  const maxVal = Math.max(...data.map((d) => d.work), 1);

  const totalWorkHours = data.reduce((s, d) => s + d.work, 0);
  const totalHours = totalWorkHours;

  return (
    <div className="glass-card p-5 md:p-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-cosmic-cyan" />
          <h2 className="text-base font-semibold text-white">Hours Breakdown</h2>
        </div>

        <div className="flex items-center gap-2">
          {(['1w', '2w', '1m', 'custom'] as RangePreset[]).map((p) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                preset === p
                  ? 'bg-cosmic-cyan/20 text-cosmic-cyan'
                  : 'bg-white/5 text-navy-200/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {p === '1w' ? 'Week' : p === '2w' ? '2 Weeks' : p === '1m' ? 'Month' : 'Custom'}
            </button>
          ))}
        </div>
      </div>

      {/* Custom date inputs */}
      {preset === 'custom' && (
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-navy-200/60">From</span>
            <input type="date" value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-navy-200/60">To</span>
            <input type="date" value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white" />
          </div>
        </div>
      )}

      {/* Chart */}
      <div ref={chartRef} className="relative h-44 md:h-52 px-1 border-b border-white/5 pb-2">
        <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox={`0 0 ${data.length * 60} ${chartH}`}>
          {/* Hover guide column */}
          {hoverIndex !== null && (
            <rect
              x={hoverIndex * 60 + 4} y={8} width={52} height={chartH - 12}
              rx={10} fill="rgba(6,182,212,0.06)" stroke="rgba(6,182,212,0.22)" strokeWidth={1} strokeDasharray="3,3"
            />
          )}

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
            const y = chartH - frac * chartH;
            return (
              <line key={frac} x1={0} y1={y} x2={data.length * 60} y2={y}
                stroke={frac === 0 ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)"}
                strokeWidth={1} strokeDasharray={frac === 0 ? "none" : "2,5"} />
            );
          })}

          {/* Area fill */}
          {maxVal > 0 && (() => {
            const pts = data.map((d, i) => {
              const x = i * 60 + 30;
              const y = chartH - ((d.work) / maxVal) * chartH;
              return `${x},${y}`;
            });
            const bottomLeft = `0,${chartH}`;
            const bottomRight = `${(data.length - 1) * 60 + 30},${chartH}`;
            const d = `M${pts.join(' L')} L${bottomRight} L${bottomLeft} Z`;
            return (
              <path d={d} fill="url(#areaGrad)" opacity={0.25} />
            );
          })()}

          {/* Line */}
          {maxVal > 0 && (() => {
            const pts = data.map((d, i) => {
              const x = i * 60 + 30;
              const y = chartH - ((d.work) / maxVal) * chartH;
              return { x, y };
            });
            const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
            return (
              <>
                <path d={d} fill="none" stroke="rgba(6,182,212,0.35)" strokeWidth={7}
                  strokeLinecap="round" strokeLinejoin="round" opacity={0.5} style={{ transition: 'all .3s' }} />
                <path d={d} fill="none" stroke="url(#lineGrad)" strokeWidth={2.5}
                  strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all .3s' }} />
              </>
            );
          })()}

          {/* Dots */}
          {data.map((d, i) => {
            const total = d.work;
            const x = i * 60 + 30;
            const y = chartH - (total / maxVal) * chartH;
            const isHover = hoverIndex === i;
            return (
              <g key={i}>
                <rect x={x - 30} y={0} width={60} height={chartH} fill="transparent"
                  onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)} className="cursor-pointer" />
                {isHover && (
                  <line x1={x} y1={0} x2={x} y2={chartH}
                    stroke="rgba(6,182,212,0.18)" strokeWidth={1} strokeDasharray="4,4" className="pointer-events-none" />
                )}
                <circle cx={x} cy={y} r={isHover ? 6 : 3.5}
                  fill="rgba(6,182,212,0.95)"
                  stroke="#0b1422" strokeWidth={2}
                  className="pointer-events-none" style={{ transition: 'r .15s' }} />
                {isHover && (
                  <circle cx={x} cy={y} r={10}
                    fill="none" stroke="rgba(6,182,212,0.35)" strokeWidth={1.5} className="pointer-events-none" />
                )}
              </g>
            );
          })}

          <defs>
            <linearGradient id="areaGrad" x1={0} y1={0} x2={0} y2={1}>
              <stop offset="0%" stopColor="rgba(6,182,212,0.32)" />
              <stop offset="100%" stopColor="rgba(6,182,212,0)" />
            </linearGradient>
            <linearGradient id="lineGrad" x1={0} y1={0} x2={1} y2={0}>
              <stop offset="0%" stopColor="rgba(6,182,212,1)" />
              <stop offset="100%" stopColor="rgba(250,204,21,0.9)" />
            </linearGradient>
          </defs>
        </svg>

        {/* HTML tooltips positioned near dots */}
        {data.map((d, i) => {
          if (hoverIndex !== i) return null;
          const total = d.work;
          const ds = new Date(range.start);
          ds.setDate(ds.getDate() + i);
          const dateStr = toLocalDateStr(ds);
          const blockCount = planner
            .filter((e: any) => e.date === dateStr)
            .reduce((s: number, e: any) => s + (e.time_blocks || []).filter((tb: any) => tb.done).length, 0);
          const x = i * 60 + 30;
          const y = chartH - (total / maxVal) * chartH;
          const pctX = (x / (data.length * 60)) * 100;
          const pctY = (y / chartH) * 100;
          return (
            <div key={i} className="absolute z-10 pointer-events-none"
              style={{
                left: `${pctX}%`,
                transform: 'translateX(-50%)',
                bottom: `${100 - pctY}%`,
                marginTop: -8,
              }}>
              <div className="bg-[#0b1422]/95 backdrop-blur-md text-white text-[11px] rounded-xl shadow-2xl border border-cyan-300/20 ring-1 ring-white/5 min-w-[160px] overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-3.5 py-2 bg-gradient-to-r from-cyan-500/15 to-yellow-400/10 border-b border-white/10">
                  <span className="font-semibold text-cosmic-cyan text-xs uppercase tracking-wide">{labels[i]}</span>
                  <span className="text-navy-300/50 text-[10px]">{total > 0 ? `${Math.round((total / totalHours) * 100)}% of period` : 'no hours'}</span>
                </div>
                <div className="px-3.5 py-2.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 text-navy-300/60"><span className="w-2 h-2 rounded-sm bg-cosmic-cyan" />Total</span>
                    <span className="text-white font-semibold tabular-nums">{total.toFixed(1)}h</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 text-navy-300/60"><span className="w-2 h-2 rounded-sm bg-sky-400" />Work</span>
                    <span className="text-cosmic-cyan tabular-nums font-medium">{d.work.toFixed(1)}h <span className="text-navy-400/60">· {blockCount}</span></span>
                  </div>
                  <div className="mt-1.5 flex h-1.5 w-full rounded-full overflow-hidden bg-white/5">
                    <div className="h-full bg-gradient-to-r from-sky-400 to-cyan-500" style={{ width: '100%' }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Day labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1 pointer-events-none">
          {data.map((d, i) => {
            const show = data.length <= 14 || i % Math.ceil(data.length / 7) === 0;
            return show ? (
              <span key={i} className={`text-[9px] transition-colors duration-150 ${hoverIndex === i ? 'text-cosmic-cyan' : 'text-navy-300/30'}`}>{labels[i]}</span>
            ) : <span key={i} />;
          })}
        </div>
      </div>

      {/* Legend + totals */}
      <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-cosmic-cyan" />
            <span className="text-xs text-navy-200/60">Work hours</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-navy-200/60">{totalHours.toFixed(1)}h total</span>
        </div>
      </div>
    </div>
  );
}

// ─── Summary section ───

function SummarySection({ title, icon, color, children }: { title: string; icon: React.ReactNode; color: string; children: React.ReactNode }) {
  return (
    <div className="glass-card p-5 md:p-6 fade-in">
      <div className="flex items-center gap-2 mb-4">
        <span className={color}>{icon}</span>
        <h2 className="text-base font-semibold text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ─── Daily Habits ───

const HABIT_STYLES = [
  'border-cosmic-cyan/40 bg-cosmic-cyan/10 text-cosmic-cyan',
  'border-cosmic-gold/40 bg-cosmic-gold/10 text-cosmic-gold',
  'border-cosmic-rose/40 bg-cosmic-rose/10 text-cosmic-rose',
  'border-cosmic-violet/40 bg-cosmic-violet/10 text-cosmic-violet',
];

const MAX_HABITS = 6;

function DailyHabits() {
  const { t } = useTranslation();
  const { habits, addHabit, editHabit, removeHabit } = useStore();
  const [drafts, setDrafts] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const total = habits.length + drafts.length;
  const canAdd = total < MAX_HABITS;

  const setDraft = (idx: number, value: string) =>
    setDrafts((d) => d.map((x, i) => (i === idx ? value : x)));

  const saveDraft = async (idx: number) => {
    const text = drafts[idx].trim();
    if (!text) return;
    setDrafts((d) => d.filter((_, i) => i !== idx));
    await addHabit({ text });
  };

  const saveEdit = async (id: string) => {
    const text = editingText.trim();
    if (!text) return;
    await editHabit(id, { text });
    setEditingId(null);
  };

  return (
    <div className="glass-card p-5 md:p-6 fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-cosmic-cyan" />
          <h2 className="text-base font-semibold text-white">{t('habits.title')}</h2>
        </div>
        {canAdd && (
          <button
            onClick={() => setDrafts((d) => [...d, ''])}
            className="flex items-center gap-1 text-xs font-medium text-cosmic-cyan hover:text-white px-2.5 py-1.5 rounded-lg bg-cosmic-cyan/10 hover:bg-cosmic-cyan/20 transition-colors"
          >
            <Plus size={14} />
            {t('habits.add')}
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {habits.length === 0 && drafts.length === 0 && (
          <p className="col-span-full text-sm text-navy-200/40 text-center py-4">
            {t('habits.empty')}
          </p>
        )}
        {habits.map((habit, i) =>
          editingId === habit.id ? (
            <div key={habit.id} className="rounded-xl p-3 flex flex-col min-h-[110px] border border-dashed border-cosmic-gold/50 bg-cosmic-gold/10">
              <input
                value={editingText}
                autoFocus
                onChange={(e) => setEditingText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEdit(habit.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                placeholder={t('habits.placeholder')}
                className="bg-transparent flex-1 w-full text-center text-sm text-white outline-none placeholder:text-navy-300/40"
              />
              <div className="flex items-center justify-center gap-1.5 mt-2">
                <button
                  onClick={() => saveEdit(habit.id)}
                  disabled={!editingText.trim()}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-cosmic-cyan bg-cosmic-cyan/15 hover:bg-cosmic-cyan/25 disabled:opacity-40 transition-colors"
                >
                  <Check size={12} />
                  {t('habits.save')}
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-navy-200 bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X size={12} />
                  {t('habits.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <div key={habit.id} className={`rounded-xl p-3 flex flex-col items-center text-center min-h-[110px] border ${HABIT_STYLES[i % HABIT_STYLES.length]}`}>
              <p className="flex-1 w-full text-sm font-medium leading-snug break-words flex items-center justify-center">
                {habit.text}
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-2">
                <button
                  onClick={() => { setEditingId(habit.id); setEditingText(habit.text); }}
                  className="p-1.5 rounded-lg bg-white/10 text-navy-200 hover:bg-white/20 transition-colors"
                  title={t('habits.edit')}
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => removeHabit(habit.id)}
                  className="p-1.5 rounded-lg bg-white/10 text-navy-200 hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
                  title={t('habits.delete')}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          )
        )}
        {drafts.map((draft, idx) => (
          <div key={`draft-${idx}`} className="rounded-xl p-3 flex flex-col min-h-[110px] border border-dashed border-white/15 bg-white/5">
            <input
              value={draft}
              onChange={(e) => setDraft(idx, e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveDraft(idx); }}
              placeholder={t('habits.placeholder')}
              className="bg-transparent flex-1 w-full text-center text-sm text-white outline-none placeholder:text-navy-300/40"
            />
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <button
                onClick={() => saveDraft(idx)}
                disabled={!draft.trim()}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-cosmic-cyan bg-cosmic-cyan/15 hover:bg-cosmic-cyan/25 disabled:opacity-40 transition-colors"
              >
                <Check size={12} />
                {t('habits.save')}
              </button>
              <button
                onClick={() => setDrafts((d) => d.filter((_, i) => i !== idx))}
                className="p-1.5 rounded-lg bg-white/10 text-navy-200 hover:bg-white/20 transition-colors"
                title={t('habits.delete')}
              >
                <X size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tag Performance Chart (stacked per-day bar chart) ───

const TAG_COLORS: Record<string, string> = {
  workout: '#22c55e',
  language: '#3b82f6',
  work: '#06b6d4',
  university: '#a855f7',
  personal_business: '#f59e0b',
  research: '#f43f5e',
};

function TagPerformanceChart({ planner }: { planner: any[] }) {
  const now = useClock();
  const [range, setRange] = useState<'1w' | '2w' | '1m'>('1w');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const todayStr = useMemo(() => toLocalDateStr(now), [now]);

  const rangeInfo = useMemo(() => {
    const d = new Date(todayStr + 'T00:00:00');
    const start = new Date(d);
    if (range === '1w') start.setDate(start.getDate() - 6);
    else if (range === '2w') start.setDate(start.getDate() - 13);
    else start.setMonth(start.getMonth() - 1);
    return {
      startStr: toLocalDateStr(start),
      endStr: todayStr,
    };
  }, [range, todayStr]);

  const chartData = useMemo(() => {
    const days: Array<{
      dateStr: string;
      label: string;
      tagHours: Record<string, number>;
      total: number;
    }> = [];

    const cursor = new Date(rangeInfo.startStr + 'T00:00:00');
    const endDate = new Date(rangeInfo.endStr + 'T23:59:59');

    while (cursor <= endDate) {
      const ds = toLocalDateStr(cursor);
      const label = cursor.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });

      const dayBlocks = planner.filter((e: any) => e.date === ds);
      const tagHours: Record<string, number> = {};
      let total = 0;

      TIME_BLOCK_TAGS.forEach(t => {
        let hours = 0;
        dayBlocks.forEach((e: any) => {
          (e.time_blocks || []).forEach((tb: any) => {
            if (tb.tag === t.value && tb.done && tb.is_work !== false && tb.time && tb.completed_time) {
              const [sh, sm] = tb.time.split(':').map(Number);
              const [eh, em] = tb.completed_time.split(':').map(Number);
              hours += Math.max(0, ((eh * 60 + em) - (sh * 60 + sm)) / 60);
            }
          });
        });
        tagHours[t.value] = hours;
        total += hours;
      });

      days.push({ dateStr: ds, label, tagHours, total });
      cursor.setDate(cursor.getDate() + 1);
    }

    return days;
  }, [rangeInfo, planner]);

  const maxTotal = Math.max(...chartData.map(d => d.total), 0.5);
  const activeTags = TIME_BLOCK_TAGS.filter(t => chartData.some(d => (d.tagHours[t.value] || 0) > 0));

  const barW = 36;
  const gap = 8;
  const chartH = 170;
  const padTop = 6;
  const padBottom = 22;
  const svgW = chartData.length * (barW + gap) + gap;

  return (
    <div className="glass-card p-5 md:p-6 fade-in">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-purple-400" />
          <h2 className="text-base font-semibold text-white">Tag Performance</h2>
        </div>
        <div className="flex items-center gap-2">
          {(['1w', '2w', '1m'] as const).map(p => (
            <button key={p} onClick={() => { setRange(p); setHoverIndex(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                range === p ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-navy-200/60 hover:text-white hover:bg-white/10'
              }`}>
              {p === '1w' ? 'Week' : p === '2w' ? '2 Weeks' : 'Month'}
            </button>
          ))}
        </div>
      </div>

      {activeTags.length > 0 ? (
        <div className="relative">
          <div className="overflow-x-auto scrollbar-thin pb-1">
            <svg style={{ width: svgW, minWidth: svgW }} viewBox={`0 0 ${svgW} ${chartH + padBottom}`}>
              <defs>
                {activeTags.map(t => (
                  <linearGradient key={t.value} id={`tagGrad_${t.value}`} x1={0} y1={0} x2={0} y2={1}>
                    <stop offset="0%" stopColor={TAG_COLORS[t.value]} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={TAG_COLORS[t.value]} stopOpacity={0.55} />
                  </linearGradient>
                ))}
              </defs>

              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map(frac => {
                const y = padTop + (1 - frac) * chartH;
                return (
                  <line key={frac} x1={0} y1={y} x2={svgW} y2={y}
                    stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
                );
              })}

              {/* Y-axis max label */}
              <text x={2} y={padTop - 2} fill="rgba(148,163,184,0.25)" fontSize={7}>
                {maxTotal.toFixed(1)}h
              </text>

              {/* Stacked bars */}
              {chartData.map((day, i) => {
                const x = gap + i * (barW + gap);
                const isHovered = hoverIndex === i;
                let accH = 0;

                return (
                  <g key={i}
                    onMouseEnter={() => setHoverIndex(i)}
                    onMouseLeave={() => setHoverIndex(null)}
                    className="cursor-pointer">

                    {/* Hit area */}
                    <rect x={x - 4} y={padTop} width={barW + 8} height={chartH} fill="transparent" />

                    {/* Segments */}
                    {activeTags.map(t => {
                      const segH = maxTotal > 0 ? ((day.tagHours[t.value] || 0) / maxTotal) * chartH : 0;
                      if (segH <= 0) return null;
                      const y = padTop + chartH - accH - segH;
                      accH += segH;
                      return (
                        <rect key={t.value} x={x} y={y} width={barW} height={Math.max(segH, 1.5)} rx={2}
                          fill={`url(#tagGrad_${t.value})`}
                          opacity={isHovered ? 1 : 0.8}
                          className="transition-opacity duration-150" />
                      );
                    })}

                    {/* Day label */}
                    <text x={x + barW / 2} y={chartH + padTop + 16} textAnchor="middle"
                      fill={isHovered ? 'rgba(255,255,255,0.8)' : 'rgba(148,163,184,0.3)'}
                      fontSize={8} className="transition-colors duration-150">
                      {day.label}
                    </text>

                    {/* Hover guide line */}
                    {isHovered && (
                      <line x1={x + barW / 2} y1={padTop} x2={x + barW / 2} y2={chartH + padTop}
                        stroke="rgba(255,255,255,0.06)" strokeWidth={1} strokeDasharray="3,3" />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Tooltip */}
          {hoverIndex !== null && chartData[hoverIndex] && (
            <div className="bg-gray-900/95 backdrop-blur-sm text-white text-xs px-4 py-3 rounded-xl shadow-xl border border-white/10 min-w-[200px] mt-2">
              <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/5">
                <span className="font-semibold text-purple-400 text-xs">{chartData[hoverIndex].dateStr}</span>
                <span className="text-white font-bold tabular-nums">{chartData[hoverIndex].total.toFixed(1)}h</span>
              </div>
              <div className="space-y-1">
                {activeTags.filter(t => (chartData[hoverIndex].tagHours[t.value] || 0) > 0).map(t => (
                  <div key={t.value} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: TAG_COLORS[t.value] }} />
                      <span className="text-navy-200/80">{t.label}</span>
                    </div>
                    <span className="text-white font-medium tabular-nums">
                      {chartData[hoverIndex].tagHours[t.value].toFixed(1)}h
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legend */}
          {hoverIndex === null && (
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-white/5">
              {activeTags.map(t => (
                <div key={t.value} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: TAG_COLORS[t.value] }} />
                  <span className="text-xs text-navy-200/60">{t.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="h-44 flex items-center justify-center text-sm text-navy-200/40">
          No tag data yet. Add tags to your planner tasks.
        </div>
      )}
    </div>
  );
}

// ─── Main dashboard ───

export default function Dashboard() {
  const { t } = useTranslation();
  const {
    deadlines, planner,
    fetchAll,
  } = useStore();
  const now = useClock();

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 30000);
    return () => clearInterval(id);
  }, [fetchAll]);

  const todayStr = toLocalDateStr(now);

  const total = deadlines.length;
  const overdue = deadlines.filter((d) => d.status === 'overdue' || (new Date(d.due_date) < now && d.status !== 'completed'));
  const dueSoon = deadlines.filter((d) => {
    const diff = new Date(d.due_date).getTime() - now.getTime();
    return diff > 0 && diff <= 3 * 86400000 && d.status !== 'completed';
  });
  const todayCompleted = deadlines.filter((d) => d.status === 'completed' && d.completed_at?.startsWith(todayStr)).length;
  const todayBlocksDone = planner
    .filter((e) => e.date === todayStr)
    .reduce((sum, e) => sum + (e.time_blocks || []).filter((tb: any) => tb.done).length, 0);
  const todayDone = todayCompleted + todayBlocksDone;

  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStr = toLocalDateStr(weekStart);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = toLocalDateStr(weekEnd);

  const weekBlocks = planner
    .filter((e) => e.date >= weekStr && e.date <= weekEndStr)
    .flatMap((e) => (e.time_blocks || []) as any[]);
  const weekDeadlines = deadlines.filter((d) => {
    const due = toLocalDateStr(new Date(d.due_date));
    return due >= weekStr && due <= weekEndStr;
  });
  const weekTotal = weekBlocks.length + weekDeadlines.length;
  const weekDone =
    weekBlocks.filter((b) => b.done).length +
    weekDeadlines.filter((d) => d.status === 'completed').length;
  const weeklyPct = weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0;

  const upcoming = deadlines.filter((d) => d.status !== 'completed')
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).slice(0, 5);

  const weekEntries = planner.filter((e) => e.date >= weekStr && e.date <= weekEndStr).slice(0, 5);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8">
      {/* Greeting */}
      <div className="fade-in">
        <h1 className="text-2xl md:text-3xl font-display font-semibold text-white">
          {t('dashboard.greeting', {
            timeOfDay: now.getHours() < 12 ? t('dashboard.morning') : now.getHours() < 18 ? t('dashboard.afternoon') : t('dashboard.evening'),
          })}
        </h1>
        <p className="text-sm text-navy-200/40 mt-1">{t('app.tagline')}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<AlertTriangle size={20} />} label={t('dashboard.overdue')} value={overdue.length} color="bg-cosmic-rose/20 text-cosmic-rose" pct={total > 0 ? Math.round((overdue.length / total) * 100) : 0} />
        <StatCard icon={<Clock size={20} />} label={t('dashboard.dueSoon')} value={dueSoon.length} color="bg-cosmic-gold/20 text-cosmic-gold" />
        <StatCard icon={<Target size={20} />} label="Completed Today" value={todayDone} color="bg-green-500/20 text-green-400" />
        <StatCard icon={<TrendingUp size={20} />} label={t('dashboard.weeklyProgress')} value={`${weeklyPct}%`} color="bg-cosmic-cyan/20 text-cosmic-cyan" pct={weeklyPct} />
      </div>

      {/* Daily Habits */}
      <DailyHabits />

      {/* Big chart */}
      <ChartSection planner={planner} />

      {/* Tag Performance Charts */}
      <TagPerformanceChart planner={planner} />

      {/* Summary sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upcoming deadlines */}
        <SummarySection title={t('dashboard.upcomingDeadlines')} icon={<Clock size={18} />} color="text-cosmic-cyan">
          <div className="space-y-3">
            {upcoming.map((d) => <DeadlineCard key={d.id} deadline={d} />)}
            {upcoming.length === 0 && <p className="text-sm text-navy-200/40 py-6 text-center">{t('dashboard.noDeadlines')}</p>}
          </div>
        </SummarySection>

        {/* This week's plan */}
        <SummarySection title={t('dashboard.weeksPlan')} icon={<Calendar size={18} />} color="text-cosmic-gold">
          <div className="space-y-3">
            {weekEntries.map((e) => {
              const blocks = (e as any).time_blocks || [];
              const done = blocks.filter((t: any) => t.done).length;
              const tpct = blocks.length > 0 ? Math.round((done / blocks.length) * 100) : 0;
              return (
                <div key={e.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white truncate">
                      {new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-xs text-navy-300/40 mt-0.5">{blocks.length} blocks · {done} done</p>
                  </div>
                  <div className="w-24 ml-3"><ProgressBar pct={tpct} color="bg-gradient-to-r from-cosmic-cyan to-cosmic-gold" /></div>
                </div>
              );
            })}
            {weekEntries.length === 0 && <p className="text-sm text-navy-200/40 py-6 text-center">{t('dashboard.planYourWeek')}</p>}
          </div>
        </SummarySection>
      </div>
    </div>
  );
}
