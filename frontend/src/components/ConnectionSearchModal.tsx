import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Clock, Tag, Users, FileText } from 'lucide-react';
import { Connection } from '../types';
import { useStore } from '../store/useStore';
import { useTranslation } from '../i18n/t';
import { NODE_LABELS, NodeLabel, resolveConnectionLabel, getConnectionColor } from './connectionLabels';

interface ConnectionSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (conn: Connection) => void;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function tokenize(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

function fuzzyScore(conn: Connection, tokens: string[]): { score: number; matches: Record<string, boolean> } {
  if (tokens.length === 0) return { score: 0, matches: {} };
  let score = 0;
  const fields: { value: string; key: string; weight: number }[] = [
    { value: conn.name || '', key: 'name', weight: 3 },
    { value: conn.label || conn.relationship || '', key: 'label', weight: 2 },
    { value: conn.description || '', key: 'description', weight: 1 },
    { value: (conn.tags || []).join(' '), key: 'tags', weight: 1 },
  ];
  const matches: Record<string, boolean> = {};
  for (const token of tokens) {
    for (const field of fields) {
      if (field.value.toLowerCase().includes(token)) {
        score += field.weight;
        matches[field.key] = true;
      }
    }
  }
  return { score, matches: matches };
}

function highlightText(text: string, query: string): JSX.Element[] {
  if (!query.trim() || !text) return [<span key="0">{text || ''}</span>];
  const tokens = tokenize(query);
  if (tokens.length === 0) return [<span key="0">{text}</span>];
  const pattern = tokens.map(escapeRegex).join('|');
  const regex = new RegExp(`(${pattern})`, 'gi');
  const parts = text.split(regex).filter((p) => p !== '');
  return parts.map((part, i) => {
    const isMatch = tokens.some((t) => part.toLowerCase() === t);
    return isMatch ? (
      <mark key={i} className="bg-cosmic-cyan/30 text-cosmic-cyan font-medium px-0.5 rounded">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    );
  });
}

export default function ConnectionSearchModal({ isOpen, onClose, onSelect }: ConnectionSearchModalProps) {
  const { t } = useTranslation();
  const {
    connections,
    connectionSearchQuery,
    setConnectionSearchQuery,
    recentConnectionSearches,
    addRecentConnectionSearch,
    clearRecentConnectionSearches,
  } = useStore();

  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery(connectionSearchQuery || '');
      setHighlightedIndex(0);
    }
  }, [isOpen, connectionSearchQuery]);

  // Filtered results
  const filteredResults = useMemo(() => {
    const tokens = tokenize(query);
    return connections
      .map((conn) => {
        const { score, matches } = fuzzyScore(conn, tokens);
        return { conn, score, matches };
      })
      .filter((item) => {
        if (!item.matches.name && !item.matches.label && !item.matches.description && !item.matches.tags) {
          if (tokens.length > 0) return false;
        }
        return true;
      })
      .filter((item) => {
        if (selectedLabels.length === 0) return true;
        const connLabel = resolveConnectionLabel(item.conn);
        return selectedLabels.some(
          (l) => l === connLabel.value || l.toLowerCase() === connLabel.label.toLowerCase()
        );
      })
      .sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        const aNameMatch = a.matches.name ? 1 : 0;
        const bNameMatch = b.matches.name ? 1 : 0;
        return bNameMatch - aNameMatch;
      })
      .slice(0, 12);
  }, [query, connections, selectedLabels]);

  // Label filter helpers
  const toggleLabelFilter = (labelValue: string) => {
    setSelectedLabels((labels) =>
      labels.includes(labelValue)
        ? labels.filter((l) => l !== labelValue)
        : [...labels, labelValue]
    );
  };

  const clearLabelFilters = () => setSelectedLabels([]);

  // Popular labels (by frequency)
  const popularLabels = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const conn of connections) {
      const label = resolveConnectionLabel(conn);
      counts[label.value] = (counts[label.value] || 0) + 1;
    }
    return NODE_LABELS
      .map((l) => ({ ...l, count: counts[l.value] || 0 }))
      .filter((l) => l.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [connections]);

  const handleSelect = (conn: Connection) => {
    addRecentConnectionSearch(query || conn.name);
    setConnectionSearchQuery(query || conn.name);
    onSelect(conn);
    onClose();
  };

  const handleRecentClick = (text: string) => {
    setQuery(text);
    setHighlightedIndex(0);
  };

  // Build the unified list for keyboard navigation
  const navItems: { type: string; conn?: Connection; text?: string; label?: NodeLabel }[] = useMemo(() => {
    if (query.trim() || selectedLabels.length > 0) {
      return filteredResults.map((r) => ({ type: 'result' as const, conn: r.conn! }));
    } else {
      const items: { type: string; conn?: Connection; text?: string; label?: NodeLabel }[] = [];
      items.push(...recentConnectionSearches.map((s) => ({ type: 'recent' as const, text: s })));
      items.push(...popularLabels.map((l) => ({ type: 'label' as const, label: l })));
      return items;
    }
  }, [query, selectedLabels, filteredResults, recentConnectionSearches, popularLabels]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setHighlightedIndex(0);
  };

  // Keyboard handling
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'ArrowDown') {
        if (navItems.length > 0) {
          e.preventDefault();
          setHighlightedIndex((i) => (i + 1) % navItems.length);
        }
      }
      if (e.key === 'ArrowUp') {
        if (navItems.length > 0) {
          e.preventDefault();
          setHighlightedIndex((i) => (i - 1 + navItems.length) % navItems.length);
        }
      }
      if (e.key === 'Enter') {
        if (navItems.length > 0) {
          e.preventDefault();
          const item = navItems[highlightedIndex];
          if (item.type === 'result' && item.conn) {
            handleSelect(item.conn);
          } else if (item.type === 'recent' && item.text) {
            setQuery(item.text);
            setHighlightedIndex(0);
          } else if (item.type === 'label' && item.label) {
            toggleLabelFilter(item.label.value);
          }
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, highlightedIndex, onClose, navItems, selectedLabels, query, recentConnectionSearches, popularLabels]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] pb-8 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl glass-card mx-4 overflow-hidden"
            style={{ borderRadius: '16px', maxHeight: '72vh' }}
          >
            {/* Search input */}
            <div className="p-3 border-b border-white/10">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder={t('connections.searchPlaceholder')}
                  className="w-full bg-transparent border-none outline-none text-sm text-white placeholder-navy-300/50 pl-10 pr-3 py-2"
                  autoComplete="off"
                  spellCheck={false}
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-300 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Filter chips */}
              {selectedLabels.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedLabels.map((labelValue) => {
                    const label = NODE_LABELS.find((l) => l.value === labelValue) || NODE_LABELS[NODE_LABELS.length - 1];
                    return (
                      <span
                        key={labelValue}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={{ background: `${label.color}20`, color: label.color }}
                      >
                        {label.icon} {label.label}
                        <button
                          onClick={() => toggleLabelFilter(labelValue)}
                          className="hover:opacity-70"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    );
                  })}
                  {selectedLabels.length > 1 && (
                    <button
                      onClick={clearLabelFilters}
                      className="text-[10px] text-navy-300/60 hover:text-white underline"
                    >
                      {t('connections.clearFilters')}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Results / Recent / Labels */}
            <div className="max-h-[40vh] overflow-y-auto no-scrollbar">
              <AnimatePresence>
                {navItems.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="py-8 text-center"
                  >
                    <Search size={32} className="mx-auto text-navy-300/15 mb-3" />
                    <p className="text-sm text-navy-200/40">
                      {query
                        ? t('connections.noSearchResults')
                        : t('connections.searchEmpty')}
                    </p>
                    {!query && (
                      <p className="text-[11px] text-navy-300/30 mt-1">
                        {t('connections.searchHint2')}
                      </p>
                    )}
                  </motion.div>
                ) : (
                  (() => {
                    if (query.trim() || selectedLabels.length > 0) {
                      // Show results
                      return filteredResults.map((item, idx) => {
                        const conn = item.conn!;
                        const label = resolveConnectionLabel(conn);
                        const color = getConnectionColor(conn);
                        const icon = conn.icon || conn.emoji || '👤';
                        const isHighlighted = idx === highlightedIndex;

                        return (
                          <motion.button
                            key={conn.id}
                            type="button"
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -8 }}
                            transition={{ duration: 0.15, delay: idx * 0.02 }}
                            onClick={() => handleSelect(conn)}
                            onMouseEnter={() => setHighlightedIndex(idx)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all ${
                              isHighlighted
                                ? 'bg-cosmic-cyan/10 border-l-2 border-cosmic-cyan'
                                : 'hover:bg-white/5 border-l-2 border-transparent'
                            }}`}
                          >
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0"
                              style={{ background: `${color}20`, border: `2px solid ${color}40` }}
                            >
                              {icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-white font-medium truncate">
                                {highlightText(conn.name, query)}
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span
                                  className="text-[9px] px-1.5 py-0.5 rounded-full"
                                  style={{ background: `${color}20`, color }}
                                >
                                  {label.label}
                                </span>
                                {conn.description && (
                                  <span className="text-[9px] text-navy-300/40 truncate max-w-[120px]">
                                    {highlightText(conn.description.slice(0, 40), query)}
                                  </span>
                                )}
                              </div>
                            </div>
                            {item.matches.name && (
                              <FileText size={10} className="text-cosmic-cyan shrink-0" />
                            )}
                          </motion.button>
                        );
                      });
                    }

                    // Show recent + labels when no query and no filters
                    return (
                      <div>
                        {recentConnectionSearches.length > 0 && (
                          <>
                            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-navy-300/40">
                              {t('connections.recentSearches')}
                            </div>
                            {recentConnectionSearches.map((searchText, idx) => (
                              <motion.button
                                key={`recent-${idx}`}
                                type="button"
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -8 }}
                                transition={{ duration: 0.15, delay: idx * 0.02 }}
                                onClick={() => handleRecentClick(searchText)}
                                onMouseEnter={() => setHighlightedIndex(idx)}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-all ${
                                  idx === highlightedIndex
                                    ? 'bg-cosmic-cyan/10 border-l-2 border-cosmic-cyan'
                                    : 'hover:bg-white/5 border-l-2 border-transparent'
                                }`}
                              >
                                <Clock size={12} className="text-navy-300 shrink-0" />
                                <span className="text-sm text-navy-200 truncate">{searchText}</span>
                              </motion.button>
                            ))}
                          </>
                        )}

                        <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-navy-300/40">
                          {t('connections.popularLabels')}
                        </div>
                        {popularLabels.map((label, idx) => {
                          const offset = recentConnectionSearches.length;
                          return (
                            <motion.button
                              key={`label-${label.value}`}
                              type="button"
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -8 }}
                              transition={{ duration: 0.15, delay: (idx + offset) * 0.02 }}
                              onClick={() => toggleLabelFilter(label.value)}
                              onMouseEnter={() => setHighlightedIndex(idx + offset)}
                              className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-all ${
                                idx + offset === highlightedIndex
                                  ? 'bg-cosmic-cyan/10 border-l-2 border-cosmic-cyan'
                                  : 'hover:bg-white/5 border-l-2 border-transparent'
                              }`}
                            >
                              <span
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
                                style={{ background: `${label.color}20`, border: `2px solid ${label.color}40` }}
                              >
                                {label.icon}
                              </span>
                              <div className="flex-1 min-w-0">
                                <span className="text-sm text-navy-100">{label.label}</span>
                              </div>
                              <span className="text-[9px] text-navy-300/40 shrink-0">
                                {label.count} {t('connections.nodes')}
                              </span>
                            </motion.button>
                          );
                        })}

                        <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-navy-300/40">
                          {t('connections.allLabels')}
                        </div>
                        {NODE_LABELS.filter((l) => !popularLabels.some((p) => p.value === l.value))
                          .map((label, idx) => {
                            const offset = (recentConnectionSearches.length || 0) + popularLabels.length;
                            return (
                              <motion.button
                                key={`all-label-${label.value}`}
                                type="button"
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -8 }}
                                transition={{ duration: 0.15, delay: (idx + offset) * 0.02 }}
                                onClick={() => toggleLabelFilter(label.value)}
                                onMouseEnter={() => setHighlightedIndex(idx + offset)}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-all ${
                                  idx + offset === highlightedIndex
                                    ? 'bg-cosmic-cyan/10 border-l-2 border-cosmic-cyan'
                                    : 'hover:bg-white/5 border-l-2 border-transparent'
                                }`}
                              >
                                <span
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
                                  style={{ background: `${label.color}20`, border: `2px solid ${label.color}40` }}
                                >
                                  {label.icon}
                                </span>
                                <span className="text-sm text-navy-200 truncate">{label.label}</span>
                              </motion.button>
                            );
                          })}
                      </div>
                    );
                  })()
                )}
              </AnimatePresence>
            </div>

            {/* Footer hint */}
            <div className="px-3 py-2 border-t border-white/5 text-[9px] text-navy-300/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <kbd className="px-1 py-0.5 bg-white/5 rounded">↑↓</kbd>
                <span>{t('connections.navHint')}</span>
                <kbd className="px-1 py-0.5 bg-white/5 rounded">Enter</kbd>
                <span>{t('connections.selectHint')}</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-white/5 rounded">Esc</kbd>
                <span>{t('connections.closeHint')}</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
