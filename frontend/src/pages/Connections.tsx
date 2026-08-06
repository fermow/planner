import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Users, Edit3, Trash2, User, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useTranslation } from '../i18n/t';
import { useStore } from '../store/useStore';
import type { Connection } from '../types';

const RELATIONSHIP_OPTIONS = [
  { value: 'friend', label: 'connections.relationFriend', icon: '🤝' },
  { value: 'family', label: 'connections.relationFamily', icon: '👨‍👩‍👧‍👦' },
  { value: 'colleague', label: 'connections.relationColleague', icon: '💼' },
  { value: 'mentor', label: 'connections.relationMentor', icon: '🧠' },
  { value: 'student', label: 'connections.relationStudent', icon: '📚' },
  { value: 'partner', label: 'connections.relationPartner', icon: '💕' },
  { value: 'client', label: 'connections.relationClient', icon: '🤝' },
  { value: 'other', label: 'connections.relationOther', icon: '⭐' },
];

const RELATIONSHIP_COLORS: Record<string, string> = {
  friend: '#40e0d0', family: '#f0c040', colleague: '#8040e0', mentor: '#40a0e0',
  student: '#60d040', partner: '#e040a0', client: '#e08040', other: '#9fa8da',
};

const EMOJI_OPTIONS = ['👤', '🌟', '💼', '🎓', '💻', '🎨', '📝', '🔬', '🏥', '⚖️', '🎵', '🏆', '🌍', '💡', '❤️', '🚀'];

const NODE_RADIUS = 28;
const ME_RADIUS = 42;
const LEVEL_GAP = 150;
const SIBLING_GAP = 80;

type TreeNode = {
  connection: Connection | null;
  children: TreeNode[];
  x: number;
  y: number;
  depth: number;
};

