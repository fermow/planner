import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { JournalEntry } from '../types';
import { useTranslation } from '../i18n/t';
import { formatDateLong } from '../utils/formatTime';

const MOODS = ['neutral', 'happy', 'motivated', 'tired', 'stressed', 'calm', 'sad', 'excited'];

export default function JournalPage() {
  const { t } = useTranslation();
  const { journal, fetchJournal, addJournalEntry, editJournalEntry, removeJournalEntry } = useStore();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  const [form, setForm] = useState({ what_i_did: '', plans: '', reflection: '', mood: 'neutral' });

  useEffect(() => {
    fetchJournal();
  }, [fetchJournal]);

  const todayStr = new Date().toISOString().split('T')[0];
  const currentEntry = journal.find((e) => e.date === selectedDate);

  const openForm = (entry?: JournalEntry) => {
    if (entry) {
      setEditing(entry);
      setForm({ what_i_did: entry.what_i_did, plans: entry.plans, reflection: entry.reflection, mood: entry.mood });
    } else {
      setEditing(null);
      setForm({ what_i_did: '', plans: '', reflection: '', mood: 'neutral' });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (editing) {
      await editJournalEntry(editing.id, form);
    } else {
      await addJournalEntry({ date: selectedDate, ...form });
    }
    setShowForm(false);
    setEditing(null);
  };

  const changeDay = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const moodColor = (m: string) => {
    const colors: Record<string, string> = {
      happy: 'text-cosmic-gold',
      motivated: 'text-cosmic-cyan',
      calm: 'text-cosmic-violet',
      tired: 'text-navy-300',
      stressed: 'text-cosmic-rose',
      sad: 'text-cosmic-rose/70',
      excited: 'text-cosmic-gold',
    };
    return colors[m] || 'text-navy-200';
  };

  return (
    <div className="space-y-4 w-full">
      {/* Date navigation */}
      <div className="flex items-center justify-between glass-card p-3 md:p-4">
        <button onClick={() => changeDay(-1)} className="p-1.5 rounded-lg hover:bg-white/5 text-navy-200"><ChevronLeft size={18} /></button>
        <div className="text-center">
          <p className="text-lg font-display text-white">
            {formatDateLong(new Date(selectedDate))}
          </p>
          {selectedDate === todayStr && <p className="text-xs text-cosmic-cyan">{t('journal.today')}</p>}
        </div>
        <button onClick={() => changeDay(1)} className="p-1.5 rounded-lg hover:bg-white/5 text-navy-200"><ChevronRight size={18} /></button>
      </div>

      {/* Current entry */}
      <AnimatePresence mode="wait">
        {currentEntry ? (
          <motion.div
            key={currentEntry.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-card p-5 md:p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className={`text-sm font-medium ${moodColor(currentEntry.mood)}`}>
                {t(`journal.mood${currentEntry.mood.charAt(0).toUpperCase() + currentEntry.mood.slice(1)}`)} · {t(`journal.mood${currentEntry.mood.charAt(0).toUpperCase() + currentEntry.mood.slice(1)}`)}
              </span>
              <div className="flex gap-2">
                <button onClick={() => openForm(currentEntry)} className="text-xs text-navy-200/60 hover:text-cosmic-cyan">{t('journal.edit')}</button>
                <button onClick={() => removeJournalEntry(currentEntry.id)} className="text-xs text-navy-200/60 hover:text-cosmic-rose">{t('journal.delete')}</button>
              </div>
            </div>

            {currentEntry.what_i_did && (
              <div>
                <h4 className="text-xs uppercase tracking-wider text-navy-200/40 mb-1">{t('journal.whatIdid')}</h4>
                <p className="text-sm text-navy-100 whitespace-pre-wrap">{currentEntry.what_i_did}</p>
              </div>
            )}
            {currentEntry.plans && (
              <div>
                <h4 className="text-xs uppercase tracking-wider text-navy-200/40 mb-1">{t('journal.plans')}</h4>
                <p className="text-sm text-navy-100 whitespace-pre-wrap">{currentEntry.plans}</p>
              </div>
            )}
            {currentEntry.reflection && (
              <div>
                <h4 className="text-xs uppercase tracking-wider text-navy-200/40 mb-1">{t('journal.reflection')}</h4>
                <p className="text-sm text-navy-100 whitespace-pre-wrap italic">{currentEntry.reflection}</p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card p-12 text-center"
          >
            <BookOpen size={32} className="mx-auto text-navy-300/20 mb-3" />
            <p className="text-sm text-navy-200/60 mb-4">{t('journal.noEntry')}</p>
            <button
              onClick={() => openForm()}
              className="celestial-btn celestial-btn-primary inline-flex items-center gap-2"
            >
              <Plus size={16} /> {t('journal.writeEntry')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent entries */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">{t('journal.recentEntries')}</h3>
        <div className="space-y-2">
          {journal.slice(-7).reverse().map((entry) => (
            <motion.div
              key={entry.id}
              whileHover={{ x: 2 }}
              onClick={() => setSelectedDate(entry.date)}
              className="glass-card p-3 flex items-center justify-between cursor-pointer"
            >
              <div>
                <p className="text-sm text-white">{entry.date}</p>
                <p className="text-xs text-navy-200/50 truncate max-w-[300px]">{entry.what_i_did || entry.reflection || t('journal.empty')}</p>
              </div>
              <span className={`text-xs ${moodColor(entry.mood)}`}>{t(`journal.mood${entry.mood.charAt(0).toUpperCase() + entry.mood.slice(1)}`)}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Form modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start md:items-center justify-center pt-0 md:pt-[5vh] bg-black/60 backdrop-blur-sm overflow-y-auto"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card p-4 md:p-6 w-full max-w-lg rounded-none md:rounded-2xl min-h-screen md:min-h-0"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-display text-white">{editing ? t('journal.editEntry') : t('journal.newEntry')}</h3>
                <button onClick={() => setShowForm(false)} className="text-navy-300 hover:text-white"><X size={18} /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-navy-200/60 mb-1 block">{t('journal.mood')}</label>
                  <select value={form.mood} onChange={(e) => setForm({ ...form, mood: e.target.value })} className="celestial-input">
                    {MOODS.map((m) => <option key={m} value={m}>{t(`journal.mood${m.charAt(0).toUpperCase() + m.slice(1)}`)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-navy-200/60 mb-1 block">{t('journal.whatDidI')}</label>
                  <textarea value={form.what_i_did} onChange={(e) => setForm({ ...form, what_i_did: e.target.value })} className="celestial-input min-h-[80px] resize-none" />
                </div>
                <div>
                  <label className="text-xs text-navy-200/60 mb-1 block">{t('journal.plans')}</label>
                  <textarea value={form.plans} onChange={(e) => setForm({ ...form, plans: e.target.value })} className="celestial-input min-h-[80px] resize-none" />
                </div>
                <div>
                  <label className="text-xs text-navy-200/60 mb-1 block">{t('journal.reflection')}</label>
                  <textarea value={form.reflection} onChange={(e) => setForm({ ...form, reflection: e.target.value })} className="celestial-input min-h-[80px] resize-none" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleSave} className="celestial-btn celestial-btn-primary flex-1">{t('journal.save')}</button>
                <button onClick={() => setShowForm(false)} className="celestial-btn celestial-btn-secondary">{t('journal.cancel')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
