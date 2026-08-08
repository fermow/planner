import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Bell, Menu, LayoutDashboard, Clock, Calendar,
  BookOpen, Columns3, BarChart3, Settings, Sparkles, TreePine, Users, Music4,
} from 'lucide-react';
import Sidebar from './Sidebar';
import NotificationToast from './NotificationToast';
import SearchModal from './SearchModal';
import { useStore } from '../store/useStore';
import { useClock } from '../hooks/useClock';
import { useMusicPlayer } from './MusicPlayerProvider';
import type { Page } from '../types';
import { useTranslation } from '../i18n/t';
import Dashboard from '../pages/Dashboard';
import DeadlinesPage from '../pages/Deadlines';
import PlannerPage from '../pages/Planner';
import JournalPage from '../pages/Journal';
import BoardsPage from '../pages/Boards';
import ReportsPage from '../pages/Reports';
import SettingsPage from '../pages/Settings';
import LifeTreePage from '../pages/LifeTree';
import ConnectionsPage from '../pages/Connections';
import MusicPage from '../pages/Music';
import CalendarPage from '../pages/Calendar';

export default function Layout() {
  const { currentPage, setPage, toggleSearch, notifications, dismissNotification, sidebarOpen, toggleSidebar, setSidebarOpen, theme, toggleTheme } = useStore();
  const { currentTrack } = useMusicPlayer();
  const unread = notifications.filter((n) => !n.read);
  const clock = useClock();
  const { t } = useTranslation();

  const pageTitles: Record<string, string> = {
    dashboard: t('nav.dashboard'),
    deadlines: t('deadline.title'),
    planner: t('planner.title'),
    journal: t('journal.title'),
    boards: t('nav.boards'),
    reports: t('nav.reports'),
    settings: t('nav.settings'),
    'life-tree': t('nav.lifeTree'),
    connections: t('nav.connections'),
    music: t('nav.music'),
    calendar: t('nav.calendar'),
  };

  const bottomNavItems: { page: Page; label: string; icon: React.ReactNode }[] = [
    { page: 'dashboard', label: t('nav.home'), icon: <LayoutDashboard size={20} /> },
    { page: 'deadlines', label: t('nav.deadlines'), icon: <Clock size={20} /> },
    { page: 'planner', label: t('nav.planner'), icon: <Calendar size={20} /> },
    { page: 'life-tree', label: t('nav.lifeTree'), icon: <TreePine size={20} /> },
    { page: 'connections', label: t('nav.people'), icon: <Users size={20} /> },
    { page: 'reports', label: t('nav.reports'), icon: <BarChart3 size={20} /> },
    { page: 'music', label: t('nav.music'), icon: <Music4 size={20} /> },
  ];

  const timeStr = clock.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarOpen]);

  // Remove the data-refetch effect — each page handles its own data loading

  return (
    <div className={`flex min-h-screen ${currentTrack ? 'pb-40 md:pb-24' : 'pb-16 md:pb-0'}`}>
      <Sidebar />

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      <div className="flex-1 ml-0 md:ml-56 relative z-10 transition-all duration-300 flex flex-col min-h-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 glass-card rounded-none border-t-0 border-l-0 border-r-0 px-3 md:px-8 h-12 md:h-14 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={toggleSidebar}
              className="md:hidden p-1.5 rounded-lg hover:bg-white/5 text-navy-200 hover:text-white transition-all"
              aria-label={t('header.toggleSidebar')}
            >
              <Menu size={18} />
            </button>
            <motion.h1
              key={currentPage}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm md:text-lg font-display font-semibold text-white truncate max-w-[120px] md:max-w-none"
            >
              {theme === 'kawaii' ? t('app.title.kitty') : ''}{pageTitles[currentPage] || t('app.title')}
            </motion.h1>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Live clock */}
            <div className="hidden sm:flex items-center gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-lg bg-white/5 text-cosmic-cyan font-mono text-xs md:text-sm tracking-wider">
              <span className="hidden md:inline text-navy-300/50 text-[10px] uppercase tracking-widest">UTC{clock.getTimezoneOffset() <= 0 ? '+' : '-'}{String(Math.abs(Math.floor(clock.getTimezoneOffset() / 60))).padStart(2, '0')}:{String(Math.abs(clock.getTimezoneOffset() % 60)).padStart(2, '0')}</span>
              {timeStr}
            </div>
            {/* Search button */}
            <button
              onClick={toggleSearch}
              className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 rounded-lg text-xs text-navy-200 hover:text-white hover:bg-white/5 border border-white/5 transition-all"
              aria-label={t('header.search')}
            >
              <Search size={14} />
              <span className="hidden md:inline">{t('header.search')}</span>
              <kbd className="hidden md:inline text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-navy-300">{t('header.searchHint')}</kbd>
            </button>

            {/* Notifications */}
            <div className="relative group">
              <button className="relative p-1.5 md:p-2 rounded-lg hover:bg-white/5 text-navy-200 hover:text-white transition-all" aria-label={t('header.notifications')}>
                <Bell size={16} />
                {unread.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-cosmic-rose text-[9px] font-bold text-white flex items-center justify-center">
                    {unread.length}
                  </span>
                )}
              </button>

              {/* Dropdown */}
              {unread.length > 0 && (
                <div className="absolute right-0 top-full mt-2 w-72 glass-card p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <p className="text-[10px] uppercase tracking-wider text-navy-300/50 px-2 mb-1">
                    {t('header.notifications')}
                  </p>
                  {unread.slice(0, 5).map((n) => (
                    <div key={n.id} className="flex items-start gap-2 px-2 py-2 rounded-lg hover:bg-white/5 text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="text-navy-100 truncate">{n.title}</p>
                        <p className="text-[11px] text-navy-300/60">{n.type}</p>
                      </div>
                      <button
                        onClick={() => dismissNotification(n.id)}
                        className="text-navy-300 hover:text-white text-[10px] shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-3 md:p-8 flex-1 min-h-0 overflow-auto">
          {currentPage === 'dashboard' && <Dashboard key="dashboard" />}
          {currentPage === 'deadlines' && <DeadlinesPage key="deadlines" />}
          {currentPage === 'planner' && <PlannerPage key="planner" />}
          {currentPage === 'journal' && <JournalPage key="journal" />}
          {currentPage === 'boards' && <BoardsPage key="boards" />}
          {currentPage === 'reports' && <ReportsPage key="reports" />}
          {currentPage === 'settings' && <SettingsPage key="settings" />}
          {currentPage === 'life-tree' && <LifeTreePage key="life-tree" />}
          {currentPage === 'connections' && <ConnectionsPage key="connections" />}
          {currentPage === 'music' && <MusicPage key="music" />}
          {currentPage === 'calendar' && <CalendarPage key="calendar" />}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-card rounded-none border-b-0 border-l-0 border-r-0 px-1 pb-safe">
        <div className="flex items-center justify-around py-1">
          {bottomNavItems.map((item) => {
            const active = currentPage === item.page;
            return (
              <button
                key={item.page}
                onClick={() => setPage(item.page)}
                className={`relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all min-w-0 flex-1 ${
                  active
                    ? 'text-cosmic-cyan'
                    : 'text-navy-300/60 hover:text-navy-200'
                }`}
              >
                <div className={`p-1 rounded-lg transition-all ${
                  active ? 'bg-cosmic-cyan/10' : ''
                }`}>
                  {item.icon}
                </div>
                <span className="text-[10px] font-medium leading-none truncate w-full text-center">
                  {item.label}
                </span>
                {item.page === 'deadlines' && notifications.filter((n) => !n.read).length > 0 && (
                  <span className="absolute -top-0.5 right-1/4 w-2 h-2 rounded-full bg-cosmic-rose" />
                )}
              </button>
            );
          })}
          {/* Theme toggle on mobile */}
          <button
            onClick={toggleTheme}
            className={`relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all min-w-0 flex-1 ${
              theme === 'kawaii'
                ? 'text-cosmic-rose'
                : 'text-navy-300/60 hover:text-navy-200'
            }`}
          >
            <div className={`p-1 rounded-lg transition-all ${
              theme === 'kawaii' ? 'bg-cosmic-rose/10' : ''
            }`}>
              <Sparkles size={20} />
            </div>
            <span className="text-[10px] font-medium leading-none truncate w-full text-center">
              {theme === 'kawaii' ? t('nav.kittyMode') : t('theme.cosmic')}
            </span>
          </button>
        </div>
      </nav>

      <NotificationToast />
      <SearchModal />
    </div>
  );
}
