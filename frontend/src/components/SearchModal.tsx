import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ArrowRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useTranslation } from '../i18n/t';

export default function SearchModal() {
  const { t } = useTranslation();
  const { showSearch, toggleSearch, search, searchResults, searchQuery, setSearchQuery, setPage } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [debounce, setDebounce] = useState<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (showSearch && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showSearch]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        toggleSearch();
      }
      if (e.key === 'Escape' && showSearch) {
        toggleSearch();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showSearch, toggleSearch]);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (debounce) clearTimeout(debounce);
    if (q.trim().length < 2) return;
    const timeout = setTimeout(() => search(q), 300);
    setDebounce(timeout);
  };

  const navigateTo = (page: string) => {
    setPage(page as any);
    toggleSearch();
  };

  const getPageForCollection = (col: string) => {
    const map: Record<string, string> = {
      deadlines: 'deadlines',
      notes: 'notes',
      planner: 'planner',
      journal: 'journal',
      boards: 'boards',
    };
    return map[col] || 'dashboard';
  };

  return (
    <AnimatePresence>
      {showSearch && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
          onClick={toggleSearch}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl glass-card p-4 mx-4"
          >
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <Search size={18} className="text-navy-300" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={t('search.placeholder')}
                className="flex-1 bg-transparent border-none outline-none text-white placeholder-navy-300/50 text-sm"
              />
              <button onClick={toggleSearch} className="text-navy-300 hover:text-white">
                <X size={16} />
              </button>
            </div>

            {searchResults && (
              <div className="mt-3 max-h-60 overflow-y-auto space-y-2">
                {Object.entries(searchResults).map(([collection, items]: [string, any]) => (
                  <div key={collection}>
                    <p className="text-[10px] uppercase tracking-wider text-navy-300/50 px-1 mb-1">
                      {collection}
                    </p>
                    {(items as any[]).slice(0, 5).map((item: any) => (
                      <button
                        key={item.id}
                        onClick={() => navigateTo(getPageForCollection(collection))}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-left text-sm text-navy-100 transition-colors"
                      >
                        <ArrowRight size={12} className="text-navy-400" />
                        <span className="truncate">{item.title || item.date || item.id}</span>
                      </button>
                    ))}
                  </div>
                ))}
                {Object.keys(searchResults).length === 0 && (
                  <p className="text-sm text-navy-300/50 text-center py-4">{t('search.noResults')}</p>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
