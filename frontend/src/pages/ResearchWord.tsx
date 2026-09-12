import { useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { Extension } from '@tiptap/core';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import * as mammoth from 'mammoth/mammoth.browser';
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, BookMarked, Check, Code2, FilePlus2, FileText, History, Italic, Languages, List, ListOrdered, Palette, Quote, Redo2, RotateCcw, Save, Search, Tags, Trash2, Undo2 } from 'lucide-react';
import type { ResearchDocument, ResearchDocumentRevision } from '../types';
import { api } from '../api/client';
import { useStore } from '../store/useStore';
import './ResearchWord.css';

type WordTheme = 'dark' | 'paper' | 'light';
const blank = (): Omit<ResearchDocument, 'id' | 'created_at' | 'updated_at'> => ({ title: 'Untitled research note', abstract: '', content: '', references: [], tags: [], direction: 'auto', status: 'draft', template: 'simple', table_headers: ['Variable', 'Value', 'Notes'], table_rows: [['', '', '']], page_size: 'a4', page_margin: 'normal', header_text: '', footer_text: '', citation_style: 'apa', show_toc: false });
const plain = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim();
const stamp = (d: ResearchDocument) => JSON.stringify({ title: d.title, abstract: d.abstract, content: d.content, references: d.references, tags: d.tags, direction: d.direction, status: d.status, template: d.template, table_headers: d.table_headers, table_rows: d.table_rows, page_size: d.page_size, page_margin: d.page_margin, header_text: d.header_text, footer_text: d.footer_text, citation_style: d.citation_style, show_toc: d.show_toc });
const templateBody: Record<ResearchDocument['template'], string> = {
  simple: '<p></p>',
  paper: '<h1>Introduction</h1><p></p><h2>Methodology</h2><p></p><h2>Results</h2><p></p><h2>Discussion</h2><p></p><h2>Conclusion</h2><p></p>',
  proposal: '<h1>Problem statement</h1><p></p><h2>Research objectives</h2><p></p><h2>Methodology</h2><p></p><h2>Timeline</h2><p></p><h2>Expected outcomes</h2><p></p><h2>Budget</h2><p></p>',
  results: '<h1>Results summary</h1><p>Describe the main findings and interpretation of the table below.</p>',
};
const Typography = Extension.create({
  name: 'typography',
  addGlobalAttributes() { return [
    { types: ['textStyle'], attributes: { fontSize: { default: null, parseHTML: (element) => element.style.fontSize || null, renderHTML: (attributes) => attributes.fontSize ? { style: `font-size: ${attributes.fontSize}` } : {} } } },
    { types: ['paragraph', 'heading'], attributes: { paragraphSpacing: { default: null, parseHTML: (element) => element.style.marginBottom || null, renderHTML: (attributes) => attributes.paragraphSpacing ? { style: `margin-bottom: ${attributes.paragraphSpacing}` } : {} } } },
  ]; },
});

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob); const anchor = window.document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}

function wordParagraphs(html: string) {
  const root = new DOMParser().parseFromString(html, 'text/html').body;
  return Array.from(root.children).map((node) => {
    const text = node.textContent?.trim() || '';
    const tag = node.tagName.toLowerCase();
    const heading = tag === 'h1' ? HeadingLevel.HEADING_1 : tag === 'h2' ? HeadingLevel.HEADING_2 : tag === 'h3' ? HeadingLevel.HEADING_3 : undefined;
    return new Paragraph({ heading, bullet: tag === 'ul' ? { level: 0 } : undefined, children: [new TextRun(text)] });
  });
}

