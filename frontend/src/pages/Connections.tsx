import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Users, Edit3, Trash2, Search, Network } from 'lucide-react';
import { useTranslation } from '../i18n/t';
import { useStore } from '../store/useStore';
import type { Connection } from '../types';
import ConnectionsGraph from '../components/ConnectionsGraph';
import ConnectionSearchModal from '../components/ConnectionSearchModal';
import NodeCommandModal from '../components/NodeCommandModal';
import { resolveConnectionLabel, getConnectionColor } from '../components/connectionLabels';

type NodeFormData = {
  name: string;
  label: string;
  icon: string;
  color: string;
  description: string;
  tags: string[];
  parent_id?: string | null;
};

export default function ConnectionsPage() {
  const { t } = useTranslation();
  const {
    connections,
    fetchConnections,
    addConnection,
    editConnection,
    removeConnection,
    updateConnectionPositions,
  } = useStore();

  const [showSearch, setShowSearch] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Connection | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  // Ctrl+K / Cmd+K opens search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') {
        setSelectedIds(new Set());
        setFocusNodeId(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleAddNode = useCallback((parentId: string | null) => {
    setEditing(null);
    setDefaultParentId(parentId);
    setShowCreate(true);
  }, []);

  const handleEditNode = useCallback((conn: Connection) => {
    setEditing(conn);
    setDefaultParentId(conn.parent_id || null);
    setShowCreate(true);
  }, []);

  const handleDeleteNode = useCallback(
    async (conn: Connection) => {
      await removeConnection(conn.id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(conn.id);
        return next;
      });
      setFocusNodeId(null);
    },
    [removeConnection]
  );

  const handleSave = useCallback(
    async (data: NodeFormData) => {
      if (editing) {
        await editConnection(editing.id, data);
      } else {
        await addConnection(data);
      }
    },
    [editing, addConnection, editConnection]
  );

  const handleSearchSelect = useCallback((conn: Connection) => {
    setSelectedIds(new Set([conn.id]));
    setFocusNodeId(conn.id);
  }, []);

  const handlePositionsChange = useCallback(
    (positions: { id: string; x: number; y: number }[]) => {
      updateConnectionPositions(positions);
    },
    [updateConnectionPositions]
  );

  const focusNode = useCallback((id: string) => {
    setSelectedIds(new Set([id]));
    setFocusNodeId(id);
  }, []);

  const selectedConn = selectedIds.size === 1
    ? connections.find((c) => c.id === [...selectedIds][0]) ?? null
    : null;

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg md:text-2xl font-display text-white flex items-center gap-2">
            <Users size={20} className="text-cosmic-cyan" />
            {t('connections.title')}
          </h2>
          <p className="text-xs md:text-sm text-navy-200/60">
            {t('connections.count', { n: connections.length })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-navy-200 hover:text-white border border-white/10 transition-all"
          >
            <Search size={14} />
            <span className="hidden sm:inline">{t('connections.searchAction')}</span>
            <kbd className="hidden md:inline text-[9px] px-1 py-0.5 rounded bg-white/10 text-navy-300">
              Ctrl K
            </kbd>
          </button>
          <button
            onClick={() => handleAddNode(null)}
            className="celestial-btn celestial-btn-primary text-xs flex items-center gap-1.5 px-3 py-2"
          >
            <Plus size={14} /> {t('connections.addPerson')}
          </button>
        </div>
      </div>

      {/* Graph */}
      <div className="glass-card p-1.5 md:p-2 overflow-hidden rounded-2xl">
        <ConnectionsGraph
          connections={connections}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onEditNode={handleEditNode}
          onDeleteNode={handleDeleteNode}
          onAddNode={handleAddNode}
          onPositionsChange={handlePositionsChange}
          focusNodeId={focusNodeId}
        />
      </div>

      {/* Nodes list */}
      {connections.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs uppercase tracking-wider text-navy-300/40 flex items-center gap-1.5">
              <Network size={12} /> {t('connections.allLabels')}
            </h3>
            <span className="text-[10px] text-navy-300/40">
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : `${connections.length} nodes`}
            </span>
          </div>

          <div className="md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-3 flex md:block gap-3 overflow-x-auto snap-x snap-mandatory pb-2 md:pb-0 no-scrollbar">
            {connections.map((c, i) => {
              const color = getConnectionColor(c);
              const label = resolveConnectionLabel(c);
              const icon = c.icon || c.emoji || '👤';
              const isSelected = selectedIds.has(c.id);
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => focusNode(c.id)}
                  className={`snap-start min-w-[240px] md:min-w-0 glass-card p-3 md:p-4 transition-all cursor-pointer ${
                    isSelected ? 'ring-2 ring-cosmic-cyan/40' : 'hover:ring-1 hover:ring-white/10'
                  }`}
                >
                  <div className="flex items-start gap-2 md:gap-3">
                    <div
                      className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-lg md:text-xl shrink-0"
                      style={{ background: `${color}20`, border: `2px solid ${color}40` }}
                    >
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="text-sm font-semibold text-white truncate">{c.name}</h3>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEditNode(c); }}
                            className="p-1 rounded hover:bg-white/5 text-navy-300/40 hover:text-cosmic-cyan"
                          >
                            <Edit3 size={11} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteNode(c); }}
                            className="p-1 rounded hover:bg-white/5 text-navy-300/40 hover:text-cosmic-rose"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span
                          className="text-[9px] md:text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{ background: `${color}20`, color }}
                        >
                          {label.label}
                        </span>
                      </div>
                      {c.description && (
                        <p className="text-xs text-navy-200/60 mt-1 line-clamp-2">{c.description}</p>
                      )}
                      {c.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {c.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="text-[8px] md:text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-navy-300/60">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="glass-card p-10 text-center">
          <Users size={48} className="mx-auto text-navy-300/20 mb-3" />
          <p className="text-sm text-navy-200/40">{t('connections.empty')}</p>
          <button
            onClick={() => handleAddNode(null)}
            className="celestial-btn celestial-btn-primary text-xs mt-4 inline-flex items-center gap-1.5"
          >
            <Plus size={14} /> {t('connections.addPerson')}
          </button>
        </div>
      )}

      {/* Selection info bar */}
      {selectedConn && (
        <div className="glass-card p-3 flex items-center gap-3 fixed bottom-4 left-1/2 -translate-x-1/2 z-30 shadow-2xl">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
            style={{
              background: `${getConnectionColor(selectedConn)}20`,
              border: `2px solid ${getConnectionColor(selectedConn)}40`,
            }}
          >
            {selectedConn.icon || selectedConn.emoji || '👤'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate max-w-[180px]">{selectedConn.name}</p>
            <p className="text-[10px] text-navy-300/50">{resolveConnectionLabel(selectedConn).label}</p>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => handleEditNode(selectedConn)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-navy-300 hover:text-cosmic-cyan"
            >
              <Edit3 size={13} />
            </button>
            <button
              onClick={() => handleDeleteNode(selectedConn)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-navy-300 hover:text-cosmic-rose"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Search modal */}
      <ConnectionSearchModal
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onSelect={handleSearchSelect}
      />

      {/* Create / edit modal */}
      <NodeCommandModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSave={handleSave}
        editing={editing}
        connections={connections}
        defaultParentId={defaultParentId}
      />
    </div>
  );
}
