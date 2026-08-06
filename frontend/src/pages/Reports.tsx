import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, XCircle, Clock, FileText, BookOpen,
  Target, TrendingUp, CalendarDays, ListChecks,
  Sparkles, RefreshCw,
} from 'lucide-react';
import { api } from '../api/client';
import type { Report, DailyActivity, DailyTask, DailySummary, DailyTaskSummary } from '../types';
import { useStore } from '../store/useStore';
import { useTranslation } from '../i18n/t';
import { formatWeekday, formatWeekdayShort, toLocalDateStr } from '../utils/formatTime';

function todayStr() {
  const d = new Date();
  return toLocalDateStr(d);
}

function weekAgoStr() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return toLocalDateStr(d);
}

function monthAgoStr() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return toLocalDateStr(d);
}

function yearAgoStr() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return toLocalDateStr(d);
}

type ViewMode = 'daily' | 'weekly' | 'monthly' | 'summary';

export default function Reports() {
  const { showToast } = useStore();
  const { t } = useTranslation();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(weekAgoStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  // Daily summary state
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryDate, setSummaryDate] = useState(todayStr());

  // Activity form state
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activityDate, setActivityDate] = useState(todayStr());
  const [activityTasks, setActivityTasks] = useState<DailyTask[]>([]);
  const [activityNotes, setActivityNotes] = useState('');
  const [existingActivity, setExistingActivity] = useState<DailyActivity | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchReport = async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    try {
      const data = await api.getReport(startDate, endDate);
      setReport(data);
    } catch (e: any) {
      showToast(t('reports.loadFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDailySummary = async (date: string) => {
    setSummaryLoading(true);
    try {
      const data = await api.getDailySummary(date);
      setDailySummary(data);
    } catch (e: any) {
      setDailySummary(null);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    fetchDailySummary(todayStr());
  }, []);

  const handleQuickRange = (range: 'week' | 'month' | 'year') => {
    if (range === 'week') {
      setStartDate(weekAgoStr());
      setEndDate(todayStr());
    } else if (range === 'month') {
      setStartDate(monthAgoStr());
      setEndDate(todayStr());
    } else if (range === 'year') {
      setStartDate(yearAgoStr());
      setEndDate(todayStr());
    }
    setTimeout(fetchReport, 0);
  };

  const handleGenerateSummary = async () => {
    try {
      await api.generateDailySummary();
      showToast(t('reports.dailyGenerated'), 'success');
      fetchDailySummary(summaryDate);
    } catch (e: any) {
      showToast(t('reports.generateFailed'), 'error');
    }
  };

  const handleRefresh = () => {
    fetchReport();
    fetchDailySummary(summaryDate);
    showToast(t('reports.refreshed'), 'info');
  };

  const openActivityForm = async (date: string) => {
    setActivityDate(date);
    setActivityTasks([]);
    setActivityNotes('');
    setExistingActivity(null);
    try {
      const existing = await api.getDailyActivityByDate(date);
      setExistingActivity(existing);
      setActivityTasks(existing.entries || []);
      setActivityNotes(existing.notes || '');
    } catch {
      // No existing activity
    }
    setShowActivityForm(true);
  };

  const addTaskRow = () => {
    setActivityTasks([...activityTasks, { task: '', hours: 0, is_study: true }]);
  };

  const updateTask = (index: number, field: keyof DailyTask, value: string | number) => {
    const updated = [...activityTasks];
    (updated[index] as any)[field] = value;
    setActivityTasks(updated);
  };

  const removeTask = (index: number) => {
    setActivityTasks(activityTasks.filter((_, i) => i !== index));
  };

  const toggleStudy = (index: number) => {
    const updated = [...activityTasks];
    updated[index] = { ...updated[index], is_study: !updated[index].is_study };
    setActivityTasks(updated);
  };

  const saveActivity = async () => {
    setSaving(true);
    try {
      const data = {
        date: activityDate,
        entries: activityTasks.filter(t => t.task.trim()),
        notes: activityNotes,
      };
      if (existingActivity) {
        await api.updateDailyActivity(existingActivity.id, data);
        showToast(t('reports.activityUpdated'), 'success');
      } else {
        await api.createDailyActivity(data);
        showToast(t('reports.activitySaved'), 'success');
      }
      setShowActivityForm(false);
      fetchReport();
      fetchDailySummary(activityDate);
    } catch (e: any) {
      showToast(t('reports.activityFailed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const renderStatsBar = () => {
    if (!report) return null;
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="glass-card rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-cosmic-cyan">{report.total_days}</div>
          <div className="text-xs text-navy-200 mt-1">{t('reports.days')}</div>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-cosmic-gold">{report.total_hours.toFixed(1)}h</div>
          <div className="text-xs text-navy-200 mt-1">{t('reports.totalHours')}</div>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-cosmic-cyan">
            {report.total_days > 0 ? (report.total_hours / report.total_days).toFixed(1) : '0'}h
          </div>
          <div className="text-xs text-navy-200 mt-1">{t('reports.avgPerDay')}</div>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">
            {report.days.filter(d => d.day_total_hours > 0).length}
          </div>
          <div className="text-xs text-navy-200 mt-1">{t('reports.daysWithActivity')}</div>
        </div>
      </div>
    );
  };

  const renderDayTasks = (day: Report['days'][0]) => {
    const allDone = [
      ...(day.done_tasks || []).map((t: any) => ({ title: t.title, source: 'planner' })),
      ...(day.activity_tasks || []).map((t: any) => ({ title: t.task || t.title, source: 'activity', hours: t.hours, is_study: t.is_study !== false })),
      ...((day.deadline_tasks?.done) || []).map((t: any) => ({ title: `${t.task_text} (${t.deadline_title})`, source: 'deadline' })),
    ].filter(t => t.title);

    const allNotDone = [
      ...(day.not_done_tasks || []).map((t: any) => ({ title: t.title, source: 'planner' })),
      ...((day.deadline_tasks?.not_done) || []).map((t: any) => ({ title: `${t.task_text} (${t.deadline_title})`, source: 'deadline' })),
    ].filter(t => t.title);

    return { allDone, allNotDone };
  };

  const renderDay = (day: Report['days'][0]) => {
    const isExpanded = expandedDay === day.date;
    const { allDone, allNotDone } = renderDayTasks(day);

    return (
      <motion.div
        key={day.date}
        layout
        className="glass-card rounded-xl p-4 mb-3"
      >
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setExpandedDay(isExpanded ? null : day.date)}
        >
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium text-white">{day.date}</div>
            <div className="text-xs text-navy-200/60">
              {formatWeekday(new Date(day.date + 'T12:00:00'))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Task summary badges */}
            {allDone.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-green-400">
                <CheckCircle2 size={12} />
                <span>{allDone.length}</span>
              </div>
            )}
            {allNotDone.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-navy-300">
                <XCircle size={12} />
                <span>{allNotDone.length}</span>
              </div>
            )}
            <div className="text-sm font-bold text-cosmic-gold">{day.day_total_hours.toFixed(1)}h</div>
            <div
              className="text-xs px-2 py-1 rounded-lg bg-cosmic-cyan/10 text-cosmic-cyan cursor-pointer hover:bg-cosmic-cyan/20"
              onClick={(e) => { e.stopPropagation(); openActivityForm(day.date); }}
            >
              {t('reports.log')}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 space-y-4 border-t border-white/5 pt-4">
                {/* Done Tasks */}
                {allDone.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-xs font-medium text-green-400 mb-2">
                      <CheckCircle2 size={14} />
{t('reports.doneTasks')}
                    </div>
                    {allDone.map((task: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-sm py-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                        <span className={task.is_study === false ? 'text-navy-200/50' : 'text-navy-100'}>{task.title}</span>
                        {task.is_study === false && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-navy-500/20 text-navy-300/60">{t('reports.nonStudy')}</span>
                        )}
                        <span className="text-[10px] text-navy-200/40 ml-auto">
                          {task.source}
                          {task.hours ? ` · ${task.hours.toFixed(1)}h` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Not Done Tasks */}
                {allNotDone.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-xs font-medium text-navy-300 mb-2">
                      <XCircle size={14} />
                      {t('reports.notDone')}
                    </div>
                    {allNotDone.map((task: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-sm py-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-navy-300/30 shrink-0" />
                        <span className="text-navy-200/60">{task.title}</span>
                        <span className="text-[10px] text-navy-200/40 ml-auto">{task.source}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Notes on this date */}
                {day.notes && day.notes.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-xs font-medium text-cosmic-cyan mb-2">
                      <FileText size={14} />
                      {t('reports.notesCreated')}
                    </div>
                    {day.notes.map((note: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-sm py-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-cosmic-cyan shrink-0" />
                        <span className="text-navy-100">{note.title}</span>
                        <span className="text-[10px] text-navy-200/40 ml-auto">{note.category}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Planner time blocks */}
                {day.planned_tasks.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-xs font-medium text-cosmic-gold mb-2">
                      <CalendarDays size={14} />
                      {t('reports.plannerBlocks')}
                    </div>
                    {day.planned_tasks.map((task: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-sm py-0.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${task.done ? 'bg-green-400' : 'bg-navy-300/30'} shrink-0`} />
                        <span className={task.done ? 'text-white line-through opacity-60' : 'text-navy-200'}>
                          {task.title}
                        </span>
                        <span className="text-xs text-navy-200/40 ml-auto">
                          {task.time}{task.completed_time ? ` - ${task.completed_time}` : ''}
                          {task.duration_hours ? ` (${task.duration_hours.toFixed(1)}h)` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Journal entry */}
                {day.journal && (
                  <div>
                    <div className="flex items-center gap-2 text-xs font-medium text-purple-400 mb-1">
                      <BookOpen size={14} />
                      {t('reports.journal')}
                    </div>
                    {day.journal.what_i_did && (
                      <div className="text-sm text-navy-200">
                        <span className="text-navy-200/60">{t('reports.did')} </span>{day.journal.what_i_did}
                      </div>
                    )}
                    {day.journal.reflection && (
                      <div className="text-sm text-navy-200 mt-1">
                        <span className="text-navy-200/60">{t('reports.reflection')} </span>{day.journal.reflection}
                      </div>
                    )}
                    <div className="text-xs text-navy-200/40 mt-1">{t('reports.mood')} {day.journal.mood}</div>
                  </div>
                )}

                {/* Activity notes */}
                {day.activity?.notes && (
                  <div>
                    <div className="text-xs font-medium text-blue-400 mb-1">{t('reports.activityNotes')}</div>
                    <div className="text-sm text-navy-200">{day.activity.notes}</div>
                  </div>
                )}

                {/* Hour breakdown */}
                {day.day_total_hours > 0 && (
                  <div className="flex items-center gap-2 text-xs text-cosmic-gold/80 pt-2 border-t border-white/5">
                    <Clock size={12} />
                    {t('reports.total')} {day.day_total_hours.toFixed(1)}h
                    {day.planner_total_hours > 0 && (
                      <span className="text-navy-200/40">· {t('reports.planner')} {day.planner_total_hours.toFixed(1)}h</span>
                    )}
                    {day.activity_total_hours > 0 && (
                      <span className="text-navy-200/40">· {t('reports.logged')} {day.activity_total_hours.toFixed(1)}h</span>
                    )}
                  </div>
                )}

                {allDone.length === 0 && allNotDone.length === 0 && !day.planned_tasks.length && !day.journal && !day.activity?.notes && (!day.notes || day.notes.length === 0) && (
                  <div className="text-sm text-navy-200/40 italic">{t('reports.noData')}</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const renderWeeklyView = () => {
    if (!report) return null;
    return (
      <div className="space-y-4">
        {report.weeks.map((week) => {
          const weekTotalDone = week.days.reduce((sum, d) => {
            const { allDone } = renderDayTasks(d);
            return sum + allDone.length;
          }, 0);
          const weekTotalNotDone = week.days.reduce((sum, d) => {
            const { allNotDone } = renderDayTasks(d);
            return sum + allNotDone.length;
          }, 0);
          return (
            <motion.div key={week.week_start} className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target size={16} className="text-cosmic-cyan" />
                  <div className="text-sm font-medium text-white">
                    {t('reports.weekOf', { week: week.week_start })}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  {weekTotalDone > 0 && (
                    <span className="text-green-400 text-xs">{t('reports.done', { n: weekTotalDone })}</span>
                  )}
                  {weekTotalNotDone > 0 && (
                    <span className="text-navy-300 text-xs">{t('reports.notDoneLabel', { n: weekTotalNotDone })}</span>
                  )}
                  <span className="font-bold text-cosmic-gold">
                    {week.total_hours.toFixed(1)}h
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-2 mb-3">
                {week.days.map((day) => {
                  const { allDone, allNotDone } = renderDayTasks(day);
                  return (
                    <div
                      key={day.date}
                      className="text-center p-2 rounded-lg cursor-pointer hover:bg-white/5 transition-colors"
                      onClick={() => {
                        setExpandedDay(expandedDay === day.date ? null : day.date);
                        setViewMode('daily');
                      }}
                    >
                      <div className="text-[10px] text-navy-200/40">
                        {formatWeekdayShort(new Date(day.date + 'T12:00:00'))}
                      </div>
                      <div className="text-xs text-white mt-1">{day.date.slice(5)}</div>
                      <div className="flex justify-center gap-1 mt-1">
                        {allDone.length > 0 && <span className="text-[9px] text-green-400">{allDone.length}✓</span>}
                        {allNotDone.length > 0 && <span className="text-[9px] text-navy-300">{allNotDone.length}✗</span>}
                      </div>
                      <div className={`text-xs font-bold mt-1 ${day.day_total_hours > 0 ? 'text-cosmic-gold' : 'text-navy-300/30'}`}>
                        {day.day_total_hours.toFixed(1)}h
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cosmic-cyan to-cosmic-gold rounded-full transition-all"
                  style={{ width: `${Math.min(100, (week.total_hours / (week.days_count * 12)) * 100)}%` }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  const renderMonthlyView = () => {
    if (!report) return null;
    return (
      <div className="space-y-4">
        {report.months.map((month) => {
          const monthTotalDone = month.days.reduce((sum, d) => {
            const { allDone } = renderDayTasks(d);
            return sum + allDone.length;
          }, 0);
          const monthTotalNotDone = month.days.reduce((sum, d) => {
            const { allNotDone } = renderDayTasks(d);
            return sum + allNotDone.length;
          }, 0);
          return (
            <motion.div key={month.month} className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-cosmic-gold" />
                  <div className="text-sm font-medium text-white">{t('reports.month', { month: month.month })}</div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  {monthTotalDone > 0 && (
                    <span className="text-green-400 text-xs">{t('reports.done', { n: monthTotalDone })}</span>
                  )}
                  {monthTotalNotDone > 0 && (
                    <span className="text-navy-300 text-xs">{t('reports.notDoneLabel', { n: monthTotalNotDone })}</span>
                  )}
                  <span className="font-bold text-cosmic-gold">
                    {month.total_hours.toFixed(1)}h / {month.days_count}d
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mb-3">
                {month.days.map((day) => {
                  const { allDone, allNotDone } = renderDayTasks(day);
                  const hasActivity = day.day_total_hours > 0 || allDone.length > 0;
                  return (
                    <div
                      key={day.date}
                      className="text-[10px] p-1 rounded cursor-pointer hover:bg-white/10 transition-colors text-center"
                      onClick={() => {
                        setExpandedDay(expandedDay === day.date ? null : day.date);
                        setViewMode('daily');
                      }}
                      title={t('reports.dayTooltip', { date: day.date, done: allDone.length, notDone: allNotDone.length, hours: day.day_total_hours.toFixed(1) })}
                    >
                      <div className={`w-4 h-4 rounded-sm mx-auto ${hasActivity ? 'bg-cosmic-gold' : 'bg-white/5'}`} />
                      <div className="text-navy-200/40 mt-0.5">{day.date.slice(8)}</div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 text-xs text-navy-200/60">
                <span>{t('reports.avgPerDayShort', { avg: (month.total_hours / Math.max(1, month.days_count)).toFixed(1) })}</span>
                {monthTotalDone > 0 && <span>· {t('reports.done', { n: monthTotalDone })}</span>}
                {monthTotalNotDone > 0 && <span>· {t('reports.notDoneLabel', { n: monthTotalNotDone })}</span>}
              </div>
              <div className="mt-2 h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cosmic-cyan to-cosmic-gold rounded-full transition-all"
                  style={{ width: `${Math.min(100, (month.total_hours / (month.days_count * 12)) * 100)}%` }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  const renderSummaryView = () => {
    return (
      <div className="space-y-4">
        {/* Date selector and actions */}
        <div className="glass-card rounded-xl p-3 md:p-4">
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <div className="flex items-center gap-1 md:gap-2">
              <label className="text-[10px] md:text-xs text-navy-200 whitespace-nowrap">{t('reports.date')}</label>
              <input
                type="date"
                value={summaryDate}
                onChange={(e) => {
                  setSummaryDate(e.target.value);
                  fetchDailySummary(e.target.value);
                }}
                className="bg-white/5 border border-white/10 rounded-lg px-2 md:px-3 py-1.5 text-xs md:text-sm text-white max-w-[130px] md:max-w-none"
              />
            </div>
            <button
              onClick={handleGenerateSummary}
              className="px-2 md:px-3 py-1.5 bg-cosmic-gold/20 text-cosmic-gold rounded-lg text-[10px] md:text-xs hover:bg-cosmic-gold/30 transition-colors flex items-center gap-1"
            >
              <Sparkles size={11} />
              <span className="hidden md:inline">{t('reports.generateSummary')}</span>
              <span className="md:hidden">{t('reports.generate')}</span>
            </button>
            <button
              onClick={handleRefresh}
              className="px-2 md:px-3 py-1.5 bg-white/5 text-navy-200 rounded-lg text-[10px] md:text-xs hover:bg-white/10 transition-colors flex items-center gap-1"
            >
              <RefreshCw size={11} />
              <span className="hidden md:inline">{t('reports.refresh')}</span>
              <span className="md:hidden">{t('reports.refresh')}</span>
            </button>
          </div>
        </div>

        {/* Summary card */}
        {summaryLoading && (
          <div className="text-center py-8">
            <div className="text-navy-200 animate-pulse">{t('reports.loading')}</div>
          </div>
        )}

        {dailySummary && !summaryLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Main summary card */}
            <div className="glass-card rounded-xl p-5 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ListChecks size={18} className="text-cosmic-cyan" />
                  <h2 className="text-lg font-bold text-white">{t('reports.dailySummary')}</h2>
                </div>
                <div className="text-sm text-navy-200/60">{dailySummary.date}</div>
              </div>

              {/* Summary text */}
              <div className="text-center py-4 mb-4 border-y border-white/5">
                <div className="text-xl font-bold text-cosmic-gold">
                  {dailySummary.total_hours > 0
                    ? `${dailySummary.total_hours.toFixed(1)} ${t('reports.hours')}`
                    : t('reports.noHours')}
                </div>
                <div className="text-sm text-navy-200 mt-1">{dailySummary.summary_text}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {/* Done Tasks */}
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-green-400 mb-2">
                    <CheckCircle2 size={14} />
                    {t('reports.done', { n: dailySummary.done_tasks.length })}
                  </div>
                  {dailySummary.done_tasks.length > 0 ? (
                    <div className="space-y-1">
                      {dailySummary.done_tasks.map((task, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm py-0.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                          <span className="text-navy-100">{task.title}</span>
                          <span className="text-[10px] text-navy-200/40 ml-auto">
                            {task.source}{task.hours > 0 ? ` · ${task.hours.toFixed(1)}h` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-navy-200/40 italic">{t('reports.noTasksDone')}</div>
                  )}
                </div>

                {/* Not Done Tasks */}
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-navy-300 mb-2">
                    <XCircle size={14} />
                    {t('reports.notDoneLabel', { n: dailySummary.not_done_tasks.length })}
                  </div>
                  {dailySummary.not_done_tasks.length > 0 ? (
                    <div className="space-y-1">
                      {dailySummary.not_done_tasks.map((task, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm py-0.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-navy-300/30 shrink-0" />
                          <span className="text-navy-200/60">{task.title}</span>
                          <span className="text-[10px] text-navy-200/40 ml-auto">{task.source}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-navy-200/40 italic">{t('reports.allDone')}</div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {dailySummary.notes.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 text-sm font-medium text-cosmic-cyan mb-2">
                    <FileText size={14} />
                    {t('reports.notesLabel', { n: dailySummary.notes.length })}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {dailySummary.notes.map((note, idx) => (
                      <span key={idx} className="text-xs px-2 py-1 rounded-lg bg-cosmic-cyan/10 text-cosmic-cyan">
                        {note}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Journal */}
              {dailySummary.journal_what_i_did && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 text-sm font-medium text-purple-400 mb-2">
                    <BookOpen size={14} />
                    {t('reports.journalLabel')}
                  </div>
                  <div className="text-sm text-navy-200">{dailySummary.journal_what_i_did}</div>
                </div>
              )}

              {/* Hour breakdown */}
              {dailySummary.total_hours > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2 text-sm text-cosmic-gold/80">
                  <Clock size={14} />
                  {t('reports.totalAcross', { hours: dailySummary.total_hours.toFixed(1), tasks: dailySummary.done_tasks.length })}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {!dailySummary && !summaryLoading && (
          <div className="text-center py-12 text-navy-200/40">
            {t('reports.noSummary')}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 w-full">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-display font-bold text-white">{t('reports.title')}</h1>
          <button
            onClick={handleRefresh}
            className="px-3 py-1.5 bg-white/5 text-navy-200 rounded-lg text-xs hover:bg-white/10 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw size={12} />
            {t('reports.refresh')}
          </button>
        </div>

        {/* View mode tabs */}
        <div className="glass-card rounded-xl p-1.5 md:p-2 mb-4 md:mb-6">
          <div className="grid grid-cols-4 gap-1">
            {(['daily', 'weekly', 'monthly', 'summary'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-1 md:px-4 py-2 rounded-lg text-[10px] md:text-sm font-medium transition-all ${
                  viewMode === mode
                    ? 'bg-cosmic-cyan/20 text-cosmic-cyan shadow-glow'
                    : 'text-navy-200 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="md:hidden">
                  {mode === 'daily' && t('reports.viewDay')}
                  {mode === 'weekly' && t('reports.viewWeek')}
                  {mode === 'monthly' && t('reports.viewMonth')}
                  {mode === 'summary' && t('reports.viewSummary')}
                </span>
                <span className="hidden md:inline">
                  {mode === 'daily' && t('reports.viewDaily')}
                  {mode === 'weekly' && t('reports.viewWeekly')}
                  {mode === 'monthly' && t('reports.viewMonthly')}
                  {mode === 'summary' && t('reports.viewSummaryFull')}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Controls - only for daily/weekly/monthly */}
        {viewMode !== 'summary' && (
          <div className="glass-card rounded-xl p-3 md:p-4 mb-4 md:mb-6">
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <div className="flex items-center gap-1 md:gap-2">
                <label className="text-[10px] md:text-xs text-navy-200 whitespace-nowrap">{t('reports.from')}</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-2 md:px-3 py-1.5 text-xs md:text-sm text-white max-w-[120px] md:max-w-none"
                />
              </div>
              <div className="flex items-center gap-1 md:gap-2">
                <label className="text-[10px] md:text-xs text-navy-200 whitespace-nowrap">{t('reports.to')}</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-2 md:px-3 py-1.5 text-xs md:text-sm text-white max-w-[120px] md:max-w-none"
                />
              </div>
              <button
                onClick={fetchReport}
                className="px-3 md:px-4 py-1.5 bg-cosmic-cyan/20 text-cosmic-cyan rounded-lg text-xs md:text-sm hover:bg-cosmic-cyan/30 transition-colors"
              >
                {t('reports.load')}
              </button>
              <div className="flex gap-1">
                {(['week', 'month', 'year'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => handleQuickRange(r)}
                    className="px-2 md:px-3 py-1.5 bg-white/5 text-navy-200 rounded-lg text-[10px] md:text-xs hover:bg-white/10 transition-colors capitalize"
                  >
                    {r === 'week' ? t('reports.quickWeek') : r === 'month' ? t('reports.quickMonth') : t('reports.quickYear')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && viewMode !== 'summary' && (
          <div className="text-center py-12">
            <div className="text-navy-200 animate-pulse">{t('reports.loadingReport')}</div>
          </div>
        )}

        {/* Daily view */}
        {viewMode === 'daily' && report && !loading && (
          <>
            {renderStatsBar()}
            <div className="space-y-1">
              {report.days.map(renderDay)}
              {report.days.length === 0 && (
                <div className="text-center py-12 text-navy-200/40">{t('reports.noDataRange')}</div>
              )}
            </div>
          </>
        )}

        {/* Weekly view */}
        {viewMode === 'weekly' && report && !loading && (
          <>
            {renderStatsBar()}
            {renderWeeklyView()}
          </>
        )}

        {/* Monthly view */}
        {viewMode === 'monthly' && report && !loading && (
          <>
            {renderStatsBar()}
            {renderMonthlyView()}
          </>
        )}

        {/* Summary view */}
        {viewMode === 'summary' && renderSummaryView()}

        {!report && !loading && viewMode !== 'summary' && (
          <div className="text-center py-12">
            <div className="text-navy-200/40">{t('reports.selectRange')}</div>
          </div>
        )}
      </motion.div>

      {/* Activity Form Modal */}
      <AnimatePresence>
        {showActivityForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowActivityForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-4 md:p-6 w-full max-w-lg mx-0 md:mx-4 max-h-[100vh] md:max-h-[80vh] overflow-y-auto rounded-none md:rounded-xl min-h-screen md:min-h-0"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold text-white mb-4">
                {existingActivity ? t('reports.editActivity') : t('reports.logActivity')}
              </h2>
              <div className="text-sm text-navy-200 mb-4">{activityDate}</div>

              <div className="space-y-2 mb-4">
                <div className="text-sm text-navy-200">{t('reports.tasks')}</div>
                {activityTasks.map((task, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <button
                      onClick={() => toggleStudy(idx)}
                      className={`p-1 rounded transition-colors ${
                        task.is_study !== false
                          ? 'text-cosmic-cyan hover:text-cosmic-cyan/80'
                          : 'text-navy-500/40 hover:text-navy-400'
                      }`}
                      title={task.is_study !== false ? t('reports.studyTooltip') : t('reports.nonStudyTooltip')}
                    >
                      <BookOpen size={14} />
                    </button>
                    <input
                      type="text"
                      placeholder={t('reports.taskNamePlaceholder')}
                      value={task.task}
                      onChange={(e) => updateTask(idx, 'task', e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
                    />
                    <input
                      type="number"
                      placeholder={t('reports.hoursPlaceholder')}
                      value={task.hours || ''}
                      onChange={(e) => updateTask(idx, 'hours', parseFloat(e.target.value) || 0)}
                      className="w-20 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
                      step="0.5"
                      min="0"
                    />
                    <button
                      onClick={() => removeTask(idx)}
                      className="text-navy-200 hover:text-red-400 transition-colors p-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  onClick={addTaskRow}
                  className="text-xs text-cosmic-cyan hover:text-cosmic-cyan/80 transition-colors"
                >
                  {t('reports.addTask')}
                </button>
              </div>

              <div className="mb-4">
                <div className="text-sm text-navy-200 mb-1">{t('reports.notes')}</div>
                <textarea
                  value={activityNotes}
                  onChange={(e) => setActivityNotes(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white min-h-[80px]"
                  placeholder={t('reports.activityNotesPlaceholder')}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowActivityForm(false)}
                  className="px-4 py-2 text-sm text-navy-200 hover:text-white transition-colors"
                >
                  {t('reports.cancel')}
                </button>
                <button
                  onClick={saveActivity}
                  disabled={saving}
                  className="px-4 py-2 bg-cosmic-cyan/20 text-cosmic-cyan rounded-lg text-sm hover:bg-cosmic-cyan/30 transition-colors disabled:opacity-50"
                >
                  {saving ? t('reports.saving') : t('reports.save')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
