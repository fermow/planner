import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, ChevronLeft, ChevronRight, Check, Clock, Trophy, Dumbbell, Zap, Calendar,
} from 'lucide-react';
import { useTranslation } from '../i18n/t';
import { useStore } from '../store/useStore';
import { formatDateLong, formatDateMonth } from '../utils/formatTime';
import type { SportEntry, SportExercise } from '../types';

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const today = new Date();
const todayStr = today.toISOString().split('T')[0];
const todayDayName = DAYS[today.getDay()];

const INTENSITY_COLORS: Record<string, string> = {
  low: 'bg-green-500/20 text-green-400',
  medium: 'bg-cosmic-gold/20 text-cosmic-gold',
  high: 'bg-cosmic-rose/20 text-cosmic-rose',
};

type ViewMode = 'log' | 'plan';

export default function SportsPage() {
  const { t } = useTranslation();
  const { sports, fetchSports, addSportEntry, editSportEntry } = useStore();
  const [weekOffset, setWeekOffset] = useState(0);
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [exercises, setExercises] = useState<SportExercise[]>([]);
  const [notes, setNotes] = useState('');
  const [editingEntry, setEditingEntry] = useState<SportEntry | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('log');

  useEffect(() => {
    fetchSports();
  }, [fetchSports]);

  const getWeekDays = useCallback(() => {
    const now = new Date();
    now.setDate(now.getDate() + weekOffset * 7);
    const start = new Date(now);
    start.setDate(start.getDate() - start.getDay());
    return DAYS.map((_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekOffset]);

  const weekDays = getWeekDays();

  const getEntryForDate = (date: string) => sports.find((e) => e.date === date);

  function totalDuration(exercises: SportExercise[]): number {
    return exercises.filter((e) => e.done).reduce((sum, e) => sum + e.duration, 0);
  }

  function openModal(date: string) {
    const entry = getEntryForDate(date);
    setEditingEntry(entry || null);
    setModalDate(date);
    setExercises(entry?.exercises || []);
    setNotes(entry?.notes || '');
    setViewMode('log');
  }

  function closeModal() {
    setModalDate(null);
    setEditingEntry(null);
    setExercises([]);
    setNotes('');
  }

  function addExercise() {
    setExercises((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: '',
        duration: 30,
        intensity: 'medium',
        done: false,
        scheduled_time: '',
      },
    ]);
  }

  function updateExercise(id: string, patch: Partial<SportExercise>) {
    setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function removeExercise(id: string) {
    setExercises((prev) => prev.filter((e) => e.id !== id));
  }

  function toggleDone(id: string) {
    setExercises((prev) =>
      prev.map((e) => (e.id === id ? { ...e, done: !e.done } : e))
    );
  }

  async function saveDay() {
    if (!modalDate) return;
    const payload = {
      date: modalDate,
      exercises,
      total_duration: totalDuration(exercises),
      notes,
    };
    if (editingEntry) {
      await editSportEntry(editingEntry.id, payload);
    } else {
      await addSportEntry(payload);
    }
    closeModal();
  }

  // ─── Chart data ───
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthDays: { date: string; dayNum: number; entry?: SportEntry; hasActivity: boolean; duration: number }[] = [];
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(now.getFullYear(), now.getMonth(), d);
    const dateStr = date.toISOString().split('T')[0];
    const entry = getEntryForDate(dateStr);
    const doneExercises = entry?.exercises.filter((e) => e.done) || [];
    monthDays.push({
      date: dateStr,
      dayNum: d,
      entry,
      hasActivity: doneExercises.length > 0,
      duration: doneExercises.reduce((s, e) => s + e.duration, 0),
    });
  }

  const maxDuration = Math.max(...monthDays.map((d) => d.duration), 1);
  const chartW = Math.max(daysInMonth * 14, 300);
  const chartH = 160;
  const padL = 30;
  const padR = 10;
  const padT = 10;
  const padB = 25;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  function xPos(i: number): number {
    return padL + (i / (daysInMonth - 1 || 1)) * plotW;
  }

  function yPos(val: number): number {
    return padT + plotH - (val / maxDuration) * plotH;
  }

  const linePoints = monthDays
    .map((d, i) => `${xPos(i)},${yPos(d.duration)}`)
    .join(' ');

  const areaPoints = `${padL},${padT + plotH} ${linePoints} ${xPos(daysInMonth - 1)},${padT + plotH}`;

  // ─── Plan data (exercises with scheduled_time) ───
  const plannedExercises = sports
    .flatMap((entry) =>
      entry.exercises
        .filter((ex) => ex.scheduled_time && !ex.done)
        .map((ex) => ({ ...ex, date: entry.date }))
    );

  const weekPlanned = weekDays
    .map((day) => {
      const dateStr = day.toISOString().split('T')[0];
      return {
        date: dateStr,
        day,
        exercises: plannedExercises.filter((ex) => ex.date === dateStr),
      };
    })
    .filter((d) => d.exercises.length > 0);

  const todayExercises = (getEntryForDate(todayStr)?.exercises || []).filter((e) => e.name.trim());

  function sortExercises(exs: SportExercise[]): SportExercise[] {
    return [...exs].sort((a, b) => {
      if (a.scheduled_time && b.scheduled_time) return a.scheduled_time.localeCompare(b.scheduled_time);
      if (a.scheduled_time) return -1;
      if (b.scheduled_time) return 1;
      return 0;
    });
  }

  const modalPlanned = exercises.filter((e) => e.scheduled_time && !e.done);
  const modalLogged = exercises.filter((e) => !e.scheduled_time || e.done);

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center md:text-left"
      >
        <h2 className="text-xl md:text-2xl font-display text-white flex items-center gap-2">
          <Trophy size={22} className="text-cosmic-gold" />
          {t('sports.title')}
        </h2>
        <p className="text-sm text-navy-200/60">
          {formatDateLong(today)}
        </p>
      </motion.div>

      {/* ─── Line Chart ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4 md:p-5"
      >
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Zap size={14} className="text-cosmic-gold" />
          {formatDateMonth(now)} {t('sports.dailyExercise')}
        </h3>
        <div className="overflow-x-auto -mx-3 md:mx-0 pb-2 px-3 md:px-0">
          <svg width={chartW} height={chartH + 10} viewBox={`0 0 ${chartW} ${chartH + 10}`} className="min-w-[300px]">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = yPos(maxDuration * ratio);
              return (
                <g key={ratio}>
                  <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
                  <text x={padL - 4} y={y + 3} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize={8}>
                    {Math.round(maxDuration * (1 - ratio))}
                  </text>
                </g>
              );
            })}

            {/* Area fill */}
            <polygon points={areaPoints} fill="url(#gradFill)" opacity={0.3} />

            {/* Gradient def */}
            <defs>
              <linearGradient id="gradFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#40e0d0" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#40e0d0" stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* Line */}
            <polyline
              points={linePoints}
              fill="none"
              stroke="#40e0d0"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Dots + day labels */}
            {monthDays.map((day, i) => {
              const cx = xPos(i);
              const cy = yPos(day.duration);
              const isToday = day.date === todayStr;
              return (
                <g key={day.date}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={day.hasActivity ? 4 : 2}
                    fill={day.hasActivity ? '#40e0d0' : 'rgba(255,255,255,0.15)'}
                    stroke={isToday ? '#22d3ee' : 'none'}
                    strokeWidth={isToday ? 2 : 0}
                  />
                  <text
                    x={cx}
                    y={chartH - 2}
                    textAnchor="middle"
                    fill={isToday ? '#22d3ee' : 'rgba(255,255,255,0.25)'}
                    fontSize={8}
                  >
                    {day.dayNum}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </motion.div>

      {/* ─── View Toggle ─── */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setViewMode('log')}
          className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
            viewMode === 'log'
              ? 'bg-cosmic-cyan/20 text-cosmic-cyan'
              : 'text-navy-200/60 hover:text-white'
          }`}
        >
          <Dumbbell size={14} className="inline mr-1" />
          {t('sports.log')}
        </button>
        <button
          onClick={() => setViewMode('plan')}
          className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
            viewMode === 'plan'
              ? 'bg-cosmic-gold/20 text-cosmic-gold'
              : 'text-navy-200/60 hover:text-white'
          }`}
        >
          <Calendar size={14} className="inline mr-1" />
          {t('sports.plan')}
        </button>
      </div>

      {/* ─── Week Navigation ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setWeekOffset(0)}
            className="text-xs text-navy-200/60 hover:text-white transition-colors"
          >
            {t('sports.thisWeek')}
          </button>
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-navy-200 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-navy-200 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <span className="text-sm text-navy-200/60">
          {weekDays[0].toLocaleDateString()} — {weekDays[6].toLocaleDateString()}
        </span>
      </div>

      {/* ─── Weekly Grid ─── */}
      <div className="overflow-x-auto -mx-3 md:mx-0 pb-2 scrollbar-thin">
        <div className="grid grid-cols-7 gap-1.5 md:gap-3 min-w-[630px] md:min-w-0 px-3 md:px-0">
          {weekDays.map((day) => {
            const dateStr = day.toISOString().split('T')[0];
            const entry = getEntryForDate(dateStr);
            const isToday = dateStr === todayStr;
            const doneCount = entry?.exercises.filter((e) => e.done).length || 0;
            const totalCount = entry?.exercises.length || 0;
            const planCount = entry?.exercises.filter((e) => e.scheduled_time && !e.done).length || 0;

            return (
              <motion.button
                key={dateStr}
                whileTap={{ scale: 0.97 }}
                onClick={() => openModal(dateStr)}
                className={`glass-card p-1.5 md:p-3 min-h-[100px] md:min-h-[190px] text-left transition-all ${
                  isToday ? 'border-cosmic-cyan/40 ring-1 ring-cosmic-cyan/20' : ''
                } ${doneCount > 0 ? 'border-green-500/20' : ''} ${planCount > 0 ? 'border-cosmic-gold/20' : ''}`}
              >
                <div className="flex items-center justify-between mb-1 md:mb-2">
                  <span className="text-[9px] md:text-xs text-navy-200/50 uppercase tracking-wider hidden md:block">
                    {t(`planner.days.${DAYS[day.getDay()]}`).slice(0, 3)}
                  </span>
                  <span
                    className={`text-xs md:text-base font-semibold ${
                      isToday ? 'text-cosmic-cyan' : 'text-white'
                    }`}
                  >
                    {day.getDate()}
                  </span>
                </div>

                {entry ? (
                  <div className="space-y-0.5 md:space-y-1">
                    {viewMode === 'plan' ? (
                      /* Plan view: show planned exercises with scheduled time */
                      sortExercises(entry.exercises.filter((e) => e.scheduled_time && !e.done)).slice(0, 3).map((ex) => (
                        <div key={ex.id} className="flex items-center gap-1 text-[9px] md:text-xs">
                          <Clock size={8} className="text-cosmic-gold shrink-0" />
                          {ex.scheduled_time && (
                            <span className="text-cosmic-gold/60 w-5 md:w-8 shrink-0 tabular-nums leading-none">
                              {ex.scheduled_time}
                            </span>
                          )}
                          <span className="truncate leading-none text-navy-100">{ex.name}</span>
                        </div>
                      ))
                    ) : (
                      /* Log view: show exercises with done status */
                      sortExercises(entry.exercises.filter((e) => e.name.trim())).slice(0, 3).map((ex) => (
                        <div
                          key={ex.id}
                          className={`flex items-center gap-1 text-[9px] md:text-xs ${ex.done ? 'opacity-50' : ''}`}
                        >
                          <span className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full shrink-0 ${
                            ex.done ? 'bg-green-400' : ex.scheduled_time ? 'bg-cosmic-gold' : 'bg-cosmic-gold'
                          }`} />
                          {ex.scheduled_time && (
                            <span className="text-navy-300/40 w-5 md:w-8 shrink-0 tabular-nums leading-none">
                              {ex.scheduled_time}
                            </span>
                          )}
                          <span className={`truncate leading-none ${ex.done ? 'line-through text-navy-300/30' : 'text-navy-100'}`}>
                            {ex.name}
                          </span>
                        </div>
                      ))
                    )}
                    {entry.exercises.filter((e) => e.name.trim()).length > 3 && (
                      <p className="text-[8px] md:text-[10px] text-navy-300/40">
                        +{entry.exercises.filter((e) => e.name.trim()).length - 3} more
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-1">
                      {planCount > 0 && (
                        <span className="text-[8px] md:text-[10px] px-1 py-0.5 rounded bg-cosmic-gold/20 text-cosmic-gold">
                          {t('sports.planned', { count: planCount })}
                        </span>
                      )}
                      {doneCount > 0 && (
                        <span className={`text-[8px] md:text-[10px] px-1 py-0.5 rounded ${
                          doneCount === totalCount && totalCount > 0
                            ? 'bg-green-500/20 text-green-400'
                            : 'text-navy-300/40'
                        }`}>
                          {doneCount}/{totalCount}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Plus size={12} className="text-navy-300/20" />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ─── Today's exercises ─── */}
      <div className="glass-card p-3 md:p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Dumbbell size={14} className="text-cosmic-gold shrink-0" />
          <span className="truncate">{t('sports.todayWorkout', { day: t(`planner.days.${todayDayName}`) })}</span>
        </h3>
        {todayExercises.length > 0 ? (
          <div className="overflow-x-auto -mx-3 md:mx-0 px-3 md:px-0">
            <table className="w-full text-xs md:text-sm min-w-[400px] md:min-w-0">
              <thead>
                <tr className="text-left text-[9px] md:text-[10px] uppercase tracking-wider text-navy-300/50 border-b border-white/5">
                  <th className="pb-2 pr-2 md:pr-3 w-6 md:w-8">{t('sports.done')}</th>
                  <th className="pb-2 pr-2 md:pr-3">{t('sports.exercise')}</th>
                  <th className="pb-2 pr-2 md:pr-3">{t('sports.duration')}</th>
                  <th className="pb-2 pr-2 md:pr-3">{t('sports.intensity')}</th>
                  {todayExercises.some((e) => e.scheduled_time) && <th className="pb-2 pr-2 md:pr-3">{t('sports.scheduled')}</th>}
                </tr>
              </thead>
              <tbody>
                {todayExercises.map((ex) => (
                  <tr key={ex.id} className={`border-b border-white/5 ${ex.done ? 'opacity-50' : ''}`}>
                    <td className="py-2 pr-2 md:py-2.5 md:pr-3">
                      <span className={`inline-flex items-center justify-center w-4 h-4 md:w-5 md:h-5 rounded-full ${
                        ex.done ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-navy-300/40'
                      }`}>
                        {ex.done ? <Check size={10} /> : <span className="w-1.5 h-1.5 rounded-full bg-navy-300/30" />}
                      </span>
                    </td>
                    <td className="py-2 pr-2 md:py-2.5 md:pr-3 text-navy-100 font-medium">{ex.name}</td>
                    <td className="py-2 pr-2 md:py-2.5 md:pr-3 text-navy-200/60">{ex.duration} {t('sports.minutes')}</td>
                    <td className="py-2 pr-2 md:py-2.5 md:pr-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${INTENSITY_COLORS[ex.intensity] || 'bg-white/5 text-navy-300'}`}>
                        {t(`sports.intensity${ex.intensity.charAt(0).toUpperCase() + ex.intensity.slice(1)}`)}
                      </span>
                    </td>
                    {todayExercises.some((e) => e.scheduled_time) && (
                      <td className="py-2 pr-2 md:py-2.5 md:pr-3 text-navy-200/60 tabular-nums">
                        {ex.scheduled_time || '—'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-navy-300/50 text-center py-6">
            {t('sports.noExercises')}
          </p>
        )}
      </div>

      {/* ─── Day Modal ─── */}
      <AnimatePresence>
        {modalDate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] pb-8 bg-black/60 backdrop-blur-sm overflow-y-auto"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card p-4 md:p-6 w-full max-w-2xl mx-0 md:mx-4 my-auto rounded-none md:rounded-2xl min-h-screen md:min-h-0"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-xl font-display text-white flex items-center gap-2">
                    <Trophy size={18} className="text-cosmic-gold" />
                    {modalDate === todayStr ? t('sports.today') : t(`planner.days.${DAYS[new Date(modalDate).getDay()]}`)}
                  </h3>
                  <p className="text-sm text-navy-200/60">
                    {new Date(modalDate).toLocaleDateString('en-US', {
                      weekday: 'long', month: 'long', day: 'numeric',
                    })}
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 rounded-lg hover:bg-white/5 text-navy-300 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal view toggle */}
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setViewMode('log')}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
                    viewMode === 'log'
                      ? 'bg-cosmic-cyan/20 text-cosmic-cyan'
                      : 'text-navy-200/60 hover:text-white'
                  }`}
                >
                  <Dumbbell size={12} className="inline mr-1" />
                  {t('sports.log')}
                </button>
                <button
                  onClick={() => setViewMode('plan')}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
                    viewMode === 'plan'
                      ? 'bg-cosmic-gold/20 text-cosmic-gold'
                      : 'text-navy-200/60 hover:text-white'
                  }`}
                >
                  <Calendar size={12} className="inline mr-1" />
                  {t('sports.plan')}
                </button>
              </div>

              <div className="space-y-5">
                {/* Exercises */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-navy-200/60 uppercase tracking-wider">
                      {viewMode === 'plan' ? t('sports.plannedExercises') : t('sports.exercises')}
                    </label>
                    <button
                      onClick={addExercise}
                      className="text-xs flex items-center gap-1 text-cosmic-cyan hover:text-white transition-colors"
                    >
                      <Plus size={12} /> {viewMode === 'plan' ? t('sports.addPlanned') : t('sports.addExercise')}
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {exercises.length === 0 && (
                      <p className="text-sm text-navy-300/40 text-center py-4">
                        {viewMode === 'plan'
                          ? t('sports.noPlanned')
                          : t('sports.noLogged')}
                      </p>
                    )}
                    {exercises
                      .filter((ex) => viewMode === 'plan' ? (ex.scheduled_time && !ex.done) || (!ex.scheduled_time && !ex.done) : true)
                      .map((ex) => (
                      <motion.div
                        key={ex.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`glass-card p-3 space-y-2 ${ex.done ? 'opacity-60' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          {/* Done checkbox (only in log mode) */}
                          {viewMode === 'log' && (
                            <button
                              onClick={() => toggleDone(ex.id)}
                              className={`shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                                ex.done
                                  ? 'bg-green-500 border-green-500 text-white'
                                  : 'border-navy-400 hover:border-cosmic-cyan'
                              }`}
                            >
                              {ex.done && <Check size={11} />}
                            </button>
                          )}

                          {/* Planned icon (plan mode) */}
                          {viewMode === 'plan' && (
                            <Clock size={14} className="text-cosmic-gold shrink-0" />
                          )}

                          {/* Name */}
                          <input
                            type="text"
                            value={ex.name}
                            onChange={(e) => updateExercise(ex.id, { name: e.target.value })}
                            placeholder={viewMode === 'plan' ? t('sports.plannedPlaceholder') : t('sports.exercisePlaceholder')}
                            className={`flex-1 bg-transparent border-none outline-none text-sm ${
                              ex.done ? 'line-through text-navy-300/40' : 'text-white'
                            }`}
                          />

                          {/* Delete */}
                          <button
                            onClick={() => removeExercise(ex.id)}
                            className="text-navy-300/40 hover:text-cosmic-rose transition-colors shrink-0"
                          >
                            <X size={14} />
                          </button>
                        </div>

                        {/* Duration + Intensity + Scheduled time */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pl-7">
                          {/* Duration */}
                          <div className="flex items-center gap-2">
                            <Clock size={12} className="text-navy-200/50" />
                            <input
                              type="number"
                              min={0}
                              value={ex.duration}
                              onChange={(e) => updateExercise(ex.id, { duration: parseInt(e.target.value) || 0 })}
                              className="bg-transparent border-none outline-none text-xs text-navy-200/70 w-16"
                            />
                            <span className="text-[10px] text-navy-300/40">{t('sports.minutes')}</span>
                          </div>

                          {/* Intensity */}
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-navy-300/40 uppercase">{t('sports.intensity')}</span>
                            <select
                              value={ex.intensity}
                              onChange={(e) => updateExercise(ex.id, { intensity: e.target.value })}
                              className="bg-transparent border border-white/10 rounded text-xs text-navy-200/70 px-1 py-0.5"
                            >
                              <option value="low">{t('sports.intensityLow')}</option>
                              <option value="medium">{t('sports.intensityMedium')}</option>
                              <option value="high">{t('sports.intensityHigh')}</option>
                            </select>
                          </div>

                          {/* Scheduled time */}
                          <div className="flex items-center gap-2">
                            <Calendar size={12} className="text-navy-200/50" />
                            <input
                              type="time"
                              value={ex.scheduled_time || ''}
                              onChange={(e) => updateExercise(ex.id, { scheduled_time: e.target.value || '' })}
                              className="bg-transparent border border-white/10 rounded text-xs text-navy-200/70 px-1 py-0.5 w-[70px]"
                            />
                            <span className="text-[10px] text-navy-300/40">{t('sports.scheduledTime')}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs text-navy-200/60 mb-1.5 block uppercase tracking-wider">
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="celestial-input min-h-[60px] resize-none"
                    placeholder={t('sports.workoutNotesPlaceholder')}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-5 pt-4 border-t border-white/5">
                <button
                  onClick={saveDay}
                  className="celestial-btn celestial-btn-primary flex-1"
                >
                  {t('sports.saveWorkout')}
                </button>
                <button
                  onClick={closeModal}
                  className="celestial-btn celestial-btn-secondary"
                >
                  {t('sports.cancel')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
