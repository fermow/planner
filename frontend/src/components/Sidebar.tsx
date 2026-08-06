import { motion } from 'framer-motion';
import {
  LayoutDashboard, Clock, Calendar, BookOpen, Columns3, Settings, BarChart3, Sparkles, TreePine, Users, Music4,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Page } from '../types';
import { useTranslation } from '../i18n/t';

export default function Sidebar() {
  const { t } = useTranslation();
  const { currentPage, setPage, notifications, sidebarOpen, setSidebarOpen, theme, toggleTheme } = useStore();

  const navItems: { page: Page; label: string; icon: React.ReactNode }[] = [
    { page: 'dashboard', label: t('nav.dashboard'), icon: <LayoutDashboard size={18} /> },
    { page: 'deadlines', label: t('nav.deadlines'), icon: <Clock size={18} /> },
    { page: 'planner', label: t('nav.planner'), icon: <Calendar size={18} /> },
    { page: 'journal', label: t('nav.journal'), icon: <BookOpen size={18} /> },
    { page: 'boards', label: t('nav.boards'), icon: <Columns3 size={18} /> },
    { page: 'life-tree', label: t('nav.lifeTree'), icon: <TreePine size={18} /> },
    { page: 'connections', label: t('nav.connections'), icon: <Users size={18} /> },
    { page: 'music', label: t('nav.music'), icon: <Music4 size={18} /> },
    { page: 'reports', label: t('nav.reports'), icon: <BarChart3 size={18} /> },
    { page: 'settings', label: t('nav.settings'), icon: <Settings size={18} /> },
  ];

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <>
      {/* Desktop sidebar — always visible */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-56 z-40 glass-card rounded-none border-l-0 border-t-0 border-b-0 flex-col">
        <div className="flex items-center gap-2 px-5 h-16 border-b border-white/5">
          <span className="text-xl">{theme === 'kawaii' ? '🎀' : '⭐'}</span>
          <span className={`text-lg font-display font-semibold bg-gradient-to-r bg-clip-text text-transparent ${
            theme === 'kawaii' ? 'from-cosmic-rose to-cosmic-gold' : 'from-cosmic-cyan to-cosmic-gold'
          }`}>
            {theme === 'kawaii' ? t('nav.kittyDesk') : t('app.title')}
          </span>
        </div>
        <nav className="flex-1 flex flex-col gap-1 p-3 mt-2">
          {navItems.map((item) => {
            const active = currentPage === item.page;
            return (
              <motion.button
                key={item.page}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setPage(item.page)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${active ? 'bg-white/10 text-cosmic-cyan shadow-glow' : 'text-navy-200 hover:text-white hover:bg-white/5'}`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.page === 'deadlines' && unread > 0 && (
                  <span className="ml-auto flex items-center justify-center w-5 h-5 rounded-full bg-cosmic-rose text-[10px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </motion.button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/5 space-y-2">
          <button onClick={toggleTheme}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all hover:bg-white/5">
            <Sparkles size={14} className={theme === 'kawaii' ? 'text-cosmic-rose' : 'text-navy-300'} />
            <span className={theme === 'kawaii' ? 'text-cosmic-rose' : 'text-navy-200/60'}>
              {theme === 'kawaii' ? t('nav.kittyModeOn') : t('nav.kittyModeOff')}
            </span>
          </button>
          <p className="text-[10px] text-navy-200/40 text-center leading-relaxed">
            {theme === 'kawaii' ? t('nav.kittyTitle') : t('nav.celestialTitle')}
          </p>
        </div>
      </aside>

      {/* Mobile sidebar drawer */}
      <motion.aside
        initial={false}
        animate={{ x: sidebarOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 250 }}
        className="md:hidden fixed left-0 top-0 h-full w-64 z-50 glass-card rounded-none border-l-0 border-t-0 border-b-0 flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 h-14 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-xl">{theme === 'kawaii' ? '🎀' : '⭐'}</span>
            <span className={`text-lg font-display font-semibold bg-gradient-to-r bg-clip-text text-transparent ${
              theme === 'kawaii' ? 'from-cosmic-rose to-cosmic-gold' : 'from-cosmic-cyan to-cosmic-gold'
            }`}>
              {theme === 'kawaii' ? t('nav.kittyDesk') : t('app.title')}
            </span>
          </div>
          <button onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-navy-200">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 flex flex-col gap-1 p-3 mt-2 overflow-y-auto">
          {navItems.map((item) => {
            const active = currentPage === item.page;
            return (
              <button key={item.page}
                onClick={() => { setPage(item.page); setSidebarOpen(false); }}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all
                  ${active ? 'bg-white/10 text-cosmic-cyan' : 'text-navy-200 hover:text-white hover:bg-white/5'}`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.page === 'deadlines' && unread > 0 && (
                  <span className="ml-auto flex items-center justify-center w-5 h-5 rounded-full bg-cosmic-rose text-[10px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </motion.aside>
    </>
  );
}
