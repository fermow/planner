import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from '../i18n/t';
import { Plus, Trash2, Table2, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function TableEditor() {
  const { t } = useTranslation();
  const { tables, fetchTables, addTable, removeTable, saveTable } = useStore();
  const [activeTblId, setActiveTblId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTables().finally(() => setLoading(false));
  }, [fetchTables]);

  useEffect(() => {
    if (tables.length > 0 && !activeTblId) {
      setActiveTblId(tables[0].id);
    }
  }, [tables, activeTblId]);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const activeTbl = tables.find((t) => t.id === activeTblId);

  const scheduleSave = useCallback(
    (headers: string[], rows: string[][]) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        if (activeTblId) {
          setSaving(true);
          try {
            await saveTable(activeTblId, { headers, rows });
          } finally {
            setSaving(false);
          }
        }
      }, 800);
    },
    [activeTblId, saveTable]
  );

  const updateCell = (rowIdx: number, colIdx: number, value: string) => {
    if (!activeTbl) return;
    const newRows = activeTbl.rows.map((r, ri) =>
      ri === rowIdx ? r.map((c, ci) => (ci === colIdx ? value : c)) : r
    );
    scheduleSave(activeTbl.headers, newRows);
  };

  const updateHeader = (colIdx: number, value: string) => {
    if (!activeTbl) return;
    const newHeaders = activeTbl.headers.map((h, i) => (i === colIdx ? value : h));
    scheduleSave(newHeaders, activeTbl.rows);
  };

  const addRow = () => {
    if (!activeTbl) return;
    const newRows = [...activeTbl.rows, activeTbl.headers.map(() => '')];
    scheduleSave(activeTbl.headers, newRows);
  };

  const deleteRow = (rowIdx: number) => {
    if (!activeTbl || activeTbl.rows.length <= 1) return;
    const newRows = activeTbl.rows.filter((_, i) => i !== rowIdx);
    scheduleSave(activeTbl.headers, newRows);
  };

  const addColumn = () => {
    if (!activeTbl) return;
    const n = activeTbl.headers.length + 1;
    const newHeaders = [...activeTbl.headers, `${t('boards.columnPrefix')} ${n}`];
    const newRows = activeTbl.rows.map((r) => [...r, '']);
    scheduleSave(newHeaders, newRows);
  };

  const deleteColumn = (colIdx: number) => {
    if (!activeTbl || activeTbl.headers.length <= 1) return;
    const newHeaders = activeTbl.headers.filter((_, i) => i !== colIdx);
    const newRows = activeTbl.rows.map((r) => r.filter((_, i) => i !== colIdx));
    scheduleSave(newHeaders, newRows);
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      const id = await addTable();
      setActiveTblId(id);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const remaining = tables.filter((t) => t.id !== id);
    await removeTable(id);
    setActiveTblId(remaining.length > 0 ? remaining[0].id : null);
  };

  const startEdit = (row: number, col: number, value: string) => {
    setEditingCell({ row, col });
    setEditValue(value);
  };

  const commitEdit = () => {
    if (!editingCell) return;
    if (editingCell.row === -1) {
      updateHeader(editingCell.col, editValue);
    } else {
      updateCell(editingCell.row, editingCell.col, editValue);
    }
    setEditingCell(null);
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
        <Table2 size={16} className="text-cosmic-cyan shrink-0" />
        <span className="text-xs font-medium text-white mr-1 shrink-0">{t('boards.tables')}</span>
        <div className="flex gap-1 overflow-x-auto flex-1 mx-1">
          {tables.map((tbl) => (
            <button
              key={tbl.id}
              onClick={() => setActiveTblId(tbl.id)}
              className={`px-3 py-1 rounded-lg text-xs whitespace-nowrap transition-all ${
                activeTblId === tbl.id
                  ? 'bg-white/10 text-cosmic-cyan'
                  : 'text-navy-200/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {tbl.title}
            </button>
          ))}
        </div>
        {saving && <Loader2 size={12} className="text-navy-300/40 animate-spin shrink-0" />}
        <button
          onClick={handleCreate}
          className="p-1.5 rounded-lg hover:bg-white/5 text-navy-200 hover:text-cosmic-cyan transition-all shrink-0"
          title={t('boards.newTable')}
        >
          <Plus size={16} />
        </button>
        {activeTbl && (
          <button
            onClick={() => handleDelete(activeTbl.id)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-navy-200 hover:text-cosmic-rose transition-all shrink-0"
            title={t('common.delete')}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {activeTbl ? (
        <div className="flex-1 overflow-auto rounded-xl glass-card p-4">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="w-8" />
                {activeTbl.headers.map((h, ci) => (
                  <th key={ci} className="border border-white/10 p-0 relative group">
                    {editingCell?.row === -1 && editingCell?.col === ci ? (
                      <input
                        ref={inputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                        className="w-full bg-transparent text-xs text-white px-2 py-1.5 outline-none"
                      />
                    ) : (
                      <div
                        className="text-xs text-navy-200 font-medium px-2 py-1.5 cursor-pointer hover:bg-white/5 min-h-[28px]"
                        onClick={() => startEdit(-1, ci, h)}
                      >
                        {h}
                      </div>
                    )}
                    <button
                      onClick={() => deleteColumn(ci)}
                      className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 w-3 h-3 rounded-full bg-cosmic-rose/80 text-white flex items-center justify-center text-[8px]"
                    >
                      ✕
                    </button>
                  </th>
                ))}
                <th className="w-8 border border-white/10 p-0">
                  <button
                    onClick={addColumn}
                    className="w-full h-full p-1 text-navy-200/40 hover:text-cosmic-cyan transition-all"
                    title={t('boards.addColumn')}
                  >
                    <Plus size={12} className="mx-auto" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {activeTbl.rows.map((row, ri) => (
                <tr key={ri}>
                  <td className="border border-white/10 p-0 text-center">
                    <div className="flex items-center justify-center gap-0.5">
                      <button
                        onClick={() => deleteRow(ri)}
                        className="p-0.5 text-navy-300/30 hover:text-cosmic-rose transition-all"
                        title={t('boards.deleteRow')}
                      >
                        <Trash2 size={10} />
                      </button>
                      <span className="text-[10px] text-navy-300/30">{ri + 1}</span>
                    </div>
                  </td>
                  {row.map((cell, ci) => (
                    <td key={ci} className="border border-white/10 p-0">
                      {editingCell?.row === ri && editingCell?.col === ci ? (
                        <input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitEdit();
                            if (e.key === 'Escape') setEditingCell(null);
                          }}
                          className="w-full bg-transparent text-xs text-white px-2 py-1.5 outline-none"
                          autoFocus
                        />
                      ) : (
                        <div
                          className="text-xs text-white px-2 py-1.5 cursor-pointer hover:bg-white/5 min-h-[28px]"
                          onClick={() => startEdit(ri, ci, cell)}
                        >
                          {cell || <span className="text-navy-300/20">—</span>}
                        </div>
                      )}
                    </td>
                  ))}
                  <td className="border border-white/10 p-0 w-8" />
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={addRow}
            className="mt-2 flex items-center gap-1 text-xs text-navy-200/40 hover:text-cosmic-cyan transition-all px-2 py-1"
          >
            <Plus size={12} /> {t('boards.addRow')}
          </button>
        </div>
      ) : (
        <div className="h-full flex flex-col items-center justify-center gap-3 glass-card">
          <Table2 size={40} className="text-navy-300/20" />
          <p className="text-sm text-navy-200/40">{t('boards.noTables')}</p>
          <button
            onClick={handleCreate}
            className="celestial-btn celestial-btn-primary inline-flex items-center gap-2 text-xs"
          >
            <Plus size={14} /> {t('boards.createTable')}
          </button>
        </div>
      )}
    </div>
  );
}
