import { Suspense, lazy, useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, TreePine, Target, CheckCircle2,
  Edit3, Trash2, ChevronDown, ChevronUp, Sparkles,
} from 'lucide-react';
import { useTranslation } from '../i18n/t';
import { useStore } from '../store/useStore';
import type { LifeTreeEntry, TreeBranch } from '../types';

const LifeTree3D = lazy(() => import('./LifeTree3D'));

function newBranchId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function LifeTreePage() {
  const { t } = useTranslation();
  const { lifeTree, fetchLifeTree, addLifeTree, editLifeTree, removeLifeTree, showToast, theme } = useStore();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [branches, setBranches] = useState<TreeBranch[]>([]);
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchLifeTree();
  }, [fetchLifeTree]);

  const currentTree = lifeTree[0] || null;

  const openModal = (tree?: LifeTreeEntry) => {
    if (tree) {
      setEditingId(tree.id);
      setTitle(tree.title);
      setDescription(tree.description);
      setBranches(JSON.parse(JSON.stringify(tree.branches)));
    } else {
      setEditingId(null);
      setTitle('');
      setDescription('');
      setBranches([]);
    }
    setShowModal(true);
  };

  const saveTree = async () => {
    if (!title.trim()) {
      showToast('Please enter a title for your life tree', 'error');
      return;
    }
    const data = { title, description, branches };
    if (editingId) {
      await editLifeTree(editingId, data);
    } else {
      await addLifeTree(data);
    }
    setShowModal(false);
  };

  const deleteTree = async (id: string) => {
    await removeLifeTree(id);
  };

  const toggleDoneL1 = async (branchId: string) => {
    if (!currentTree) return;
    const updated = JSON.parse(JSON.stringify(currentTree.branches)) as TreeBranch[];
    const idx = updated.findIndex((b) => b.id === branchId);
    if (idx < 0) return;
    updated[idx].done = !updated[idx].done;
    await editLifeTree(currentTree.id, { branches: updated });
  };

  const toggleDoneL2 = async (branchId: string, goalId: string) => {
    if (!currentTree) return;
    const updated = JSON.parse(JSON.stringify(currentTree.branches)) as TreeBranch[];
    const pi = updated.findIndex((b) => b.id === branchId);
    if (pi < 0) return;
    const ci = updated[pi].children.findIndex((c) => c.id === goalId);
    if (ci < 0) return;
    updated[pi].children[ci].done = !updated[pi].children[ci].done;
    await editLifeTree(currentTree.id, { branches: updated });
  };

  const addBranch = () => {
    setBranches([...branches, { id: newBranchId(), title: '', description: '', done: false, children: [] }]);
  };

  const updateBranch = (index: number, field: string, value: any) => {
    const updated = [...branches];
    (updated[index] as any)[field] = value;
    setBranches(updated);
  };

  const removeBranch = (index: number) => {
    setBranches(branches.filter((_, i) => i !== index));
  };

  const addSubBranch = (parentIndex: number) => {
    const updated = [...branches];
    updated[parentIndex].children.push({ id: newBranchId(), title: '', description: '', done: false, children: [] });
    setBranches(updated);
  };

  const updateSubBranch = (parentIndex: number, childIndex: number, field: string, value: any) => {
    const updated = [...branches];
    (updated[parentIndex].children[childIndex] as any)[field] = value;
    setBranches(updated);
  };

  const removeSubBranch = (parentIndex: number, childIndex: number) => {
    const updated = [...branches];
    updated[parentIndex].children = updated[parentIndex].children.filter((_, i) => i !== childIndex);
    setBranches(updated);
  };

  const toggleExpand = (id: string) => {
    setExpandedBranches((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ─── Flattened branch list for stats ───
  const allBranches = useMemo(() => {
    if (!currentTree) return [];
    const all: { branch: TreeBranch; path: string }[] = [];
    currentTree.branches.forEach((b) => {
      all.push({ branch: b, path: b.id });
      b.children.forEach((c) => all.push({ branch: c, path: `${b.id}.${c.id}` }));
    });
    return all;
  }, [currentTree]);

  const doneCount = allBranches.filter((b) => b.branch.done).length;
  const totalCount = allBranches.length;

  // ─── Empty state ───
  if (!currentTree && lifeTree.length === 0) {
    return (
      <div className="space-y-6 w-full">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="text-center md:text-left"
        >
          <h2 className="text-xl md:text-2xl font-display text-white flex items-center gap-2">
            <TreePine size={22} className="text-cosmic-gold" />
            {t('lifeTree.title')}
          </h2>
          <p className="text-sm text-navy-200/60">{t('lifeTree.subtitle')}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 md:p-12 text-center"
        >
          <TreePine size={48} className="text-cosmic-cyan/30 mx-auto mb-4" />
          <h3 className="text-lg font-display text-white mb-2">{t('lifeTree.empty')}</h3>
          <p className="text-sm text-navy-200/60 mb-6 max-w-md mx-auto">
            {t('lifeTree.emptyDesc')}
          </p>
          <button onClick={() => openModal()} className="celestial-btn celestial-btn-primary">
            <Plus size={16} className="inline mr-1" /> {t('lifeTree.create')}
          </button>
        </motion.div>

        <TreeModal show={showModal} onClose={() => setShowModal(false)}
          title={title} setTitle={setTitle}
          description={description} setDescription={setDescription}
          branches={branches}
          addBranch={addBranch} updateBranch={updateBranch} removeBranch={removeBranch}
          addSubBranch={addSubBranch} updateSubBranch={updateSubBranch} removeSubBranch={removeSubBranch}
          save={saveTree} editing={!!editingId} />
      </div>
    );
  }

  if (!currentTree) return null;
  const tree = currentTree;

  return (
    <div className="space-y-5 w-full">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <h2 className="text-xl md:text-2xl font-display text-white flex items-center gap-2">
            <TreePine size={22} className="text-cosmic-gold" />
            {tree.title}
          </h2>
          {tree.description && <p className="text-sm text-navy-200/60">{tree.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <div className="glass-card px-3 py-1.5 flex items-center gap-2 text-xs">
            <CheckCircle2 size={12} className="text-green-400" />
            <span className="text-navy-200">{doneCount}/{totalCount}</span>
          </div>
          <button onClick={() => openModal(tree)} className="p-2 rounded-lg hover:bg-white/5 text-navy-200 hover:text-cosmic-cyan">
            <Edit3 size={16} />
          </button>
          <button onClick={() => deleteTree(tree.id)} className="p-2 rounded-lg hover:bg-white/5 text-navy-200 hover:text-cosmic-rose">
            <Trash2 size={16} />
          </button>
        </div>
      </motion.div>

      {/* Progress */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-3">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-navy-200/60">{t('lifeTree.progress')}</span>
          <span className="text-cosmic-gold">{totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0}%</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }}
            animate={{ width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-cosmic-cyan to-cosmic-gold" />
        </div>
      </motion.div>

      {/* ─── Life Tree — real-time 3D ─── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card p-2 md:p-3 overflow-hidden"
      >
        <Suspense
          fallback={
            <div className="h-[540px] md:h-[720px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-navy-200/60">
                <TreePine size={24} className="animate-pulse text-cosmic-gold" />
                <span className="text-xs">Loading 3D tree…</span>
              </div>
            </div>
          }
        >
          <LifeTree3D
            tree={tree}
            theme={theme}
            onToggleBranch={toggleDoneL1}
            onToggleGoal={toggleDoneL2}
          />
        </Suspense>
      </motion.div>

      {/* ─── Branch cards ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tree.branches.map((branch) => {
          const isExpanded = expandedBranches.has(branch.id);
          return (
            <motion.div key={branch.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`glass-card p-4 ${branch.done ? 'border-green-500/20' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <button onClick={() => toggleDoneL1(branch.id)}
                    className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                      branch.done ? 'bg-green-500 border-green-500' : 'border-navy-400 hover:border-cosmic-cyan'
                    }`}>
                    {branch.done && <CheckCircle2 size={12} className="text-white" />}
                  </button>
                  <div className="min-w-0">
                    <h4 className={`text-sm font-medium ${branch.done ? 'line-through text-green-400/60' : 'text-white'}`}>
                      {branch.title || t('lifeTree.unnamed')}
                    </h4>
                    {branch.description && (
                      <p className="text-[11px] text-navy-200/60 mt-0.5">{branch.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] text-navy-300/40">{branch.children.filter((c) => c.done).length}/{branch.children.length}</span>
                  {branch.children.length > 0 && (
                    <button onClick={() => toggleExpand(branch.id)} className="p-1 rounded hover:bg-white/5 text-navy-300">
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && branch.children.length > 0 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} className="overflow-hidden"
                  >
                    <div className="mt-3 space-y-1.5 pl-7 border-l border-white/5">
                      {branch.children.map((child, ci) => (
                        <div key={child.id} className="flex items-center gap-2 py-1">
                          <button onClick={() => toggleDoneL2(branch.id, child.id)}
                            className={`shrink-0 w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                              child.done ? 'bg-green-500 border-green-500' : 'border-navy-400 hover:border-cosmic-gold'
                            }`}>
                            {child.done && <CheckCircle2 size={9} className="text-white" />}
                          </button>
                          <span className={`text-xs ${child.done ? 'line-through text-green-400/50' : 'text-navy-100'}`}>
                            {child.title || '...'}
                          </span>
                          {child.description && (
                            <span className="text-[10px] text-navy-300/40 truncate">— {child.description}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-lg font-bold text-cosmic-cyan">{tree.branches.length}</div>
            <div className="text-[10px] text-navy-200/60">{t('lifeTree.mainBranches')}</div>
          </div>
          <div>
            <div className="text-lg font-bold text-cosmic-gold">{totalCount}</div>
            <div className="text-[10px] text-navy-200/60">{t('lifeTree.totalGoals')}</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-400">{doneCount}</div>
            <div className="text-[10px] text-navy-200/60">{t('lifeTree.completed')}</div>
          </div>
          <div>
            <div className="text-lg font-bold text-navy-200">{totalCount - doneCount}</div>
            <div className="text-[10px] text-navy-200/60">{t('lifeTree.remaining')}</div>
          </div>
        </div>
      </motion.div>

      {/* Modal */}
      <TreeModal show={showModal} onClose={() => setShowModal(false)}
        title={title} setTitle={setTitle}
        description={description} setDescription={setDescription}
        branches={branches}
        addBranch={addBranch} updateBranch={updateBranch} removeBranch={removeBranch}
        addSubBranch={addSubBranch} updateSubBranch={updateSubBranch} removeSubBranch={removeSubBranch}
        save={saveTree} editing={!!editingId} />
    </div>
  );
}

// ─── Modal ───
function TreeModal({
  show, onClose, title, setTitle, description, setDescription,
  branches, addBranch, updateBranch, removeBranch,
  addSubBranch, updateSubBranch, removeSubBranch,
  save, editing,
}: {
  show: boolean; onClose: () => void;
  title: string; setTitle: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  branches: TreeBranch[];
  addBranch: () => void; updateBranch: (i: number, f: string, v: any) => void; removeBranch: (i: number) => void;
  addSubBranch: (pi: number) => void; updateSubBranch: (pi: number, ci: number, f: string, v: any) => void; removeSubBranch: (pi: number, ci: number) => void;
  save: () => void; editing: boolean;
}) {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] pb-8 bg-black/60 backdrop-blur-sm overflow-y-auto"
          onClick={onClose}
        >
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-card p-5 w-full max-w-2xl mx-4 my-auto"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-display text-white flex items-center gap-2">
                <TreePine size={18} className="text-cosmic-gold" />
                {editing ? t('lifeTree.edit') : t('lifeTree.createTitle')}
              </h3>
              <button onClick={onClose} className="p-1.5 rounded hover:bg-white/5 text-navy-300"><X size={16} /></button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <label className="text-[10px] text-navy-200/60 uppercase tracking-wider block mb-1">{t('lifeTree.goal')}</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('lifeTree.goalPlaceholder')} className="celestial-input text-sm" />
              </div>
              <div>
                <label className="text-[10px] text-navy-200/60 uppercase tracking-wider block mb-1">{t('lifeTree.description')}</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('lifeTree.descriptionPlaceholder')} className="celestial-input text-sm min-h-[60px] resize-none" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] text-navy-200/60 uppercase tracking-wider">{t('lifeTree.branches')}</label>
                  <button onClick={addBranch} className="text-xs text-cosmic-cyan hover:text-white flex items-center gap-1">
                    <Plus size={12} /> {t('lifeTree.addBranch')}
                  </button>
                </div>
                <div className="space-y-3">
                  {branches.length === 0 && (
                    <p className="text-xs text-navy-300/40 text-center py-3">
                      {t('lifeTree.noBranches')}
                    </p>
                  )}
                  {branches.map((branch, i) => (
                    <div key={branch.id} className="glass-card p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Target size={12} className="text-cosmic-cyan shrink-0" />
                        <input type="text" value={branch.title}
                          onChange={(e) => updateBranch(i, 'title', e.target.value)}
                          placeholder={t('lifeTree.branchPlaceholder')}
                          className="flex-1 bg-transparent border-none outline-none text-sm text-white" />
                        <button onClick={() => removeBranch(i)} className="text-navy-300/40 hover:text-cosmic-rose shrink-0">
                          <X size={14} />
                        </button>
                      </div>
                      <input type="text" value={branch.description}
                        onChange={(e) => updateBranch(i, 'description', e.target.value)}
                        placeholder={t('lifeTree.branchDescPlaceholder')} className="w-full bg-transparent border border-white/5 rounded px-2 py-1 text-xs text-navy-200/70 outline-none ml-6" />
                      <div className="ml-6 pl-3 border-l border-white/5 space-y-1.5">
                        {branch.children.map((child, ci) => (
                          <div key={child.id} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-cosmic-gold/40 shrink-0" />
                            <input type="text" value={child.title}
                              onChange={(e) => updateSubBranch(i, ci, 'title', e.target.value)}
                              placeholder={t('lifeTree.subtaskPlaceholder')} className="flex-1 bg-transparent border-none outline-none text-xs text-navy-100" />
                            <input type="text" value={child.description}
                              onChange={(e) => updateSubBranch(i, ci, 'description', e.target.value)}
                              placeholder={t('lifeTree.notePlaceholder')} className="w-24 bg-transparent border border-white/5 rounded px-1.5 py-0.5 text-[10px] text-navy-200/50 outline-none" />
                            <button onClick={() => removeSubBranch(i, ci)}
                              className="text-navy-300/30 hover:text-cosmic-rose shrink-0">
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                        <button onClick={() => addSubBranch(i)}
                          className="text-[10px] text-cosmic-gold/60 hover:text-cosmic-gold flex items-center gap-1">
                          <Plus size={10} /> {t('lifeTree.addSubtask')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-5 pt-4 border-t border-white/5">
              <button onClick={save} className="celestial-btn celestial-btn-primary flex-1 text-sm">
                <Sparkles size={14} className="inline mr-1" />
                {editing ? t('lifeTree.updateTree') : t('lifeTree.plantTree')}
              </button>
              <button onClick={onClose} className="celestial-btn celestial-btn-secondary text-sm">{t('lifeTree.cancel')}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
