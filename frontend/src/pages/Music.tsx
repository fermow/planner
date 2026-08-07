import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Music4, UploadCloud, Play, Pause, ListMusic, Pencil, Trash2, X,
} from 'lucide-react';
import { useTranslation } from '../i18n/t';
import { useStore } from '../store/useStore';
import { useMusicPlayer } from '../components/MusicPlayerProvider';
import { Visualizer, coverGradient, formatTime, formatSize } from '../components/MusicVisualizer';
import type { MusicTrack } from '../types';

export default function MusicPage() {
  const { t } = useTranslation();
  const { music, fetchMusic, uploadMusic, editMusic, removeMusic, showToast } = useStore();
  const { currentId, isPlaying, playTrack, analyserRef, stop } = useMusicPlayer();

  const [fileInput, setFileInput] = useState<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingTrack, setEditingTrack] = useState<MusicTrack | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');

  useEffect(() => {
    fetchMusic();
  }, [fetchMusic]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const audioFiles = Array.from(files).filter((f) =>
      /\.(mp3|wav|ogg|m4a|flac|aac|opus|webm)$/i.test(f.name)
    );
    if (audioFiles.length === 0) {
      showToast('Unsupported audio format', 'error');
      setUploading(false);
      return;
    }
    for (const f of audioFiles) {
      await uploadMusic(f);
    }
    setUploading(false);
  };

  const openEdit = (track: MusicTrack) => {
    setEditingTrack(track);
    setEditTitle(track.title);
    setEditArtist(track.artist);
  };

  const saveEdit = async () => {
    if (!editingTrack) return;
    await editMusic(editingTrack.id, { title: editTitle.trim(), artist: editArtist.trim() });
    setEditingTrack(null);
  };

  const removeTrack = async (track: MusicTrack) => {
    if (currentId === track.id) stop();
    await removeMusic(track.id);
  };

  const hasTracks = music.length > 0;

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg md:text-2xl font-display text-white flex items-center gap-2">
            <Music4 size={20} className="text-cosmic-rose" />
            {t('music.title')}
          </h2>
          <p className="text-xs md:text-sm text-navy-200/60">{t('music.count', { n: music.length })}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInput?.click()}
            className="celestial-btn celestial-btn-primary text-xs flex items-center gap-1.5 px-3 py-2"
          >
            <UploadCloud size={14} /> {t('music.upload')}
          </button>
          <input
            ref={setFileInput}
            type="file"
            accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.aac,.opus,.webm"
            multiple
            className="hidden"
            onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
          />
        </div>
      </div>

      {/* Upload drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileInput?.click()}
        className={`rounded-2xl border-2 border-dashed p-6 md:p-8 text-center transition-all cursor-pointer ${
          dragOver
            ? 'border-cosmic-cyan/60 bg-cosmic-cyan/5'
            : 'border-white/10 bg-white/[0.02] hover:border-cosmic-cyan/30 hover:bg-white/[0.04]'
        }`}
      >
        <UploadCloud size={28} className={`mx-auto mb-2 ${dragOver ? 'text-cosmic-cyan' : 'text-navy-300/40'}`} />
        <p className="text-sm text-navy-200/70">
          {uploading ? 'Uploading…' : t('music.dropHint')}
        </p>
        <p className="text-[10px] text-navy-300/40 mt-1">{t('music.supported')}</p>
      </div>

      {/* Track grid */}
      {!hasTracks ? (
        <div className="glass-card p-10 text-center">
          <ListMusic size={48} className="mx-auto text-navy-300/20 mb-3" />
          <p className="text-sm text-navy-200/40">{t('music.empty')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {music.map((track, i) => {
            const isCurrent = track.id === currentId;
            const playing = isCurrent && isPlaying;
            const grad = coverGradient(track.title + track.artist);
            return (
              <motion.div
                key={track.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`group glass-card p-3 transition-all ${
                  isCurrent ? 'ring-2 ring-cosmic-cyan/40' : 'hover:ring-1 hover:ring-white/15'
                }`}
              >
                {/* Cover */}
                <div
                  className="relative w-full aspect-square rounded-xl overflow-hidden mb-2.5 cursor-pointer"
                  style={{ background: grad }}
                  onClick={() => playTrack(track.id)}
                >
                  <div className="absolute inset-0 bg-black/30 transition-opacity group-hover:bg-black/45" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    {playing ? (
                      <Visualizer analyser={analyserRef.current} playing className="w-16 h-16 opacity-90" />
                    ) : (
                      <Music4 size={28} className="text-white/70 transition-transform group-hover:scale-110" />
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); playTrack(track.id); }}
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={playing ? 'Pause' : 'Play'}
                  >
                    <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white shadow-lg">
                      {playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                    </div>
                  </button>
                  <span className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded bg-black/40 text-white/70 backdrop-blur">
                    {track.duration ? formatTime(track.duration) : formatSize(track.size)}
                  </span>
                </div>

                {/* Meta */}
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${isCurrent ? 'text-cosmic-cyan' : 'text-white'}`}>
                      {track.title}
                    </p>
                    <p className="text-[10px] text-navy-300/50 truncate">
                      {track.artist || t('music.unknownArtist')}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(track)} className="p-1 rounded hover:bg-white/5 text-navy-300/40 hover:text-cosmic-cyan">
                      <Pencil size={11} />
                    </button>
                    <button onClick={() => removeTrack(track)} className="p-1 rounded hover:bg-white/5 text-navy-300/40 hover:text-cosmic-rose">
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Edit modal */}
      <AnimatePresence>
        {editingTrack && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setEditingTrack(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card p-5 w-full max-w-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-display text-white flex items-center gap-2">
                  <Pencil size={14} className="text-cosmic-cyan" /> {t('music.edit')}
                </h3>
                <button onClick={() => setEditingTrack(null)} className="p-1.5 rounded hover:bg-white/5 text-navy-300">
                  <X size={15} />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-navy-200/60 block mb-1">{t('music.titleLabel')}</label>
                  <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="celestial-input text-sm w-full" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-navy-200/60 block mb-1">{t('music.artistLabel')}</label>
                  <input value={editArtist} onChange={(e) => setEditArtist(e.target.value)} className="celestial-input text-sm w-full" />
                </div>
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-white/5">
                <button onClick={saveEdit} className="celestial-btn celestial-btn-primary flex-1 text-sm py-2">{t('music.save')}</button>
                <button onClick={() => setEditingTrack(null)} className="celestial-btn celestial-btn-secondary text-sm py-2">{t('music.cancel')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
