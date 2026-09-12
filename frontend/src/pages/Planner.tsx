import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, ChevronLeft, ChevronRight, Check, Clock, FileText, Briefcase, Tag,
} from 'lucide-react';
import { formatDateShort, formatTime, toLocalDateStr } from '../utils/formatTime';
import { useStore } from '../store/useStore';
import type { PlannerEntry, TimeBlock, TimeBlockTag } from '../types';
import { TIME_BLOCK_TAGS } from '../types';
import { useTranslation } from '../i18n/t';
import { useMusicPlayer } from '../components/MusicPlayerProvider';
import { TimePicker } from '../components/TimePicker';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const today = new Date();
const todayStr = toLocalDateStr(today);
const todayDayName = DAYS[today.getDay()];

function formatTimeDisplay(date: Date): string {
  return formatTime(date);
}

export default function PlannerPage() {
  const { t } = useTranslation();
  const { planner, fetchPlanner, addPlannerEntry, editPlannerEntry } = useStore();
  const { currentTrack } = useMusicPlayer();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [dayNote, setDayNote] = useState('');
  const [dayMood, setDayMood] = useState('neutral');
  const [tasks, setTasks] = useState<TimeBlock[]>([]);
  const [editingEntry, setEditingEntry] = useState<PlannerEntry | null>(null);

  useEffect(() => {
    fetchPlanner();
  }, [fetchPlanner]);

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

  const getEntryForDate = (date: string) => planner.find((e) => e.date === date);

  function sortTimeBlocks(blocks: TimeBlock[]): TimeBlock[] {
    return [...blocks].sort((a, b) => {
      if (!a.time && !b.time) return 0;
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    });
  }

  function openModal(date: string) {
    const entry = getEntryForDate(date);
    setEditingEntry(entry || null);
    setModalDate(date);
    setDayNote(entry?.notes || '');
    setDayMood(entry?.mood || 'neutral');
    setTasks(entry?.time_blocks || []);
  }

  function closeModal() {
    setModalDate(null);
    setEditingEntry(null);
    setDayNote('');
    setDayMood('neutral');
    setTasks([]);
  }

  function addTask() {
    const now = new Date();
    setTasks((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: '',
        description: '',
        time: formatTimeDisplay(now),
        completed_time: null,
        done: false,
        is_work: true,
      },
    ]);
  }

  function updateTask(id: string, patch: Partial<TimeBlock>) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function removeTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function toggleDone(id: string) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const done = !t.done;
        return {
          ...t,
          done,
          completed_time: done ? formatTimeDisplay(new Date()) : null,
        };
      }),
    );
  }

  async function saveDay() {
    if (!modalDate) return;
    const payload = {
      date: modalDate,
      day: DAYS[new Date(modalDate).getDay()],
      mood: dayMood,
      notes: dayNote,
      time_blocks: tasks,
    };
    if (editingEntry) {
      await editPlannerEntry(editingEntry.id, payload);
    } else {
      await addPlannerEntry(payload);
    }
    closeModal();
  }

  const selectedDateObj = new Date(`${selectedDate}T12:00:00`);
  const selectedTasks = sortTimeBlocks(
    (getEntryForDate(selectedDate)?.time_blocks || []).filter((t) => t.title.trim())
  );

  function changeWeek(direction: number) {
    setWeekOffset((offset) => offset + direction);
    setSelectedDate((date) => {
      const nextDate = new Date(`${date}T12:00:00`);
      nextDate.setDate(nextDate.getDate() + direction * 7);
      return toLocalDateStr(nextDate);
    });
  }

  function goToToday() {
    setWeekOffset(0);
    setSelectedDate(todayStr);
  }

  return (
    <div className="space-y-6 w-full">
      {/* Today indicator */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center md:text-left"
      >
        <h2 className="text-xl md:text-2xl font-display text-white">
          {t(`planner.days.${DAYS[selectedDateObj.getDay()].toLowerCase()}`)}
        </h2>
        <p className="text-sm text-navy-200/60">
          {formatDateShort(selectedDateObj)}
        </p>
      </motion.div>

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={goToToday}
            className="text-xs text-navy-200/60 hover:text-white transition-colors"
          >
            {t('planner.today')}
          </button>
          <button
            onClick={() => changeWeek(-1)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-navy-200 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => changeWeek(1)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-navy-200 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <span className="text-sm text-navy-200/60">
          {weekDays[0].toLocaleDateString()} — {weekDays[6].toLocaleDateString()}
        </span>
      </div>

      {/* Weekly grid */}
      <div className="overflow-x-auto -mx-3 md:mx-0 pb-2 scrollbar-thin">
        <div className="grid grid-cols-7 gap-1.5 md:gap-3 min-w-[630px] md:min-w-0 px-3 md:px-0">
          {weekDays.map((day) => {
            const dateStr = toLocalDateStr(day);
            const entry = getEntryForDate(dateStr);
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;

            return (
              <motion.button
                key={dateStr}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedDate(dateStr)}
                aria-pressed={isSelected}
                className={`glass-card p-1.5 md:p-3 min-h-[100px] md:min-h-[190px] text-left transition-all ${
                  isSelected
                    ? 'border-cosmic-cyan/60 ring-1 ring-cosmic-cyan/30 bg-cosmic-cyan/5'
                    : isToday ? 'border-cosmic-cyan/25' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1 md:mb-2">
                  <span className="text-[9px] md:text-xs text-navy-200/50 uppercase tracking-wider hidden md:block">
                    {t(`planner.days.${DAYS[day.getDay()].toLowerCase()}`).slice(0, 3)}
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
                    {sortTimeBlocks(entry.time_blocks)
                      .filter((tb) => tb.title.trim())
                      .slice(0, 3)
                      .map((tb) => (
                        <div
                          key={tb.id}
                          className={`flex items-center gap-1 text-[9px] md:text-xs ${
                            tb.done ? 'opacity-50' : ''
                          }`}
                        >
                          <span
                            className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full shrink-0 ${
                              tb.done ? 'bg-green-400' : tb.tag ? TIME_BLOCK_TAGS.find(t => t.value === tb.tag)?.color.split(' ')[1] || 'bg-cosmic-cyan' : 'bg-cosmic-cyan'
                            }`}
                          />
                          {tb.time && (
                            <span className="text-navy-300/40 w-6 md:w-8 shrink-0 tabular-nums leading-none">
                              {tb.time}
                            </span>
                          )}
                          <span
                            className={`truncate leading-none ${
                              tb.done
                                ? 'line-through text-navy-300/30'
                                : 'text-navy-100'
                            }`}
                          >
                            {tb.title}
                          </span>
                        </div>
                      ))}
                    {entry.time_blocks.filter((tb) => tb.title.trim()).length > 3 && (
                      <p className="text-[8px] md:text-[10px] text-navy-300/40">
                        +{entry.time_blocks.filter((tb) => tb.title.trim()).length - 3} more
                      </p>
                    )}
                    {entry.notes && (
                      <p className="text-[8px] md:text-[10px] text-navy-200/40 truncate mt-0.5 md:mt-1 italic leading-none">
                        {entry.notes}
                      </p>
                    )}
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

      {/* Selected day's task table */}
      <div className="glass-card p-3 md:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="min-w-0 text-sm font-semibold text-white flex items-center gap-2">
            <Clock size={14} className="text-cosmic-cyan shrink-0" />
            <span className="truncate">{t('planner.tasksForDay', { day: t(`planner.days.${DAYS[selectedDateObj.getDay()].toLowerCase()}`) })}</span>
          </h3>
          <button
            onClick={() => openModal(selectedDate)}
            className="shrink-0 rounded-lg border border-cosmic-cyan/25 bg-cosmic-cyan/10 px-2.5 py-1.5 text-xs text-cosmic-cyan transition-colors hover:bg-cosmic-cyan/20"
          >
            {t('planner.editDay')}
          </button>
        </div>
        {selectedTasks.length > 0 ? (
          <div className="overflow-x-auto -mx-3 md:mx-0 px-3 md:px-0">
            <table className="w-full text-xs md:text-sm min-w-[400px] md:min-w-0">
              <thead>
                <tr className="text-left text-[9px] md:text-[10px] uppercase tracking-wider text-navy-300/50 border-b border-white/5">
                  <th className="pb-2 pr-2 md:pr-3 w-6 md:w-8">{t('planner.status')}</th>
                  <th className="pb-2 pr-2 md:pr-3">{t('task')}</th>
                  <th className="pb-2 pr-2 md:pr-3 hidden md:table-cell">{t('planner.description')}</th>
                  <th className="pb-2 pr-2 md:pr-3">{t('planner.scheduled')}</th>
                  <th className="pb-2 pr-2 md:pr-3 hidden sm:table-cell">{t('planner.completed')}</th>
                </tr>
              </thead>
              <tbody>
                {selectedTasks.map((tb) => (
                  <tr
                    key={tb.id}
                    className={`border-b border-white/5 ${tb.done ? 'opacity-50' : ''}`}
                  >
                    <td className="py-2 pr-2 md:py-2.5 md:pr-3">
                      <span
                        className={`inline-flex items-center justify-center w-4 h-4 md:w-5 md:h-5 rounded-full ${
                          tb.done
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-white/5 text-navy-300/40'
                        }`}
                      >
                        {tb.done ? <Check size={10} /> : <span className="w-1.5 h-1.5 rounded-full bg-navy-300/30" />}
                      </span>
                    </td>
                    <td className="py-2 pr-2 md:py-2.5 md:pr-3 text-navy-100 font-medium max-w-[120px] md:max-w-none truncate">
                      {tb.title}
                    </td>
                    <td className="py-2 pr-2 md:py-2.5 md:pr-3 text-navy-200/60 text-xs hidden md:table-cell max-w-[200px] truncate">
                      {tb.description || '—'}
                    </td>
                    <td className="py-2 pr-2 md:py-2.5 md:pr-3 text-navy-200/60 tabular-nums whitespace-nowrap">
                      {tb.time || '—'}
                    </td>
                    <td className="py-2 pr-2 md:py-2.5 md:pr-3 text-navy-200/60 tabular-nums whitespace-nowrap hidden sm:table-cell">
                      {tb.completed_time || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-navy-300/50 text-center py-6">
            {t('planner.noTasksForDay')}
          </p>
        )}
      </div>

      {/* Day modal */}
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
              className={`glass-card w-full max-w-2xl mx-0 md:mx-4 my-auto rounded-none md:rounded-2xl min-h-screen md:min-h-0 ${
                currentTrack ? 'p-4 pb-40 md:p-6 md:pb-16' : 'p-4 pb-24 md:p-6 md:pb-8'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-xl font-display text-white">
                    {modalDate === todayStr ? t('planner.today') : t(`planner.days.${DAYS[new Date(modalDate).getDay()].toLowerCase()}`)}
                  </h3>
                  <p className="text-sm text-navy-200/60">
                    {new Date(modalDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
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

              <div className="space-y-5">
                {/* Mood */}
                <div>
                  <label className="text-xs text-navy-200/60 mb-1.5 block uppercase tracking-wider">
                    {t('planner.mood')}
                  </label>
                  <select
                    value={dayMood}
                    onChange={(e) => setDayMood(e.target.value)}
                    className="celestial-input w-full"
                  >
                    <option value="neutral">{t('planner.moodNeutral')}</option>
                    <option value="happy">{t('planner.moodHappy')}</option>
                    <option value="motivated">{t('planner.moodMotivated')}</option>
                    <option value="tired">{t('planner.moodTired')}</option>
                    <option value="stressed">{t('planner.moodStressed')}</option>
                    <option value="calm">{t('planner.moodCalm')}</option>
                  </select>
                </div>

                {/* Day notes */}
                <div>
                  <label className="text-xs text-navy-200/60 mb-1.5 block uppercase tracking-wider">
                    {t('planner.dayNotes')}
                  </label>
                  <textarea
                    value={dayNote}
                    onChange={(e) => setDayNote(e.target.value)}
                    className="celestial-input min-h-[80px] resize-none"
                    placeholder={t('planner.notesPlaceholder')}
                  />
                </div>

                {/* Tasks */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-navy-200/60 uppercase tracking-wider">
                      {t('tasks')}
                    </label>
                    <button
                      onClick={addTask}
                      className="text-xs flex items-center gap-1 text-cosmic-cyan hover:text-white transition-colors"
                    >
                      <Plus size={12} /> {t('planner.addTask')}
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {tasks.length === 0 && (
                      <p className="text-sm text-navy-300/40 text-center py-4">
                        {t('planner.noTasksYet')}
                      </p>
                    )}
                    {tasks.map((task) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`rounded-2xl border p-3.5 transition-colors ${
                          task.done
                            ? 'border-green-400/15 bg-green-400/[0.035]'
                            : 'border-white/10 bg-navy-900/45 hover:border-cosmic-cyan/25'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {/* Done checkbox */}
                          <button
                            onClick={() => toggleDone(task.id)}
                            aria-label={task.done ? 'Mark task as incomplete' : 'Mark task as complete'}
                            className={`shrink-0 w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                              task.done
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'border-navy-400 hover:border-cosmic-cyan hover:bg-cosmic-cyan/10'
                            }`}
                          >
                            {task.done && <Check size={11} />}
                          </button>

                          {/* Title */}
                          <input
                            type="text"
                            value={task.title}
                            onChange={(e) =>
                              updateTask(task.id, { title: e.target.value })
                            }
                            placeholder={t('planner.taskTitle')}
                            className={`flex-1 min-w-0 bg-transparent border-none outline-none text-sm font-medium ${
                              task.done
                                ? 'line-through text-navy-200/50'
                                : 'text-white'
                            }`}
                          />

                          {/* Delete */}
                          <button
                            onClick={() => removeTask(task.id)}
                            aria-label="Remove task"
                            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-navy-300/40 transition-colors hover:bg-cosmic-rose/10 hover:text-cosmic-rose"
                          >
                            <X size={14} />
                          </button>
                        </div>

                        {/* Description + times + tag */}
                        <div className="mt-3 grid grid-cols-1 gap-2 border-t border-white/5 pt-3 sm:grid-cols-[minmax(0,1fr)_9rem_auto] sm:items-center">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 rounded-xl bg-white/[0.035] px-2.5 py-2 text-navy-200/50 focus-within:bg-white/[0.06]">
                              <FileText size={10} />
                              <input
                                type="text"
                                value={task.description}
                                onChange={(e) =>
                                  updateTask(task.id, {
                                    description: e.target.value,
                                  })
                                }
                                placeholder={t('planner.taskDesc')}
                                className="min-w-0 w-full bg-transparent border-none outline-none text-xs text-navy-200/80 placeholder-navy-300/35"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 rounded-xl bg-white/[0.035] px-2.5 py-1.5">
                            <Tag size={11} className="text-navy-300/40 shrink-0" />
                            <select
                              value={task.tag || ''}
                              onChange={(e) =>
                                updateTask(task.id, { tag: (e.target.value || undefined) as TimeBlockTag | undefined })
                              }
                              className="min-w-0 flex-1 bg-transparent text-[11px] text-navy-200/80 outline-none"
                            >
                              <option value="">No tag</option>
                              {TIME_BLOCK_TAGS.map((tg) => (
                                <option key={tg.value} value={tg.value}>{tg.label}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center justify-between gap-2 sm:justify-end">
                              <button
                                onClick={() =>
                                  updateTask(task.id, { is_work: !task.is_work })
                                }
                                className={`grid h-8 w-8 place-items-center rounded-xl transition-colors ${
                                  task.is_work !== false
                                    ? 'bg-cosmic-cyan/10 text-cosmic-cyan hover:bg-cosmic-cyan/20'
                                    : 'bg-white/5 text-navy-500 hover:text-navy-300'
                                }`}
                                title={task.is_work !== false ? 'Counts toward work hours' : 'Not counted in work hours'}
                              >
                                <Briefcase size={12} />
                              </button>
                              <TimePicker
                                value={task.time}
                                onChange={(time) => updateTask(task.id, { time })}
                              />
                              {task.done && (
                                <div className="flex items-center gap-1.5 rounded-xl bg-green-400/5 px-2 py-1.5 text-navy-200/50">
                                  <Clock size={10} />
                                  <input
                                    type="time"
                                    value={task.completed_time || ''}
                                    onChange={(e) =>
                                      updateTask(task.id, { completed_time: e.target.value || null })
                                    }
                                    className="w-[70px] bg-transparent border-none outline-none text-xs text-green-400/80 [color-scheme:dark]"
                                  />
                                </div>
                              )}
                            </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-5 pt-4 border-t border-white/5">
                <button
                  onClick={saveDay}
                  className="celestial-btn celestial-btn-primary flex-1"
                >
                  {t('planner.save')}
                </button>
                <button
                  onClick={closeModal}
                  className="celestial-btn celestial-btn-secondary"
                >
                  {t('planner.cancel')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