function Editor({ value, direction, onChange }: { value: string; direction: ResearchDocument['direction']; onChange: (html: string) => void }) {
  const [findOpen, setFindOpen] = useState(false), [findText, setFindText] = useState(''), [replaceText, setReplaceText] = useState('');
  const editor = useEditor({ extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] } }), Placeholder.configure({ placeholder: 'Start writing…' }), TextAlign.configure({ types: ['heading', 'paragraph'] }), TextStyle, Color, FontFamily, Highlight.configure({ multicolor: true }), Underline, Typography], content: value || '<p></p>', editorProps: { attributes: { class: 'research-prosemirror' } }, onUpdate: ({ editor: e }) => onChange(e.getHTML()) });
  useEffect(() => { if (editor && editor.getHTML() !== (value || '<p></p>')) editor.commands.setContent(value || '<p></p>', { emitUpdate: false }); }, [editor, value]);
  if (!editor) return null;
  const b = (label: string, icon: React.ReactNode, run: () => void, active = false) => <button type="button" title={label} aria-label={label} onMouseDown={(e) => e.preventDefault()} onClick={run} className={`word-tool ${active ? 'is-active' : ''}`}>{icon}</button>;
  const findNext = () => { if (!findText) return; let found = false; editor.state.doc.descendants((node, pos) => { if (found || !node.isText) return; const index = node.text?.toLocaleLowerCase().indexOf(findText.toLocaleLowerCase()) ?? -1; if (index >= 0) { editor.chain().focus().setTextSelection({ from: pos + index, to: pos + index + findText.length }).run(); found = true; } }); if (!found) window.alert('No more matches found.'); };
  const replaceOne = () => { findNext(); const { from, to } = editor.state.selection; if (from !== to) editor.chain().focus().insertContent(replaceText).run(); };
  return <div className="word-editor-shell" dir={direction}><div className="word-toolbar" dir="ltr">
    <span className="word-tool-group">{b('Undo', <Undo2 size={15} />, () => editor.chain().focus().undo().run())}{b('Redo', <Redo2 size={15} />, () => editor.chain().focus().redo().run())}</span>
    <span className="word-tool-group">{b('Find and replace', <Search size={15} />, () => setFindOpen((open) => !open), findOpen)}{b('Page break', <span className="word-heading">PB</span>, () => editor.chain().focus().setHorizontalRule().run())}</span>
    <span className="word-tool-group">{b('Bold', <Bold size={15} />, () => editor.chain().focus().toggleBold().run(), editor.isActive('bold'))}{b('Italic', <Italic size={15} />, () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'))}{b('Underline', <span className="word-underline">U</span>, () => editor.chain().focus().toggleUnderline().run(), editor.isActive('underline'))}{b('Code', <Code2 size={15} />, () => editor.chain().focus().toggleCode().run(), editor.isActive('code'))}</span>
    <span className="word-tool-group word-select-tools"><select title="Font" defaultValue="Inter" onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}><option value="Inter">Sans</option><option value="Georgia">Serif</option><option value="Arial">Arial</option><option value="Tahoma">Tahoma</option></select><select title="Font size" defaultValue="16px" onChange={(e) => editor.chain().focus().setMark('textStyle', { fontSize: e.target.value }).run()}><option value="12px">12</option><option value="14px">14</option><option value="16px">16</option><option value="18px">18</option><option value="22px">22</option><option value="28px">28</option></select></span>
    <span className="word-tool-group word-color-tools"><label title="Text color"><span>A</span><input aria-label="Text color" type="color" defaultValue="#e7edf9" onInput={(e) => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()} /></label><label title="Highlight"><span>▰</span><input aria-label="Highlight color" type="color" defaultValue="#f0c040" onInput={(e) => editor.chain().focus().toggleHighlight({ color: (e.target as HTMLInputElement).value }).run()} /></label></span>
    <span className="word-tool-group word-select-tools"><select title="Paragraph spacing" defaultValue="1rem" onChange={(e) => { const spacing = e.target.value; if (editor.isActive('heading')) editor.chain().focus().updateAttributes('heading', { paragraphSpacing: spacing }).run(); else editor.chain().focus().updateAttributes('paragraph', { paragraphSpacing: spacing }).run(); }}><option value=".35rem">Compact</option><option value="1rem">Normal</option><option value="1.5rem">Relaxed</option><option value="2rem">Wide</option></select></span>
    <span className="word-tool-group">{([1, 2, 3] as const).map((level) => b(`Heading ${level}`, <span className="word-heading">H{level}</span>, () => editor.chain().focus().toggleHeading({ level }).run(), editor.isActive('heading', { level })))}</span>
    <span className="word-tool-group">{b('Bulleted list', <List size={16} />, () => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'))}{b('Numbered list', <ListOrdered size={16} />, () => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'))}{b('Quote', <Quote size={16} />, () => editor.chain().focus().toggleBlockquote().run(), editor.isActive('blockquote'))}</span>
    <span className="word-tool-group">{b('Left', <AlignLeft size={15} />, () => editor.chain().focus().setTextAlign('left').run())}{b('Center', <AlignCenter size={15} />, () => editor.chain().focus().setTextAlign('center').run())}{b('Justify', <AlignJustify size={15} />, () => editor.chain().focus().setTextAlign('justify').run())}{b('Right', <AlignRight size={15} />, () => editor.chain().focus().setTextAlign('right').run())}</span>
  </div>{findOpen && <div className="word-find-bar"><input autoFocus value={findText} onChange={(e) => setFindText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') findNext(); }} placeholder="Find" /><input value={replaceText} onChange={(e) => setReplaceText(e.target.value)} placeholder="Replace with" /><button onClick={findNext}>Find next</button><button onClick={replaceOne}>Replace</button><button onClick={() => setFindOpen(false)}>×</button></div>}<EditorContent editor={editor} /></div>;
}

export default function ResearchWordPage() {
  const { researchDocuments, fetchResearchDocuments, addResearchDocument, editResearchDocument, removeResearchDocument, showToast } = useStore();
  const [id, setId] = useState<string | null>(null), [draft, setDraft] = useState<ResearchDocument | null>(null), [query, setQuery] = useState(''), [saving, setSaving] = useState(false), [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const [theme, setTheme] = useState<WordTheme>(() => (localStorage.getItem('research-word-theme') as WordTheme) || 'dark');
  const [historyOpen, setHistoryOpen] = useState(false), [revisions, setRevisions] = useState<ResearchDocumentRevision[]>([]), [loadingHistory, setLoadingHistory] = useState(false);
  const saved = useRef('');
  useEffect(() => { void fetchResearchDocuments(); }, [fetchResearchDocuments]);
  useEffect(() => { if (!id && researchDocuments.length) select(researchDocuments[0]); }, [researchDocuments, id]);
  useEffect(() => { localStorage.setItem('research-word-theme', theme); }, [theme]);
  const select = (item: ResearchDocument) => { saved.current = stamp(item); setId(item.id); setDraft(item); setSaveStatus('saved'); };
  const update = (patch: Partial<ResearchDocument>) => setDraft((current) => current ? { ...current, ...patch } : null);
  const docs = useMemo(() => { const q = query.trim().toLowerCase(); return q ? researchDocuments.filter((d) => [d.title, d.abstract, d.tags.join(' '), plain(d.content)].join(' ').toLowerCase().includes(q)) : researchDocuments; }, [query, researchDocuments]);
  const persist = async (announce = false) => { if (!draft || saving) return; setSaving(true); setSaveStatus('saving'); try { const result = await editResearchDocument(draft.id, { ...draft, title: draft.title.trim() || 'Untitled research note' }); saved.current = stamp(result); setDraft(result); setSaveStatus('saved'); if (announce) showToast('Research document saved', 'success'); } catch (e) { setSaveStatus('unsaved'); if (announce) showToast(e instanceof Error ? e.message : 'Could not save document', 'error'); } finally { setSaving(false); } };
  useEffect(() => { if (!draft || stamp(draft) === saved.current) return; setSaveStatus('unsaved'); const timer = window.setTimeout(() => void persist(), 900); return () => window.clearTimeout(timer); }, [draft]);
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); void persist(true); } }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); });
  const create = async () => { try { select(await addResearchDocument(blank())); } catch (e) { showToast(e instanceof Error ? e.message : 'Could not create document', 'error'); } };
  const remove = async () => { if (!draft) return; try { await removeResearchDocument(draft.id); setId(null); setDraft(null); } catch (e) { showToast(e instanceof Error ? e.message : 'Could not delete document', 'error'); } };
  const openHistory = async () => { if (!draft) return; setHistoryOpen(true); setLoadingHistory(true); try { setRevisions(await api.getResearchDocumentRevisions(draft.id)); } catch (e) { showToast(e instanceof Error ? e.message : 'Could not load history', 'error'); } finally { setLoadingHistory(false); } };
  const restore = async (revision: ResearchDocumentRevision) => { if (!draft) return; try { const result = await api.restoreResearchDocumentRevision(draft.id, revision.id); select(result); await fetchResearchDocuments(); setHistoryOpen(false); showToast('Previous version restored', 'success'); } catch (e) { showToast(e instanceof Error ? e.message : 'Could not restore version', 'error'); } };
  const exportDocx = async () => {
    if (!draft) return;
    const document = new Document({ sections: [{ children: [new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(draft.title)] }), new Paragraph({ text: draft.abstract }), ...wordParagraphs(draft.content), ...(draft.references.length ? [new Paragraph({ heading: HeadingLevel.HEADING_2, text: 'References' }), ...draft.references.map((reference) => new Paragraph({ text: reference }))] : [])] }] });
    download(await Packer.toBlob(document), `${draft.title.trim() || 'research-document'}.docx`);
  };
  const importDocx = async (file: File) => {
    try {
      const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
      update({ title: file.name.replace(/\.docx$/i, '') || draft?.title, content: result.value });
      showToast('DOCX imported. It will save automatically.', 'success');
    } catch (e) { showToast(e instanceof Error ? e.message : 'Could not import DOCX', 'error'); }
  };
  const applyTemplate = (template: ResearchDocument['template']) => {
    if (!draft) return;
    update({ template, content: plain(draft.content) ? draft.content : templateBody[template], table_headers: template === 'results' ? (draft.table_headers.length ? draft.table_headers : ['Measure', 'Group A', 'Group B', 'p-value']) : draft.table_headers, table_rows: template === 'results' ? (draft.table_rows.length ? draft.table_rows : [['', '', '', '']]) : draft.table_rows });
  };
  useEffect(() => {
    const page = window.document.querySelector('.research-word .word-page');
    if (!page || !draft) return;
    page.classList.toggle('page-letter', draft.page_size === 'letter'); page.classList.toggle('page-narrow', draft.page_margin === 'narrow'); page.classList.toggle('page-wide', draft.page_margin === 'wide');
    const chrome = window.document.createElement('div'); chrome.className = 'page-chrome';
    const field = (kind: 'header_text' | 'footer_text', label: string) => { const input = window.document.createElement('input'); input.className = `page-${kind}`; input.placeholder = label; input.value = draft[kind]; input.oninput = () => update({ [kind]: input.value }); return input; };
    chrome.append(field('header_text', 'Header text')); const footer = field('footer_text', 'Footer text'); chrome.append(footer); page.prepend(chrome);
    return () => chrome.remove();
  }, [draft]);
  useEffect(() => {
    const target = window.document.querySelector('.research-word header > div:first-child');
    if (!target || !draft) return;
    const controls = window.document.createElement('label'); controls.className = 'word-page-picker'; controls.textContent = 'Page ';
    const size = new Option(draft.page_size === 'a4' ? 'A4' : 'Letter', draft.page_size); const select = window.document.createElement('select'); select.add(size); select.add(new Option(draft.page_size === 'a4' ? 'Letter' : 'A4', draft.page_size === 'a4' ? 'letter' : 'a4')); select.onchange = () => update({ page_size: select.value as ResearchDocument['page_size'] }); controls.append(select);
    const margin = window.document.createElement('select'); ['normal', 'narrow', 'wide'].forEach((v) => { const option = new Option(v, v); option.selected = draft.page_margin === v; margin.add(option); }); margin.onchange = () => update({ page_margin: margin.value as ResearchDocument['page_margin'] }); controls.append(margin); target.prepend(controls);
    return () => controls.remove();
  }, [draft]);
  useEffect(() => {
    const target = window.document.querySelector('.research-word header > div:first-child');
    if (!target || !draft) return;
    const controls = window.document.createElement('label'); controls.className = 'word-citation-picker'; controls.textContent = 'Citations ';
    const style = window.document.createElement('select'); ['apa', 'ieee', 'chicago'].forEach((value) => { const option = new Option(value.toUpperCase(), value); option.selected = draft.citation_style === value; style.add(option); }); style.onchange = () => update({ citation_style: style.value as ResearchDocument['citation_style'] }); controls.append(style);
    const add = window.document.createElement('button'); add.type = 'button'; add.textContent = '+ Source'; add.onclick = () => { const source = window.prompt('Paste the complete source or DOI/URL'); if (source?.trim()) update({ references: [...draft.references, source.trim()] }); }; controls.append(add); target.prepend(controls);
    return () => controls.remove();
  }, [draft]);
  useEffect(() => {
    const textarea = window.document.querySelector<HTMLTextAreaElement>('.research-word textarea[placeholder="One source per line"]');
    if (!textarea || !draft) return;
    const preview = window.document.createElement('ol'); preview.className = `citation-preview citation-${draft.citation_style}`;
    draft.references.forEach((reference, index) => { const item = window.document.createElement('li'); item.textContent = draft.citation_style === 'ieee' ? `[${index + 1}] ${reference}` : reference; preview.append(item); }); textarea.after(preview); return () => preview.remove();
  }, [draft]);
  useEffect(() => {
    const target = window.document.querySelector('.research-word header > div:first-child');
    if (!target || !draft) return;
    const control = window.document.createElement('label'); control.className = 'word-toc-picker';
    const input = window.document.createElement('input'); input.type = 'checkbox'; input.checked = draft.show_toc; input.onchange = () => update({ show_toc: input.checked }); control.append(input, window.document.createTextNode(' Table of contents')); target.prepend(control);
    return () => control.remove();
  }, [draft]);
  useEffect(() => {
    const page = window.document.querySelector('.research-word .word-page');
    if (!page || !draft?.show_toc) return;
    const source = new DOMParser().parseFromString(draft.content, 'text/html'); const headings = Array.from(source.querySelectorAll('h1,h2,h3'));
    if (!headings.length) return;
    const toc = window.document.createElement('nav'); toc.className = 'word-toc'; const title = window.document.createElement('p'); title.textContent = 'Table of contents'; toc.append(title); const list = window.document.createElement('ol');
    headings.forEach((heading, index) => { const item = window.document.createElement('li'); item.className = `toc-${heading.tagName.toLowerCase()}`; const link = window.document.createElement('button'); link.textContent = heading.textContent || `Section ${index + 1}`; link.onclick = () => window.document.querySelectorAll('.research-prosemirror h1,.research-prosemirror h2,.research-prosemirror h3')[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' }); item.append(link); list.append(item); }); toc.append(list);
    const chrome = page.querySelector('.page-chrome'); if (chrome) chrome.after(toc); else page.prepend(toc); return () => toc.remove();
  }, [draft]);
  useEffect(() => {
    const target = window.document.querySelector('.research-word header > div:first-child');
    if (!target || !draft) return;
    const picker = window.document.createElement('label'); picker.className = 'word-template-picker'; picker.textContent = 'Template ';
    const select = window.document.createElement('select');
    [['simple', 'Simple note'], ['paper', 'Academic paper'], ['proposal', 'Research proposal'], ['results', 'Results table']].forEach(([value, label]) => { const option = new Option(label, value); option.selected = draft.template === value; select.add(option); });
    select.onchange = () => applyTemplate(select.value as ResearchDocument['template']); picker.append(select); target.prepend(picker);
    return () => picker.remove();
  }, [draft]);
  useEffect(() => {
    const editor = window.document.querySelector('.research-word .word-editor-shell');
    if (!editor || draft?.template !== 'results') return;
    const wrap = window.document.createElement('div'); wrap.className = 'results-table-wrap';
    const heading = window.document.createElement('h3'); heading.textContent = 'Results table'; wrap.append(heading);
    const table = window.document.createElement('table'); const head = table.createTHead().insertRow(); const body = table.createTBody();
    const render = () => { table.innerHTML = ''; const h = table.createTHead().insertRow(); draft.table_headers.forEach((text, index) => { const cell = window.document.createElement('th'); const input = window.document.createElement('input'); input.value = text; input.placeholder = 'Column'; input.oninput = () => { const headers = [...draft.table_headers]; headers[index] = input.value; update({ table_headers: headers }); }; cell.append(input); h.append(cell); }); const tableBody = table.createTBody(); draft.table_rows.forEach((row, rowIndex) => { const tr = tableBody.insertRow(); draft.table_headers.forEach((_, columnIndex) => { const td = tr.insertCell(); const input = window.document.createElement('input'); input.value = row[columnIndex] || ''; input.oninput = () => { const rows = draft.table_rows.map((item) => [...item]); rows[rowIndex][columnIndex] = input.value; update({ table_rows: rows }); }; td.append(input); }); }); };
    render(); wrap.append(table); const add = window.document.createElement('button'); add.type = 'button'; add.textContent = '+ Add row'; add.onclick = () => update({ table_rows: [...draft.table_rows, draft.table_headers.map(() => '')] }); wrap.append(add); editor.after(wrap); return () => wrap.remove();
  }, [draft]);
  useEffect(() => {
    const target = window.document.querySelector('.research-word header > div:last-child');
    if (!target || !draft) return;
    const tools = window.document.createElement('div'); tools.className = 'word-file-actions';
    const button = (title: string, label: string, action: () => void) => { const item = window.document.createElement('button'); item.type = 'button'; item.title = title; item.textContent = label; item.onclick = action; tools.append(item); };
    button('Print or save as PDF', 'Print / PDF', () => { const empty = Array.from(window.document.querySelectorAll<HTMLTextAreaElement | HTMLInputElement>('.word-page textarea, .word-page input')).filter((input) => !input.value.trim()).map((input) => input.closest('.word-abstract, .mt-8 > div')).filter(Boolean) as HTMLElement[]; empty.forEach((item) => item.classList.add('print-empty')); window.print(); window.setTimeout(() => empty.forEach((item) => item.classList.remove('print-empty')), 1000); });
    button('Download Word document', 'Export DOCX', () => void exportDocx());
    button('Open a Word document', 'Import DOCX', () => { const input = window.document.createElement('input'); input.type = 'file'; input.accept = '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document'; input.onchange = () => { const file = input.files?.[0]; if (file) void importDocx(file); }; input.click(); });
    target.prepend(tools); return () => tools.remove();
  }, [draft, theme]);
  useEffect(() => {
    const root = window.document.querySelector<HTMLElement>('.research-word');
    const target = window.document.querySelector('.research-word section > header > div:last-child');
    if (!root || !target) return;
    const toggle = window.document.createElement('button'); toggle.type = 'button'; toggle.className = 'research-documents-toggle'; toggle.textContent = 'Documents';
    toggle.onclick = () => { const open = root.classList.toggle('documents-drawer-open'); toggle.textContent = open ? 'Close documents' : 'Documents'; };
    target.prepend(toggle); return () => toggle.remove();
  }, [draft]);
  useEffect(() => {
    const root = window.document.querySelector('.research-word');
    if (!root || !draft) return;
    root.classList.toggle('template-simple', draft.template === 'simple');
    return () => root.classList.remove('template-simple');
  }, [draft?.template]);
  const refs = draft?.references.join('\n') || '', tags = draft?.tags.join(', ') || '';
  return <div className={`research-word word-theme-${theme} h-[calc(100vh-7rem)] min-h-[620px] overflow-hidden rounded-2xl border border-white/10 shadow-2xl`}><div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[17rem_minmax(0,1fr)]">
    <aside className="flex min-h-0 flex-col border-b border-white/10 lg:border-b-0 lg:border-r"><div className="border-b border-white/10 p-4"><div className="mb-4 flex items-center justify-between"><div className="flex gap-2"><BookMarked className="text-cosmic-cyan" size={20} /><div><p className="text-sm font-semibold">Research Word</p><p className="text-[10px] opacity-60">writing workspace</p></div></div><button onClick={() => void create()} className="grid h-9 w-9 place-items-center rounded-xl bg-cosmic-cyan text-navy-950" title="New document"><FilePlus2 size={16} /></button></div><label className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2"><Search size={14} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search papers" className="min-w-0 flex-1 bg-transparent text-xs outline-none" /></label></div><div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">{docs.map((item) => <button key={item.id} onClick={() => select(item)} className={`w-full rounded-xl p-3 text-left ${item.id === id ? 'bg-cosmic-cyan/15' : 'hover:bg-white/5'}`}><div className="flex gap-2"><FileText size={14} className="mt-0.5 shrink-0 text-cosmic-cyan" /><div className="min-w-0"><p className="truncate text-xs font-medium">{item.title}</p><p className="mt-1 line-clamp-2 text-[10px] opacity-55">{item.abstract || plain(item.content) || 'No content yet'}</p></div></div></button>)}</div></aside>
    <section className="flex min-h-0 flex-col">{draft ? <><header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3"><div className="flex items-center gap-2"><select value={draft.status} onChange={(e) => update({ status: e.target.value as ResearchDocument['status'] })} className="word-select"><option value="draft">Draft</option><option value="review">Review</option><option value="final">Final</option></select><div className="flex rounded-lg border border-white/10 p-0.5">{([{ value: 'ltr', icon: <AlignLeft size={14} /> }, { value: 'auto', icon: <Languages size={14} /> }, { value: 'rtl', icon: <AlignRight size={14} /> }] as const).map((x) => <button key={x.value} onClick={() => update({ direction: x.value })} className={`grid h-7 w-7 place-items-center rounded ${draft.direction === x.value ? 'bg-cosmic-cyan text-navy-950' : ''}`}>{x.icon}</button>)}</div></div><div className="flex items-center gap-1.5"><label className="word-theme-picker"><Palette size={14} /><select value={theme} onChange={(e) => setTheme(e.target.value as WordTheme)}><option value="dark">Dark</option><option value="paper">Paper</option><option value="light">Light</option></select></label><button onClick={() => void openHistory()} className="word-icon-button" title="Version history"><History size={16} /></button><button onClick={() => void remove()} className="word-icon-button" title="Delete document"><Trash2 size={16} /></button><button onClick={() => void persist(true)} disabled={saving} className="flex h-8 items-center gap-1.5 rounded-lg bg-cosmic-cyan px-3 text-xs font-semibold text-navy-950"><Save size={13} />Save</button></div></header><div className="min-h-0 flex-1 overflow-y-auto"><div className="mx-auto w-full max-w-5xl px-5 py-7"><div className="word-page rounded-sm px-5 py-8 shadow-2xl md:px-12"><input dir={draft.direction} value={draft.title} onChange={(e) => update({ title: e.target.value })} placeholder="Title of your paper" className="research-text word-title w-full bg-transparent font-display text-3xl outline-none md:text-4xl" /><div className="word-abstract mt-7 rounded-xl p-4"><p className="mb-2 text-[10px] font-semibold uppercase tracking-[.18em]">Abstract</p><textarea dir={draft.direction} value={draft.abstract} onChange={(e) => update({ abstract: e.target.value })} placeholder="Summarize the research question, approach and finding…" className="research-text min-h-[92px] w-full resize-none bg-transparent text-sm leading-7 outline-none" /></div><div className="mt-7"><Editor key={draft.id} value={draft.content} direction={draft.direction} onChange={(content) => update({ content })} /></div><div className="mt-8 grid gap-4 border-t border-white/10 pt-6 md:grid-cols-2"><div><label className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.16em]"><BookMarked size={12} /> References</label><textarea dir={draft.direction} value={refs} onChange={(e) => update({ references: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) })} placeholder="One source per line" className="research-text word-field min-h-[120px] w-full rounded-xl p-3 text-xs leading-6 outline-none" /></div><div><label className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.16em]"><Tags size={12} /> Tags</label><input value={tags} onChange={(e) => update({ tags: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} placeholder="e.g. AI, literature review" className="word-field w-full rounded-xl p-3 text-xs outline-none" /></div></div></div></div></div><footer className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-[10px]"><span>{plain(`${draft.abstract} ${draft.content}`).split(/\s+/).filter(Boolean).length.toLocaleString()} words</span><span className={saveStatus === 'saved' ? 'word-saved' : ''}>{saveStatus === 'saving' ? 'Saving…' : saveStatus === 'unsaved' ? 'Unsaved changes' : <><Check size={11} /> Saved automatically</>}</span></footer></> : <div className="flex h-full flex-col items-center justify-center"><BookMarked className="text-cosmic-cyan" size={32} /><h2 className="mt-5 text-xl font-display">Your research, in one place</h2><button onClick={() => void create()} className="mt-6 flex items-center gap-2 rounded-xl bg-cosmic-cyan px-4 py-2.5 text-sm font-semibold text-navy-950"><FilePlus2 size={16} />New research document</button></div>}</section>
  </div>{historyOpen && <div className="word-history-backdrop" onMouseDown={() => setHistoryOpen(false)}><aside className="word-history" onMouseDown={(e) => e.stopPropagation()}><div className="flex items-center justify-between"><h2 className="font-semibold">Version history</h2><button className="word-icon-button" onClick={() => setHistoryOpen(false)}>×</button></div><p className="mt-1 text-xs opacity-60">Each automatic save creates a restore point.</p><div className="mt-5 space-y-2">{loadingHistory ? <p className="text-sm">Loading…</p> : revisions.length ? revisions.map((r) => <div key={r.id} className="word-revision"><div><p className="text-xs font-medium">{r.title || 'Untitled research note'}</p><p className="text-[10px] opacity-60">{new Date(r.created_at).toLocaleString()}</p></div><button onClick={() => void restore(r)} className="flex items-center gap-1 text-xs"><RotateCcw size={13} /> Restore</button></div>) : <p className="text-sm opacity-60">No earlier versions yet.</p>}</div></aside></div>}</div>;
}
