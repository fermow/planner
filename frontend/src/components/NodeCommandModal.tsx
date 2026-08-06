import { useState, useEffect, useRef, useMemo, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Search, Plus, User, Palette, Tag, FileText,
  ChevronDown, Check, Trash2,
} from 'lucide-react';
import { Connection } from '../types';
import { useStore } from '../store/useStore';
import { useTranslation } from '../i18n/t';
import { NODE_LABELS, NodeLabel, EMOJI_OPTIONS, PALETTE_COLORS, resolveConnectionLabel, getConnectionColor } from './connectionLabels';

interface NodeCommandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    label: string;
    icon: string;
    color: string;
    description: string;
    tags: string[];
    parent_id?: string | null;
  }) => void;
  editing: Connection | null;
  connections: Connection[];
  defaultParentId?: string | null;
}

const ME_NODE_ID = 'me';

export default function NodeCommandModal({
  isOpen,
  onClose,
  onSave,
  editing,
  connections,
  defaultParentId,
}: NodeCommandModalProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [labelSearch, setLabelSearch] = useState('');
  const [selectedLabel, setSelectedLabel] = useState<NodeLabel>(NODE_LABELS[0]);
  const [customLabel, setCustomLabel] = useState('');
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [icon, setIcon] = useState('👤');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [color, setColor] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [step, setStep] = useState<'info' | 'label' | 'icon' | 'color'>('info');

  useEffect(() => {
    if (isOpen && editing) {
      setName(editing.name);
      const label = resolveConnectionLabel(editing);
      setSelectedLabel(label);
      setCustomLabel('');
      setIcon(editing.icon || editing.emoji || '👤');
      setColor(editing.color || '');
      setDescription(editing.description || '');
      setTags((editing.tags || []).join(', '));
      setParentId(editing.parent_id || null);
      setLabelSearch('');
    } else if (isOpen && !editing) {
      setName('');
      setSelectedLabel(NODE_LABELS[0]);
      setCustomLabel('');
      setIcon('👤');
      setColor('');
      setDescription('');
      setTags('');
      setParentId(defaultParentId || null);
      setLabelSearch('');
    }
    setStep('info');
  }, [isOpen, editing, defaultParentId]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen, step]);

  // Filtered labels based on search
  const filteredLabels = useMemo(() => {
    if (!labelSearch) return NODE_LABELS;
    const q = labelSearch.toLowerCase();
    return NODE_LABELS.filter((l) =>
      l.label.toLowerCase().includes(q) ||
      l.description.toLowerCase().includes(q) ||
      l.value.toLowerCase().includes(q)
    );
  }, [labelSearch]);

  // Check if the searched label is new
  const isNewLabel = labelSearch && !NODE_LABELS.some((l) => l.label.toLowerCase() === labelSearch.toLowerCase());

  const handleLabelSelect = (label: NodeLabel) => {
    setSelectedLabel(label);
    setLabelSearch('');
    setShowLabelPicker(false);
    setColor(label.color);
  };

  const handleCustomLabelCreate = () => {
    const baseColor = PALETTE_COLORS[Math.floor(Math.random() * PALETTE_COLORS.length)];
    const baseIcon = EMOJI_OPTIONS[Math.floor(Math.random() * EMOJI_OPTIONS.length)];
    setSelectedLabel({
      value: labelSearch.toLowerCase(),
      label: labelSearch,
      color: baseColor,
      icon: baseIcon,
      description: '',
    });
    setColor(baseColor);
    setLabelSearch('');
    setShowLabelPicker(false);
  };

  const handleIconSelect = (emoji: string) => {
    setIcon(emoji);
    setShowIconPicker(false);
  };

  const handleColorSelect = (c: string) => {
    setColor(c);
    setShowColorPicker(false);
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => setTags(e.target.value);
  const tagsArray = tags.split(',').map((t) => t.trim()).filter(Boolean);

  const effectiveColor = color || selectedLabel.color;
  const effectiveIcon = icon;

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      label: customLabel || selectedLabel.label,
      icon: effectiveIcon,
      color: effectiveColor,
      description: description.trim(),
      tags: tagsArray,
      parent_id: editing ? editing.parent_id : (parentId || undefined),
    });
    onClose();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter' && step === 'info') {
      e.preventDefault();
      if (name.trim()) {
        if (showLabelPicker) setShowLabelPicker(true);
        else setStep('label');
      }
    }
  };

  const parentOptions = [
    { id: ME_NODE_ID, name: t('connections.you'), icon: '⭐', color: '#40e0d0' },
    ...connections
      .filter((c) => c.id !== editing?.id)
      .map((c) => {
        const label = resolveConnectionLabel(c);
        return {
          id: c.id,
          name: c.name,
          icon: c.icon || c.emoji || '👤',
          color: getConnectionColor(c),
        };
      }),
  ];

  const currentStepConfig = {
    info: { label: t('connections.basicInfo'), step: 'info' as const, icon: <User size={16} /> },
    label: { label: t('connections.chooseLabel'), step: 'label' as const, icon: <Tag size={16} /> },
    icon: { label: t('connections.chooseIcon'), step: 'icon' as const, icon: <Palette size={16} /> },
    color: { label: t('connections.chooseColor'), step: 'color' as const, icon: <Palette size={16} /> },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-end md:items-start md:justify-center md:pt-[8vh] pb-0 md:pb-8 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="glass-card w-full md:max-w-2xl mx-0 md:mx-4 md:my-0 md:rounded-2xl rounded-b-none mb-auto md:mb-0 overflow-hidden"
            style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 md:p-5 border-b border-white/10">
              <h3 className="text-lg font-display text-white flex items-center gap-2">
                {currentStepConfig[step].icon}
                <span>{editing ? t('connections.editNode') : t('connections.createNode')}</span>
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/5 text-navy-300 hover:text-white transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Form section */}
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-navy-300/50 block mb-1.5">
                      {t('connections.name')}
                    </label>
                    <input
                      ref={inputRef}
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={t('connections.namePlaceholder')}
                      className="celestial-input text-sm w-full"
                    />
                  </div>

                  {/* Label search */}
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-navy-300/50 block mb-1.5">
                      {t('connections.label')}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={labelSearch}
                        onChange={(e) => setLabelSearch(e.target.value)}
                        onFocus={() => setShowLabelPicker(true)}
                        placeholder={t('connections.labelSearch')}
                        className="celestial-input text-sm w-full pl-9"
                      />
                      <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background: `${selectedLabel.color}30` }}
                        >
                          {selectedLabel.icon}
                        </span>
                      </div>
                    </div>

                    {/* Selected label display */}
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium"
                        style={{ background: `${effectiveColor}20`, color: effectiveColor }}
                      >
                        {selectedLabel.icon} {selectedLabel.label}
                      </span>
                      {isNewLabel && (
                        <button
                          onClick={handleCustomLabelCreate}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-cosmic-cyan/10 text-cosmic-cyan hover:bg-cosmic-cyan/20 transition-colors"
                        >
                          + {t('connections.createLabel')} "{labelSearch}"
                        </button>
                      )}
                    </div>

                    {/* Label picker dropdown */}
                    {showLabelPicker && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -4, height: 0 }}
                        className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto glass-card border border-white/10"
                        style={{ maxHeight: '192px' }}
                      >
                        {filteredLabels.map((label) => (
                          <button
                            key={label.value}
                            type="button"
                            onClick={() => handleLabelSelect(label)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors"
                          >
                            <span
                              className="w-6 h-6 rounded-full flex items-center justify-center text-sm"
                              style={{ background: `${label.color}20`, border: `1px solid ${label.color}40` }}
                            >
                              {label.icon}
                            </span>
                            <span className="text-sm text-navy-100">{label.label}</span>
                            <span className="text-[9px] text-navy-300/40 ml-auto">{label.description}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </div>

                  {/* Icon picker */}
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-navy-300/50 block mb-1.5">
                      {t('connections.icon')}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowIconPicker(!showIconPicker)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-left text-sm text-white hover:bg-white/10 transition-all"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-xl">{icon}</span>
                        <span>{icon}</span>
                      </span>
                      <ChevronDown size={14} className="text-navy-300" />
                    </button>

                    <AnimatePresence>
                      {showIconPicker && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="grid grid-cols-8 gap-1 mt-2"
                        >
                          {EMOJI_OPTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleIconSelect(emoji)}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all ${
                                icon === emoji
                                  ? 'bg-cosmic-cyan/20 ring-2 ring-cosmic-cyan/40 scale-110'
                                  : 'bg-white/5 hover:bg-white/10'
                              }`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Color picker */}
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-navy-300/50 block mb-1.5">
                      {t('connections.color')}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-left text-sm text-white hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded-full border-2 border-white/20"
                          style={{ background: effectiveColor }}
                        />
                        <span style={{ color: effectiveColor }}>{effectiveColor || t('connections.autoColor')}</span>
                      </div>
                      <ChevronDown size={14} className="text-navy-300" />
                    </button>

                    <AnimatePresence>
                      {showColorPicker && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="grid grid-cols-10 gap-1 mt-2"
                        >
                          {PALETTE_COLORS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => handleColorSelect(c)}
                              className={`w-7 h-7 rounded-lg transition-all ${
                                color === c || (!color && selectedLabel.color === c)
                                  ? 'ring-2 ring-white/50 scale-110'
                                  : 'ring-1 ring-white/10 hover:ring-2 hover:ring-white/30'
                              }`}
                              style={{ background: c }}
                            />
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-navy-300/50 block mb-1.5">
                      {t('connections.description')}
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t('connections.descriptionPlaceholder')}
                      className="celestial-input text-sm resize-none h-20 w-full"
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-navy-300/50 block mb-1.5">
                      {t('connections.tags')}
                    </label>
                    <input
                      type="text"
                      value={tags}
                      onChange={handleTagsChange}
                      placeholder={t('connections.tagsPlaceholder')}
                      className="celestial-input text-sm w-full"
                    />
                    {tagsArray.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {tagsArray.map((tag) => (
                          <span
                            key={tag}
                            className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/5 text-navy-300/60"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Parent selector */}
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-navy-300/50 block mb-1.5">
                      {t('connections.parent')}
                    </label>
                    <select
                      value={parentId || ''}
                      onChange={(e) => setParentId(e.target.value || null)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    >
                      <option value="">{t('connections.parentMe')}</option>
                      {parentOptions.slice(1).map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.icon} {opt.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Live preview section */}
                <div className="md:border-l border-white/10 pl-0 md:pl-6 mt-4 md:mt-0">
                  <div className="sticky top-0">
                    <h4 className="text-[10px] uppercase tracking-wider text-navy-300/50 mb-3">
                      {t('connections.preview')}
                    </h4>
                    <div className="glass-card p-5 flex flex-col items-center text-center">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl mb-3"
                        style={{
                          background: `${effectiveColor}20`,
                          border: `2px solid ${effectiveColor}40`,
                        }}
                      >
                        {effectiveIcon}
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-0.5 truncate w-full">
                        {name || t('connections.namePlaceholder')}
                      </h3>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full mb-2"
                        style={{ background: `${effectiveColor}20`, color: effectiveColor }}
                      >
                        {selectedLabel.label}
                      </span>
                      {tagsArray.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-1 mb-3">
                          {tagsArray.slice(0, 5).map((tag) => (
                            <span key={tag} className="text-[7px] px-1.5 py-0.5 rounded-full bg-white/5 text-navy-300/60">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {description && (
                        <p className="text-[10px] text-navy-200/50 line-clamp-3 mt-2">
                          {description}
                        </p>
                      )}
                    </div>

                    {/* Relationship preview */}
                    {parentId && parentId !== ME_NODE_ID && (
                      <div className="mt-3 glass-card p-2.5 text-center">
                        <p className="text-[9px] text-navy-300/50 mb-1.5">{t('connections.connectedTo')}</p>
                        {(() => {
                          const parentConn = connections.find((c) => c.id === parentId);
                          if (!parentConn) return <span className="text-xs text-navy-300/40">—</span>;
                          const pColor = getConnectionColor(parentConn);
                          const pLabel = resolveConnectionLabel(parentConn);
                          return (
                            <div className="flex items-center justify-center gap-1.5">
                              <span
                                className="w-6 h-6 rounded-full flex items-center justify-center text-sm"
                                style={{ background: `${pColor}20`, border: `1px solid ${pColor}40` }}
                              >
                                {parentConn.icon || parentConn.emoji || '👤'}
                              </span>
                              <span className="text-sm text-navy-100">{parentConn.name}</span>
                              <span
                                className="text-[8px] px-1 py-0.25 rounded-full"
                                style={{ background: `${pColor}20`, color: pColor }}
                              >
                                {pLabel.label}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 p-4 md:p-5 border-t border-white/5">
              <button
                onClick={handleSave}
                disabled={!name.trim()}
                className="celestial-btn celestial-btn-primary flex-1 text-sm py-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {editing ? t('connections.update') : t('connections.addBtn')}
              </button>
              <button
                onClick={onClose}
                className="celestial-btn celestial-btn-secondary text-sm py-2.5"
              >
                {t('connections.cancel')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
