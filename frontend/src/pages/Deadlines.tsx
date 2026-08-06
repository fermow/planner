import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, X, Check, Clock, FileText, Circle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useClock } from '../hooks/useClock';
import { formatCountdownPrecise, formatDueDate, calculateTimeProgress } from '../utils/formatTime';
import type { Deadline, Task } from '../types';
import { useTranslation } from '../i18n/t';

function priorityColor(p: string) {
  switch (p) {
    case 'high': return 'tag-rose';
    case 'medium': return 'tag-gold';
    case 'low': return 'tag-cyan';
    default: return 'tag-cyan';
  }
}

function normalizeTask(t: any): Task {
  if (t.id) return t as Task;
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: t.text || t.title || '',
    description: t.description || '',
    time: t.time || '',
    done: t.done || false,
  };
}

export default function DeadlinesPage() {
  const { t } = useTranslation();
  const { deadlines, fetchDeadlines, addDeadline, editDeadline, removeDeadline } = useStore();
  const now = useClock();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Deadline | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  const [form, setForm] = useState({ title: '', description: '', due_date: '', priority: 'medium', tags: '', reminder_enabled: true });
  const [formTasks, setFormTasks] = useState<Task[]>([]);

  useEffect(() => {
    fetchDeadlines();
  }, [fetchDeadlines]);

  const resetForm = () => {
    setForm({ title: '', description: '', due_date: '', priority: 'medium', tags: '', reminder_enabled: true });
    setFormTasks([]);
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    const data = {
      ...form,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      tasks: formTasks,
      due_date: new Date(form.due_date).toISOString(),
    };
    if (editing) {
      await editDeadline(editing.id, data);
    } else {
      await addDeadline(data);
    }
    resetForm();
  };

  const handleEdit = (d: Deadline) => {
    setEditing(d);
    setForm({
      title: d.title,
      description: d.description,
      due_date: d.due_date.slice(0, 16),
      priority: d.priority,
      tags: d.tags.join(', '),
      reminder_enabled: d.reminder_enabled,
    });
    setFormTasks((d.tasks || []).map(normalizeTask));
    setShowForm(true);
  };

  function addTask() {
    setFormTasks((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: '',
        description: '',
        time: '',
        done: false,
      },
    ]);
  }

  function updateTask(id: string, patch: Partial<Task>) {
    setFormTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function removeTask(id: string) {
    setFormTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function toggleTask(id: string) {
    setFormTasks((prev) =>
      prev.map((t) => (t.id !== id ? t : { ...t, done: !t.done })),
    );
  }

  const filtered = deadlines
    .filter((d) => {
      const matchesSearch = searchQuery === '' || d.title.toLowerCase().includes(searchQuery.toLowerCase()) || d.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesPriority = filterPriority === '' || d.priority === filterPriority;
      return matchesSearch && matchesPriority;
    })
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  const sortTasks = (tasks: Task[]) => [...tasks].sort((a, b) => a.time.localeCompare(b.time));
  const completedTasks = (tasks: Task[]) => tasks.filter((t) => t.done).length;

  const progressColor = (pct: number) => {
    if (pct >= 100) return 'from-cosmic-rose to-red-500';
    if (pct >= 75) return 'from-cosmic-gold to-cosmic-rose';
    if (pct >= 50) return 'from-cosmic-cyan to-cosmic-gold';
    return 'from-cosmic-cyan to-cosmic-violet';
  };

  return (
    <div className="space-y-4 w-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        <div className="relative flex-1 min-w-[140px] md:min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300/50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('deadline.searchPlaceholder')}
            className="celestial-input pl-9 text-xs md:text-sm"
          />
        </div>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="celestial-input w-auto text-xs md:text-sm"
        >
          <option value="">{t('deadline.allPriorities')}</option>
          <option value="high">{t('deadline.high')}</option>
          <option value="medium">{t('deadline.medium')}</option>
          <option value="low">{t('deadline.low')}</option>
        </select>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="celestial-btn celestial-btn-primary flex items-center gap-1 md:gap-2 text-xs md:text-sm px-3 md:px-5 py-2 md:py-2.5">
          <Plus size={14} /> <span className="hidden xs:inline">{t('deadline.add')}</span>
        </button>
      </div>

      {/* Form modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] pb-8 bg-black/60 backdrop-blur-sm overflow-y-auto"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card p-4 md:p-6 w-full max-w-lg max-h-[100vh] md:max-h-[90vh] overflow-y-auto rounded-none md:rounded-2xl min-h-screen md:min-h-0 mx-0"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-display text-white">{editing ? t('deadline.edit') : t('deadline.new')}</h3>
                <button onClick={() => setShowForm(false)} className="text-navy-300 hover:text-white"><X size={18} /></button>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder={t('deadline.titleField')}
                  className="celestial-input"
                />
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={t('deadline.description')}
                  className="celestial-input min-h-[80px] resize-none"
                />
                <input
                  type="datetime-local"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="celestial-input"
                />
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="celestial-input"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder={t('deadline.tags')}
                  className="celestial-input"
                />

                {/* Tasks (like planner TimeBlocks) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-navy-300/60 uppercase tracking-wider">{t('deadline.tasks')}</p>
                    <button
                      onClick={addTask}
                      className="text-xs flex items-center gap-1 text-cosmic-cyan hover:text-white transition-colors"
                    >
                      <Plus size={12} /> {t('deadline.addTask')}
                    </button>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {formTasks.length === 0 && (
                      <p className="text-sm text-navy-300/40 text-center py-4">{t('deadline.noTasks')}</p>
                    )}
                    {[...formTasks].sort((a, b) => a.time.localeCompare(b.time)).map((task) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`glass-card p-3 space-y-2 ${task.done ? 'opacity-60' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleTask(task.id)}
                            className={`shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                              task.done
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'border-navy-400 hover:border-cosmic-cyan'
                            }`}
                          >
                            {task.done && <Check size={11} />}
                          </button>
                          <input
                            type="text"
                            value={task.title}
                            onChange={(e) => updateTask(task.id, { title: e.target.value })}
                            placeholder={t('deadline.taskTitle')}
                            className={`flex-1 bg-transparent border-none outline-none text-sm ${
                              task.done ? 'line-through text-navy-300/40' : 'text-white'
                            }`}
                          />
                          <button
                            onClick={() => removeTask(task.id)}
                            className="text-navy-300/40 hover:text-cosmic-rose transition-colors shrink-0"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-7">
                          <div className="flex items-center gap-1.5 text-navy-200/50">
                            <FileText size={10} />
                            <input
                              type="text"
                              value={task.description}
                              onChange={(e) => updateTask(task.id, { description: e.target.value })}
                              placeholder={t('deadline.taskDesc')}
                              className="bg-transparent border-none outline-none text-xs text-navy-200/70 placeholder-navy-300/30 w-full"
                            />
                          </div>
                          <div className="flex items-center gap-1 text-navy-200/50">
                            <Clock size={10} />
                            <input
                              type="time"
                              value={task.time}
                              onChange={(e) => updateTask(task.id, { time: e.target.value })}
                              className="bg-transparent border-none outline-none text-xs text-navy-200/70 w-[80px]"
                            />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-navy-200">
                  <input
                    type="checkbox"
                    checked={form.reminder_enabled}
                    onChange={(e) => setForm({ ...form, reminder_enabled: e.target.checked })}
                    className="rounded border-navy-400"
                  />
                  {t('deadline.enableReminders')}
                </label>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleSubmit} className="celestial-btn celestial-btn-primary flex-1">
                  {editing ? t('deadline.update') : t('deadline.create')}
                </button>
                <button onClick={() => setShowForm(false)} className="celestial-btn celestial-btn-secondary">{t('deadline.cancel')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deadlines grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {filtered.map((d, i) => {
          const dueDate = new Date(d.due_date);
          const diff = dueDate.getTime() - now.getTime();
          const tasks = sortTasks((d.tasks || []).map(normalizeTask));
          const doneCount = completedTasks(tasks);
          const autoProgress = calculateTimeProgress(dueDate, d.created_at, now);

          return (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-4 space-y-3 cursor-pointer"
              onClick={() => handleEdit(d)}
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-semibold text-white">{d.title}</h4>
                <span className={`tag ${priorityColor(d.priority)}`}>{d.priority}</span>
              </div>
              {d.description && (
                <p className="text-xs text-navy-200/60 line-clamp-2">{d.description}</p>
              )}
              {/* Live countdown */}
              <div className="flex items-center justify-between text-xs">
                <span
                  className={`font-mono tabular-nums ${
                    diff <= 0 ? 'text-cosmic-rose' : diff <= 3 * 24 * 60 * 60 * 1000 ? 'text-cosmic-gold' : 'text-navy-200/60'
                  }`}
                >
                  {formatCountdownPrecise(dueDate, now)}
                </span>
                <span className="text-navy-300/40">{formatDueDate(dueDate)}</span>
              </div>
              {/* Auto progress bar */}
              <div className="space-y-1">
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${progressColor(autoProgress)} transition-all duration-1000`}
                    style={{ width: `${autoProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-navy-400">
                  <span>{t('deadline.elapsed', { pct: autoProgress })}</span>
                  {tasks.length > 0 && <span>{doneCount}/{tasks.length} tasks done</span>}
                </div>
              </div>
              {/* Tasks */}
              {tasks.length > 0 && (
                <div className="space-y-1">
                  {tasks.slice(0, 3).map((task) => (
                    <div key={task.id} className="flex items-center gap-1.5 text-xs">
                      {task.done
                        ? <Check size={12} className="text-cosmic-cyan shrink-0" />
                        : <Circle size={12} className="text-navy-400 shrink-0" />
                      }
                      <span className={`truncate ${task.done ? 'line-through text-navy-400' : 'text-navy-300'}`}>
                        {task.title}
                      </span>
                    </div>
                  ))}
                  {tasks.length > 3 && (
                    <p className="text-[10px] text-navy-400">{t('deadline.moreTasks', { n: tasks.length - 3 })}</p>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-1">
                {d.tags.map((tag) => (
                  <span key={tag} className="tag tag-cyan text-[10px]">{tag}</span>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={(e) => { e.stopPropagation(); handleEdit(d); }}
                  className="text-[11px] font-semibold text-navy-200/60 hover:text-cosmic-cyan"
                >
                  {t('common.edit')}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); removeDeadline(d.id); }}
                  className="text-[11px] font-semibold text-navy-200/60 hover:text-cosmic-rose"
                >
                  {t('common.delete')}
                </button>
              </div>
            </motion.div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-navy-300/50 text-sm">{t('deadline.noneFound')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