export default function ConnectionsPage() {
  const { t } = useTranslation();
  const { connections, fetchConnections, addConnection, editConnection, removeConnection, showToast } = useStore();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Connection | null>(null);
  const [form, setForm] = useState({ name: '', relationship: 'friend', description: '', emoji: '👤', tags: '' });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.7);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => { fetchConnections(); }, [fetchConnections]);

  const tree = useMemo((): TreeNode => {
    const root: TreeNode = { connection: null, children: [], x: 0, y: 0, depth: 0 };
    const map = new Map<string, TreeNode>();
    for (const c of connections) map.set(c.id, { connection: c, children: [], x: 0, y: 0, depth: 0 });
    for (const c of connections) {
      const node = map.get(c.id)!;
      if (c.parent_id && map.has(c.parent_id)) {
        const parent = map.get(c.parent_id)!;
        parent.children.push(node);
        node.depth = parent.depth + 1;
      } else {
        root.children.push(node);
        node.depth = 1;
      }
    }
    return root;
  }, [connections]);

  const layoutTree = useCallback((node: TreeNode, cx: number, cy: number) => {
    const queue: { node: TreeNode; cx: number; cy: number }[] = [{ node, cx, cy }];
    while (queue.length > 0) {
      const { node, cx, cy } = queue.shift()!;
      node.x = cx; node.y = cy;
      const count = node.children.length;
      if (count === 0) continue;
      const startX = cx - ((count - 1) * SIBLING_GAP) / 2;
      for (let i = 0; i < count; i++) {
        queue.push({ node: node.children[i], cx: startX + i * SIBLING_GAP, cy: cy + LEVEL_GAP });
      }
    }
  }, []);

  const nodes = useMemo(() => {
    const treeRoot = tree;
    layoutTree(treeRoot, 400, 70);
    const flat: { node: TreeNode; parent: TreeNode | null }[] = [];
    function walk(n: TreeNode, parent: TreeNode | null) {
      for (const child of n.children) {
        flat.push({ node: child, parent });
        walk(child, child);
      }
    }
    walk(treeRoot, treeRoot);
    return flat;
  }, [tree, layoutTree]);

  const maxDepth = useMemo(() => {
    let d = 0;
    for (const { node } of nodes) if (node.depth > d) d = node.depth;
    return Math.max(d, 1);
  }, [nodes]);

  const svgWidth = Math.max(800, nodes.length * SIBLING_GAP + 200);
  const svgHeight = (maxDepth + 1) * LEVEL_GAP + 150;

  function openModal(conn?: Connection) {
    if (conn) {
      setEditing(conn);
      setForm({ name: conn.name, relationship: conn.relationship, description: conn.description, emoji: conn.emoji, tags: conn.tags.join(', ') });
    } else {
      setEditing(null);
      setForm({ name: '', relationship: 'friend', description: '', emoji: '👤', tags: '' });
    }
    setShowModal(true);
  }

  async function save() {
    if (!form.name.trim()) { showToast('Please enter a name', 'error'); return; }
    const tagsArr = form.tags.split(',').map((t) => t.trim()).filter(Boolean);
    const data: any = { name: form.name, relationship: form.relationship, description: form.description, emoji: form.emoji, tags: tagsArr };
    if (editing) {
      await editConnection(editing.id, data);
    } else {
      if (selectedId) data.parent_id = selectedId;
      await addConnection(data);
    }
    setShowModal(false);
  }

  function handleWheel(e: React.WheelEvent) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom((z) => Math.max(0.15, Math.min(3, z - e.deltaY * 0.003)));
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as Element).closest('g')) return;
    setDragging(true);
    setDragStart({ x: e.clientX - pan.x * zoom, y: e.clientY - pan.y * zoom });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setPan({ x: (e.clientX - dragStart.x) / zoom, y: (e.clientY - dragStart.y) / zoom });
  };

  const handleMouseUp = () => setDragging(false);

  const relationshipIcon = (rel: string) => RELATIONSHIP_OPTIONS.find((o) => o.value === rel)?.icon || '🤝';

  const lines = nodes.filter(({ parent }) => parent).map(({ node, parent }) => {
    const color = node.connection ? RELATIONSHIP_COLORS[node.connection.relationship] || '#9fa8da' : '#9fa8da';
    return { x1: parent!.x, y1: parent!.y, x2: node.x, y2: node.y, color, selected: selectedId === node.connection?.id };
  });

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg md:text-2xl font-display text-white flex items-center gap-2">
            <Users size={20} className="text-cosmic-cyan" />
            <span className="hidden md:inline">{t('connections.title')}</span>
            <span className="md:hidden">{t('connections.title')}</span>
          </h2>
          <p className="text-xs md:text-sm text-navy-200/60">{t('connections.count', { n: connections.length })}</p>
        </div>
        <button onClick={() => openModal()}
          className="celestial-btn celestial-btn-primary text-xs flex items-center gap-1.5 px-3 py-2">
          <Plus size={14} /> {t('connections.addPerson')}
        </button>
      </div>

      {/* Graph card */}
      <div className="glass-card p-2 md:p-3 overflow-hidden">
        {/* Zoom controls - scrollable row on mobile */}
        <div className="flex items-center gap-1.5 mb-2 overflow-x-auto no-scrollbar">
          <button onClick={() => setZoom((z) => Math.max(0.15, z - 0.15))}
            className="p-1.5 md:p-2 rounded-lg bg-white/5 hover:bg-white/10 text-navy-200/60 hover:text-white transition-all shrink-0">
            <ZoomOut size={14} />
          </button>
          <span className="text-[10px] text-navy-300/40 font-mono w-10 text-center shrink-0">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(3, z + 0.15))}
            className="p-1.5 md:p-2 rounded-lg bg-white/5 hover:bg-white/10 text-navy-200/60 hover:text-white transition-all shrink-0">
            <ZoomIn size={14} />
          </button>
          <button onClick={() => { setZoom(0.7); setPan({ x: 0, y: 0 }); }}
            className="p-1.5 md:p-2 rounded-lg bg-white/5 hover:bg-white/10 text-navy-200/60 hover:text-white transition-all shrink-0">
            <RotateCcw size={14} />
          </button>
          <span className="text-[9px] text-navy-300/20 ml-auto hidden sm:block whitespace-nowrap">
            Ctrl+scroll zoom · Drag to pan · Tap node to select
          </span>
        </div>

        {/* Touch-friendly graph container */}
        <div className="overflow-auto w-full touch-pan-x touch-pan-y" style={{ maxHeight: '60vh', WebkitOverflowScrolling: 'touch' }}>
          <svg ref={svgRef} width={svgWidth} height={svgHeight}
            viewBox={`${-pan.x / zoom} ${-pan.y / zoom} ${svgWidth / zoom} ${svgHeight / zoom}`}
            className="min-w-[400px]"
            style={{ cursor: dragging ? 'grabbing' : 'grab' }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={(e) => {
              if ((e.target as Element).closest('g')) return;
              const t = e.touches[0];
              setDragging(true);
              setDragStart({ x: t.clientX - pan.x * zoom, y: t.clientY - pan.y * zoom });
            }}
            onTouchMove={(e) => {
              if (!dragging) return;
              const t = e.touches[0];
              setPan({ x: (t.clientX - dragStart.x) / zoom, y: (t.clientY - dragStart.y) / zoom });
            }}
            onTouchEnd={() => setDragging(false)}
          >
            <defs>
              <radialGradient id="meGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#40e0d0" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#40e0d0" stopOpacity={0} />
              </radialGradient>
              <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#8040e0" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#8040e0" stopOpacity={0} />
              </radialGradient>
            </defs>

            {/* Connection lines */}
            {lines.map((l, i) => (
              <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                stroke={l.color} strokeWidth={l.selected ? 3 : 2}
                strokeDasharray={l.selected ? 'none' : '6 4'}
                opacity={l.selected ? 0.9 : 0.4} />
            ))}

            {/* Nodes */}
            {nodes.map(({ node }) => {
              const c = node.connection!;
              const isSelected = selectedId === c.id;
              const color = RELATIONSHIP_COLORS[c.relationship] || '#9fa8da';
              return (
                <g key={c.id} onClick={() => setSelectedId(isSelected ? null : c.id)} style={{ cursor: 'pointer' }}>
                  <circle cx={node.x} cy={node.y} r={NODE_RADIUS + 15} fill="url(#nodeGlow)" opacity={isSelected ? 1 : 0} />
                  <circle cx={node.x} cy={node.y} r={NODE_RADIUS}
                    fill="rgba(18, 18, 42, 0.85)" stroke={color} strokeWidth={isSelected ? 3 : 2} />
                  <text x={node.x} y={node.y + 2} textAnchor="middle" dominantBaseline="central" fontSize={20}>{c.emoji || '👤'}</text>
                  <text x={node.x} y={node.y + NODE_RADIUS + 12} textAnchor="middle"
                    fill={isSelected ? '#40e0d0' : 'rgba(255,255,255,0.7)'} fontSize={9} fontWeight={isSelected ? '600' : '400'}>
                    {c.name.length > 10 ? c.name.slice(0, 9) + '…' : c.name}
                  </text>
                  <text x={node.x + NODE_RADIUS + 2} y={node.y - NODE_RADIUS + 4} fontSize={9}>
                    {relationshipIcon(c.relationship)}
                  </text>
                  {isSelected && (
                    <rect x={node.x - 70} y={node.y + NODE_RADIUS + 18} width={140} height={30} rx={5}
                      fill="rgba(18, 18, 42, 0.95)" stroke={color} strokeWidth={1} />
                  )}
                </g>
              );
            })}

            {/* Me */}
            <g onClick={() => setSelectedId(null)} style={{ cursor: 'pointer' }}>
              <circle cx={tree.x} cy={tree.y} r={ME_RADIUS} fill="rgba(64, 224, 208, 0.15)" stroke="#40e0d0" strokeWidth={3} />
              <circle cx={tree.x} cy={tree.y} r={ME_RADIUS - 4} fill="rgba(18, 18, 42, 0.9)"
                stroke="#40e0d0" strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
              <text x={tree.x} y={tree.y - 4} textAnchor="middle" dominantBaseline="central" fontSize={28}>⭐</text>
              <text x={tree.x} y={tree.y + 18} textAnchor="middle" fill="#40e0d0" fontSize={10} fontWeight={700}>{t('connections.you')}</text>
            </g>
          </svg>
        </div>
      </div>

      {/* Cards — horizontal scroll on mobile, grid on desktop */}
      <div className="md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-3 flex md:block gap-3 overflow-x-auto snap-x snap-mandatory pb-2 md:pb-0 no-scrollbar">
        {connections.length === 0 && (
          <div className="min-w-[250px] md:col-span-full text-center py-12">
            <Users size={48} className="mx-auto text-navy-300/20 mb-3" />
            <p className="text-sm text-navy-200/40">{t('connections.empty')}</p>
          </div>
        )}
        {connections.map((c, i) => {
          const color = RELATIONSHIP_COLORS[c.relationship] || '#9fa8da';
          return (
            <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className={`snap-start min-w-[240px] md:min-w-0 glass-card p-3 md:p-4 transition-all ${selectedId === c.id ? 'ring-2 ring-cosmic-cyan/30' : ''}`}
              onClick={() => setSelectedId(selectedId === c.id ? null : c.id)}
            >
              <div className="flex items-start gap-2 md:gap-3">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-lg md:text-xl shrink-0"
                  style={{ background: `${color}20`, border: `2px solid ${color}40` }}>
                  {c.emoji || '👤'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="text-sm font-semibold text-white truncate">{c.name}</h3>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); openModal(c); }}
                        className="p-1 rounded hover:bg-white/5 text-navy-300/40 hover:text-cosmic-cyan"><Edit3 size={11} /></button>
                      <button onClick={async (e) => { e.stopPropagation(); await removeConnection(c.id); }}
                        className="p-1 rounded hover:bg-white/5 text-navy-300/40 hover:text-cosmic-rose"><Trash2 size={11} /></button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[9px] md:text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{ background: `${color}20`, color }}>
                      {relationshipIcon(c.relationship)} {t(`connections.relation${c.relationship.charAt(0).toUpperCase() + c.relationship.slice(1)}`)}
                    </span>
                  </div>
                  {c.description && <p className="text-xs text-navy-200/60 mt-1 line-clamp-2">{c.description}</p>}
                  {c.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {c.tags.map((tag) => (
                        <span key={tag} className="text-[8px] md:text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-navy-300/60">#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end md:items-start md:justify-center md:pt-[10vh] pb-0 md:pb-8 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card p-4 md:p-5 w-full md:max-w-md mx-0 md:mx-4 rounded-b-none md:rounded-b-xl mt-auto md:mt-0"
            >
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <h3 className="text-base md:text-lg font-display text-white flex items-center gap-2">
                  <User size={14} className="text-cosmic-cyan" />
                  {editing ? t('connections.edit') : t('connections.add')}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded hover:bg-white/5 text-navy-300"><X size={16} /></button>
              </div>
              <div className="space-y-2.5 md:space-y-3">
                <div>
                  <label className="text-[10px] text-navy-200/60 uppercase tracking-wider block mb-1">{t('connections.name')}</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder={t('connections.namePlaceholder')} className="celestial-input text-sm" autoFocus />
                </div>
                <div>
                  <label className="text-[10px] text-navy-200/60 uppercase tracking-wider block mb-1">{t('connections.relationship')}</label>
                  <select value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                    {RELATIONSHIP_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.icon} {t(opt.label)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-navy-200/60 uppercase tracking-wider block mb-1">{t('connections.emoji')}</label>
                  <div className="flex flex-wrap gap-1.5 md:gap-2">
                    {EMOJI_OPTIONS.map((em) => (
                      <button key={em} type="button" onClick={() => setForm({ ...form, emoji: em })}
                        className={`w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-base md:text-lg transition-all ${
                          form.emoji === em ? 'bg-cosmic-cyan/20 ring-2 ring-cosmic-cyan/40' : 'bg-white/5 hover:bg-white/10'}`}>
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-navy-200/60 uppercase tracking-wider block mb-1">{t('connections.description')}</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder={t('connections.descriptionPlaceholder')} className="celestial-input text-sm resize-none h-16 md:h-20" />
                </div>
                <div>
                  <label className="text-[10px] text-navy-200/60 uppercase tracking-wider block mb-1">{t('connections.tags')}</label>
                  <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    placeholder={t('connections.tagsPlaceholder')} className="celestial-input text-sm" />
                </div>
              </div>
              <div className="flex gap-2 mt-4 md:mt-5 pt-3 md:pt-4 border-t border-white/5">
                <button onClick={save} className="celestial-btn celestial-btn-primary flex-1 text-sm py-2.5 md:py-2">
                  {editing ? t('connections.update') : t('connections.addBtn')}
                </button>
                <button onClick={() => setShowModal(false)} className="celestial-btn celestial-btn-secondary text-sm py-2.5 md:py-2">
                  {t('connections.cancel')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
