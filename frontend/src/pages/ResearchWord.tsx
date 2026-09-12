import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import './ResearchWord.css';
import {
  AlignLeft, AlignRight, BookMarked, Check, ChevronLeft, FilePlus2,
  FileText, Languages, Save, Search, Tags, Trash2,
} from 'lucide-react';
import type { ResearchDocument } from '../types';
import { useStore } from '../store/useStore';

const emptyDocument = (): Omit<ResearchDocument, 'id' | 'created_at' | 'updated_at'> => ({
  title: 'Untitled research note',
  abstract: '',
  content: '',
  references: [],
  tags: [],
  direction: 'auto',
  status: 'draft',
});

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/u).length : 0;
}

export default function ResearchWordPage() {
  const {
    researchDocuments, fetchResearchDocuments, addResearchDocument,
    editResearchDocument, removeResearchDocument, showToast,
  } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ResearchDocument | null>(null);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchResearchDocuments();
  }, [fetchResearchDocuments]);

  useEffect(() => {
    if (!selectedId && researchDocuments.length) {
      setSelectedId(researchDocuments[0].id);
      setDraft(researchDocuments[0]);
    }
  }, [researchDocuments, selectedId]);

  useEffect(() => {
    const saveShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void saveDocument();
      }
    };
    window.addEventListener('keydown', saveShortcut);
    return () => window.removeEventListener('keydown', saveShortcut);
  });

  const filteredDocuments = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return researchDocuments;
    return researchDocuments.filter((document) =>
      [document.title, document.abstract, document.tags.join(' ')].join(' ').toLowerCase().includes(normalized),
    );
  }, [researchDocuments, query]);

  const selectDocument = (document: ResearchDocument) => {
    setSelectedId(document.id);
    setDraft(document);
  };

  const createDocument = async () => {
    const created = await addResearchDocument(emptyDocument());
    setSelectedId(created.id);
    setDraft(created);
  };

  const saveDocument = async () => {
    if (!draft || saving) return;
    setSaving(true);
    try {
      const saved = await editResearchDocument(draft.id, {
        title: draft.title.trim() || 'Untitled research note',
        abstract: draft.abstract,
        content: draft.content,
        references: draft.references.filter(Boolean),
        tags: draft.tags.filter(Boolean),
        direction: draft.direction,
        status: draft.status,
      });
      setDraft(saved);
      showToast('Research document saved', 'success');
    } finally {
      setSaving(false);
    }
  };

  const deleteDocument = async () => {
    if (!draft) return;
    await removeResearchDocument(draft.id);
    setDraft(null);
    setSelectedId(null);
  };

  const updateDraft = (patch: Partial<ResearchDocument>) => {
    setDraft((current) => current ? { ...current, ...patch } : current);
  };

  const referencesText = draft?.references.join('\n') || '';
  const tagsText = draft?.tags.join(', ') || '';
  const contentWords = wordCount(`${draft?.abstract || ''} ${draft?.content || ''}`);

  return (
    <div className="research-word h-[calc(100vh-7rem)] min-h-[620px] overflow-hidden rounded-2xl border border-white/10 bg-navy-950/35 shadow-2xl">
      <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-white/10 bg-[#090d1d]/75 lg:border-b-0 lg:border-r">
          <div className="border-b border-white/10 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-cosmic-cyan/15 text-cosmic-cyan"><BookMarked size={16} /></div>
                <div>
                  <p className="text-sm font-semibold">Research Word</p>
                  <p className="text-[10px] text-navy-300/60">writing workspace</p>
                </div>
              </div>
              <button onClick={createDocument} className="grid h-8 w-8 place-items-center rounded-xl bg-cosmic-cyan text-navy-950 transition-transform hover:scale-105" title="New document">
                <FilePlus2 size={16} />
              </button>
            </div>
            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-navy-300/60 focus-within:border-cosmic-cyan/50">
              <Search size={14} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search papers" className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-navy-300/40" />
            </label>
          </div>

          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
            {filteredDocuments.map((document) => {
              const active = document.id === selectedId;
              return (
                <button key={document.id} onClick={() => selectDocument(document)} className={`w-full rounded-xl p-3 text-left transition-colors ${active ? 'bg-cosmic-cyan/12 ring-1 ring-cosmic-cyan/30' : 'hover:bg-white/5'}`}>
                  <div className="flex items-start gap-2">
                    <FileText size={14} className={active ? 'mt-0.5 shrink-0 text-cosmic-cyan' : 'mt-0.5 shrink-0 text-navy-300/50'} />
                    <div className="min-w-0 flex-1">
                      <p dir="auto" className="research-text truncate text-xs font-medium text-white">{document.title}</p>
                      <p dir="auto" className="research-text mt-1 line-clamp-2 text-[10px] text-navy-300/55">{document.abstract || document.content || 'No content yet'}</p>
                    </div>
                  </div>
                </button>
              );
            })}
            {!filteredDocuments.length && <p className="px-3 py-8 text-center text-xs text-navy-300/50">No documents found.</p>}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col bg-[#0b1022]/85">
          {draft ? (
            <>
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 md:px-6">
                <div className="flex items-center gap-2 text-xs text-navy-300/65">
                  <span className="hidden sm:inline">Research Word</span><ChevronLeft size={13} className="hidden sm:block" />
                  <select value={draft.status} onChange={(event) => updateDraft({ status: event.target.value as ResearchDocument['status'] })} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] uppercase tracking-wider text-navy-100 outline-none">
                    <option value="draft">Draft</option><option value="review">Review</option><option value="final">Final</option>
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="mr-1 flex rounded-lg border border-white/10 bg-white/[0.035] p-0.5">
                    {([
                      { value: 'ltr', icon: <AlignLeft size={14} />, label: 'Left to right' },
                      { value: 'auto', icon: <Languages size={14} />, label: 'Auto direction' },
                      { value: 'rtl', icon: <AlignRight size={14} />, label: 'Right to left' },
                    ] as const).map((item) => (
                      <button key={item.value} onClick={() => updateDraft({ direction: item.value })} title={item.label} className={`grid h-7 w-7 place-items-center rounded-md transition-colors ${draft.direction === item.value ? 'bg-cosmic-cyan text-navy-950' : 'text-navy-300 hover:text-white'}`}>{item.icon}</button>
                    ))}
                  </div>
                  <button onClick={deleteDocument} className="grid h-8 w-8 place-items-center rounded-lg text-navy-300/60 hover:bg-cosmic-rose/10 hover:text-cosmic-rose" title="Delete document"><Trash2 size={15} /></button>
                  <button onClick={saveDocument} disabled={saving} className="flex h-8 items-center gap-1.5 rounded-lg bg-cosmic-cyan px-3 text-xs font-semibold text-navy-950 transition-opacity hover:opacity-90 disabled:opacity-60"><Save size={13} />{saving ? 'Saving' : 'Save'}</button>
                </div>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="mx-auto w-full max-w-4xl space-y-6 px-5 py-7 md:px-10 md:py-10">
                  <input dir={draft.direction} value={draft.title} onChange={(event) => updateDraft({ title: event.target.value })} placeholder="Title of your paper" className="research-text w-full bg-transparent font-display text-3xl text-white outline-none placeholder:text-navy-300/30 md:text-4xl" />

                  <div className="rounded-2xl border border-cosmic-cyan/15 bg-cosmic-cyan/[0.035] p-4">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-cosmic-cyan">Abstract</p>
                    <textarea dir={draft.direction} value={draft.abstract} onChange={(event) => updateDraft({ abstract: event.target.value })} placeholder="Summarize the research question, approach and finding…" className="research-text min-h-[92px] w-full resize-none bg-transparent text-sm leading-7 text-navy-100 outline-none placeholder:text-navy-300/35" />
                  </div>

                  <textarea dir={draft.direction} value={draft.content} onChange={(event) => updateDraft({ content: event.target.value })} placeholder="Start writing your research notes, literature review, methodology or draft…" className="research-text min-h-[330px] w-full resize-y bg-transparent text-[15px] leading-8 text-navy-100 outline-none placeholder:text-navy-300/35" />

                  <div className="grid gap-4 border-t border-white/10 pt-6 md:grid-cols-2">
                    <div>
                      <label className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-navy-300/65"><BookMarked size={12} /> References</label>
                      <textarea dir={draft.direction} value={referencesText} onChange={(event) => updateDraft({ references: event.target.value.split('\n').map((item) => item.trim()).filter(Boolean) })} placeholder="One source per line" className="research-text min-h-[120px] w-full rounded-xl border border-white/10 bg-black/10 p-3 text-xs leading-6 text-navy-100 outline-none focus:border-cosmic-cyan/45" />
                    </div>
                    <div>
                      <label className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-navy-300/65"><Tags size={12} /> Tags</label>
                      <input dir="auto" value={tagsText} onChange={(event) => updateDraft({ tags: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} placeholder="e.g. AI, literature review" className="research-text w-full rounded-xl border border-white/10 bg-black/10 p-3 text-xs text-navy-100 outline-none focus:border-cosmic-cyan/45" />
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {draft.tags.map((tag) => <span key={tag} className="rounded-full bg-cosmic-violet/15 px-2 py-1 text-[10px] text-navy-100">{tag}</span>)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <footer className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-[10px] text-navy-300/55 md:px-6">
                <span>{contentWords.toLocaleString()} words · {draft.content.length.toLocaleString()} characters</span>
                <span className="flex items-center gap-1 text-green-400/80"><Check size={11} /> Ctrl/⌘ + S to save</span>
              </footer>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-cosmic-cyan/10 text-cosmic-cyan"><BookMarked size={26} /></div>
              <h2 className="mt-5 text-xl font-display text-white">Your research, in one place</h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-navy-200/60">Draft papers, collect references and write fluently in both Persian and English.</p>
              <button onClick={createDocument} className="mt-6 flex items-center gap-2 rounded-xl bg-cosmic-cyan px-4 py-2.5 text-sm font-semibold text-navy-950"><FilePlus2 size={16} /> New research document</button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
