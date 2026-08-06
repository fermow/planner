import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from '../i18n/t';
import { Tldraw } from 'tldraw';
import { Plus, Trash2, Pen, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function WhiteboardCanvas() {
  const { t } = useTranslation();
  const { whiteboards, fetchWhiteboards, addWhiteboard, removeWhiteboard, saveWhiteboard } = useStore();
  const [activeWbId, setActiveWbId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<any>(null);
  const activeIdRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapshotRef = useRef<any>(undefined);

  useEffect(() => {
    activeIdRef.current = activeWbId;
  }, [activeWbId]);

  useEffect(() => {
    fetchWhiteboards().finally(() => setLoading(false));
  }, [fetchWhiteboards]);

  useEffect(() => {
    if (whiteboards.length > 0 && !activeWbId) {
      setActiveWbId(whiteboards[0].id);
    }
  }, [whiteboards, activeWbId]);

  const activeWb = whiteboards.find((w) => w.id === activeWbId);

  if (activeWb?.content && Object.keys(activeWb.content).length > 0) {
    snapshotRef.current = activeWb.content;
  } else {
    snapshotRef.current = undefined;
  }

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const editor = editorRef.current;
      const id = activeIdRef.current;
      if (editor && id) {
        setSaving(true);
        try {
          const snapshot = editor.getSnapshot();
          await saveWhiteboard(id, { content: snapshot });
        } finally {
          setSaving(false);
        }
      }
    }, 1000);
  }, [saveWhiteboard]);

  const handleMount = useCallback(
    (editor: any) => {
      editorRef.current = editor;
      if (snapshotRef.current) {
        try {
          editor.loadSnapshot(snapshotRef.current);
        } catch {}
      }
      const cleanup = editor.store.listen(() => scheduleSave());
      return () => {
        cleanup();
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        editorRef.current = null;
      };
    },
    [scheduleSave]
  );

  const handleCreate = async () => {
    setLoading(true);
    try {
      const id = await addWhiteboard();
      setActiveWbId(id);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const remaining = whiteboards.filter((w) => w.id !== id);
    await removeWhiteboard(id);
    setActiveWbId(remaining.length > 0 ? remaining[0].id : null);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={24} className="text-navy-300/40 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3 glass-card px-3 py-2 rounded-xl shrink-0">
        <Pen size={16} className="text-cosmic-cyan shrink-0" />
        <span className="text-xs font-medium text-white mr-1 shrink-0">{t('boards.whiteboard')}</span>
        <div className="flex gap-1 overflow-x-auto flex-1 mx-1">
          {whiteboards.map((wb) => (
            <button
              key={wb.id}
              onClick={() => setActiveWbId(wb.id)}
              className={`px-3 py-1 rounded-lg text-xs whitespace-nowrap transition-all ${
                activeWbId === wb.id
                  ? 'bg-white/10 text-cosmic-cyan'
                  : 'text-navy-200/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {wb.title}
            </button>
          ))}
        </div>
        {saving && <Loader2 size={12} className="text-navy-300/40 animate-spin shrink-0" />}
        <button
          onClick={handleCreate}
          className="p-1.5 rounded-lg hover:bg-white/5 text-navy-200 hover:text-cosmic-cyan transition-all shrink-0"
          title={t('boards.newWhiteboard')}
        >
          <Plus size={16} />
        </button>
        {activeWb && (
          <button
            onClick={() => handleDelete(activeWb.id)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-navy-200 hover:text-cosmic-rose transition-all shrink-0"
            title={t('common.delete')}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="flex-1 rounded-xl overflow-hidden relative min-h-0">
        {activeWb ? (
          <Tldraw
            key={activeWb.id}
            onMount={handleMount}
            colorScheme="dark"
            autoFocus={false}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-3 glass-card">
            <Pen size={40} className="text-navy-300/20" />
            <p className="text-sm text-navy-200/40">{t('boards.noWhiteboards')}</p>
            <button
              onClick={handleCreate}
              className="celestial-btn celestial-btn-primary inline-flex items-center gap-2 text-xs"
            >
              <Plus size={14} /> {t('boards.createWhiteboard')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
