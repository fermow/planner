import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Upload, Database, Settings2, Sparkles } from 'lucide-react';
import { api } from '../api/client';
import { useStore } from '../store/useStore';
import { useTranslation } from '../i18n/t';

export default function SettingsPage() {
  const { fetchAll, showToast, theme, setTheme } = useStore();
  const { t } = useTranslation();
  const [importing, setImporting] = useState(false);

  const handleExport = async () => {
    try {
      const blob = await api.exportBackup();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `celestial-desk-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Backup exported', 'success');
    } catch {
      showToast('Export failed', 'error');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await api.importBackup(data);
      await fetchAll();
      showToast('Data imported successfully', 'success');
    } catch {
      showToast('Import failed. Check file format.', 'error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Database size={18} className="text-cosmic-cyan" />
          <h3 className="text-sm font-semibold text-white">{t('settings.dataManagement')}</h3>
        </div>
        <p className="text-xs text-navy-200/60">
          {t('settings.dataDescription')}
        </p>
        <div className="flex flex-wrap gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExport}
            className="celestial-btn celestial-btn-primary flex items-center gap-2"
          >
            <Download size={16} /> {t('settings.exportBackup')}
          </motion.button>
          <label className="celestial-btn celestial-btn-secondary flex items-center gap-2 cursor-pointer">
            <Upload size={16} /> {t('settings.importBackup')}
            <input type="file" accept=".json" onChange={handleImport} className="hidden" disabled={importing} />
          </label>
        </div>
      </div>

      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Sparkles size={18} className="text-cosmic-rose" />
          <h3 className="text-sm font-semibold text-white">{t('settings.themeAndStyle')}</h3>
        </div>
        <p className="text-xs text-navy-200/60">
          {t('settings.themeDescription')}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setTheme('default')}
            className={`flex-1 p-4 rounded-2xl border-2 transition-all text-center ${
              theme === 'default'
                ? 'border-cosmic-cyan bg-cosmic-cyan/10'
                : 'border-white/5 hover:border-white/10'
            }`}
          >
            <span className="text-2xl block mb-1">⭐</span>
            <span className="text-sm font-medium text-white">{t('theme.cosmic')}</span>
            <span className="text-[10px] text-navy-200/40 block mt-0.5">{t('theme.cosmicDesc')}</span>
          </button>
          <button
            onClick={() => setTheme('kawaii')}
            className={`flex-1 p-4 rounded-2xl border-2 transition-all text-center ${
              theme === 'kawaii'
                ? 'border-cosmic-rose bg-cosmic-rose/10'
                : 'border-white/5 hover:border-white/10'
            }`}
          >
            <span className="text-2xl block mb-1">🎀</span>
            <span className="text-sm font-medium text-white">{t('theme.kitty')}</span>
            <span className="text-[10px] text-navy-200/40 block mt-0.5">{t('theme.kittyDesc')}</span>
          </button>
        </div>
      </div>

      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Settings2 size={18} className="text-cosmic-gold" />
          <h3 className="text-sm font-semibold text-white">{t('settings.shortcuts')}</h3>
        </div>
        <div className="space-y-2 text-sm">
          {[
            { keys: 'Ctrl+K', action: t('settings.shortcutSearch') },
            { keys: 'Esc', action: t('settings.shortcutClose') },
          ].map((shortcut) => (
            <div key={shortcut.keys} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
              <span className="text-navy-200">{shortcut.action}</span>
              <kbd className="px-2 py-0.5 rounded bg-white/10 text-xs text-navy-200 font-mono">{shortcut.keys}</kbd>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Database size={18} className="text-cosmic-violet" />
          <h3 className="text-sm font-semibold text-white">{t('settings.systemInfo')}</h3>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between p-2 rounded-lg bg-white/5">
            <span className="text-navy-200">{t('settings.application')}</span>
            <span className="text-white">{t('app.version')}</span>
          </div>
          <div className="flex justify-between p-2 rounded-lg bg-white/5">
            <span className="text-navy-200">{t('settings.storageLabel')}</span>
            <span className="text-white">{t('settings.storage')}</span>
          </div>
          <div className="flex justify-between p-2 rounded-lg bg-white/5">
            <span className="text-navy-200">{t('settings.notificationEngine')}</span>
            <span className="text-white">{t('settings.scheduler')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
