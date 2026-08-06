import { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/t';
import { Pen, Table2, Maximize2, Minimize2, ChevronDown, ChevronUp } from 'lucide-react';
import WhiteboardCanvas from './WhiteboardCanvas';
import TableEditor from './TableEditor';

export default function BoardsPage() {
  const { t } = useTranslation();
  const [tableOpen, setTableOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = async () => {
    const el = document.getElementById('board-content');
    if (!el) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await el.requestFullscreen();
    }
  };

  return (
    <div id="board-content" className="flex flex-col h-full">
      {/* Header */}
      {!fullscreen && (
        <div className="flex items-center gap-1 mb-3 shrink-0">
          <div className="flex items-center gap-1.5 text-sm text-navy-200/60">
            <Pen size={14} className="text-cosmic-cyan" />
            <span className="font-medium text-white">{t('boards.whiteboard')}</span>
          </div>
          <div className="w-px h-4 bg-white/5 mx-2" />
          <button onClick={() => setTableOpen(!tableOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              tableOpen ? 'bg-cosmic-cyan/10 text-cosmic-cyan' : 'text-navy-200/60 hover:text-white hover:bg-white/5'
            }`}>
            <Table2 size={14} />
            {t('boards.table')}
            {tableOpen ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          </button>
          <div className="flex-1" />
          <button onClick={toggleFullscreen}
            className="p-1.5 rounded-lg hover:bg-white/5 text-navy-200 hover:text-cosmic-cyan transition-all shrink-0"
            title={fullscreen ? t('boards.exitFullscreen') : t('boards.fullscreen')}>
            {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      )}
      {fullscreen && (
        <div className="fixed top-3 right-3 z-50">
          <button onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-black/40 hover:bg-black/60 text-white/80 hover:text-white transition-all"
            title={t('boards.exitFullscreen')}>
            <Minimize2 size={18} />
          </button>
        </div>
      )}

      {/* Whiteboard */}
      <div className={`flex-1 min-h-0 transition-all duration-300 ${tableOpen ? 'h-1/2' : ''}`}>
        <WhiteboardCanvas />
      </div>

      {/* Table panel — collapsible */}
      <div className={`transition-all duration-300 overflow-hidden ${tableOpen ? 'h-1/2 min-h-[200px] mt-3' : 'h-0'}`}>
        {tableOpen && (
          <div className="h-full">
            <TableEditor />
          </div>
        )}
      </div>
    </div>
  );
}
