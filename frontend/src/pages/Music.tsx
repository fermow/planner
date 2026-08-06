import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Music4, UploadCloud, Play, Pause, SkipBack, SkipForward,
  Volume2, VolumeX, Pencil, Trash2, X, ListMusic, Clock,
} from 'lucide-react';
import { useTranslation } from '../i18n/t';
import { useStore } from '../store/useStore';
import type { MusicTrack } from '../types';

const GRADIENTS: [string, string][] = [
  ['#22d3ee', '#3b82f6'],
  ['#f0c040', '#f97316'],
  ['#e040a0', '#8040e0'],
  ['#60d040', '#10b981'],
  ['#f43f5e', '#a855f7'],
  ['#38bdf8', '#14b8a6'],
];

function coverGradient(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const [a, b] = GRADIENTS[h % GRADIENTS.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Web Audio visualizer ───
function Visualizer({ analyser, playing, className }: { analyser: AnalyserNode | null; playing: boolean; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const { clientWidth, clientHeight } = canvas;
      canvas.width = clientWidth * dpr;
      canvas.height = clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    let raf = 0;
    const data = new Uint8Array(analyser ? analyser.frequencyBinCount : 64);

    const draw = (time: number) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      const bars = Math.min(48, Math.floor(w / 5));
      if (analyser && playing) {
        analyser.getByteFrequencyData(data);
      } else {
        data.fill(0);
      }

      const step = Math.max(1, Math.floor(data.length / bars));
      const gap = 2;
      const bw = (w - gap * (bars - 1)) / bars;
      for (let i = 0; i < bars; i++) {
        let value = data[i * step] / 255;
        if (!playing) {
          value = (Math.sin(time / 500 + i * 0.5) + 1) / 2 * 0.12;
        }
        const bh = Math.max(2, value * h * 0.95);
        const g = ctx.createLinearGradient(0, h, 0, h - bh);
        g.addColorStop(0, '#40e0d0');
        g.addColorStop(1, '#f0c040');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.roundRect(i * (bw + gap), h - bh, bw, bh, bw / 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [analyser, playing]);

  return <canvas ref={canvasRef} className={className} style={{ width: '100%', height: '100%' }} />;
}

export default function MusicPage() {
  const { t } = useTranslation();
  const { music, fetchMusic, uploadMusic, editMusic, removeMusic, showToast } = useStore();

  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    try { return Number(localStorage.getItem('celestial-music-volume') || '0.8'); } catch { return 0.8; }
  });
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingTrack, setEditingTrack] = useState<MusicTrack | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');

  useEffect(() => {
    fetchMusic();
  }, [fetchMusic]);

  const currentTrack = music.find((m) => m.id === currentId) || null;

  const ensureAnalyser = useCallback((): AnalyserNode | null => {
    const audio = audioRef.current;
    if (!audio) return null;
    if (analyserRef.current) return analyserRef.current;
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new Ctx();
      const src = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      src.connect(analyser);
      analyser.connect(ctx.destination);
      analyserRef.current = analyser;
      ctxRef.current = ctx;
      return analyser;
    } catch {
      return null;
    }
  }, []);

  const playTrack = useCallback(
    (id: string) => {
      const audio = audioRef.current;
      const track = music.find((m) => m.id === id);
      if (!audio || !track) return;
      if (currentId === id) {
        if (isPlaying) {
          audio.pause();
        } else {
          ensureAnalyser();
          ctxRef.current?.resume();
          audio.play().catch(() => {});
        }
        return;
      }
      setCurrentTime(0);
      setDuration(0);
      setCurrentId(id);
      audio.src = `/api/music/file/${track.filename}`;
      ensureAnalyser();
      ctxRef.current?.resume();
      audio.play().catch(() => {});
    },
    [currentId, isPlaying, music, ensureAnalyser]
  );

  const nextTrack = useCallback(() => {
    if (music.length === 0) return;
    const idx = music.findIndex((m) => m.id === currentId);
    const next = music[(idx + 1) % music.length];
    playTrack(next.id);
  }, [music, currentId, playTrack]);

  const prevTrack = useCallback(() => {
    if (music.length === 0) return;
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    const idx = music.findIndex((m) => m.id === currentId);
    const prev = music[(idx - 1 + music.length) % music.length];
    playTrack(prev.id);
  }, [music, currentId, playTrack]);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
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
    },
    [uploadMusic, showToast]
  );

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
    if (currentId === track.id) {
      audioRef.current?.pause();
      setCurrentId(null);
      setIsPlaying(false);
    }
    await removeMusic(track.id);
  };

  const changeVolume = (v: number) => {
    setVolume(v);
    try { localStorage.setItem('celestial-music-volume', String(v)); } catch {}
    if (audioRef.current) audioRef.current.volume = v;
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
            onClick={() => fileInputRef.current?.click()}
            className="celestial-btn celestial-btn-primary text-xs flex items-center gap-1.5 px-3 py-2"
          >
            <UploadCloud size={14} /> {t('music.upload')}
          </button>
          <input
            ref={fileInputRef}
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
        onClick={() => fileInputRef.current?.click()}
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

      {/* Audio element */}
      <audio
        ref={audioRef}
        hidden
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={nextTrack}
      />

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

      {/* Sticky player bar */}
      <AnimatePresence>
        {currentTrack && (
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed bottom-0 left-0 right-0 z-40 px-2 pb-2 md:px-4 md:pb-3"
          >
            <div className="glass-card max-w-3xl mx-auto p-2.5 md:p-3 shadow-2xl">
              <div className="flex items-center gap-3">
                {/* Cover + info */}
                <div
                  className="w-10 h-10 md:w-12 md:h-12 rounded-lg shrink-0 flex items-center justify-center overflow-hidden"
                  style={{ background: coverGradient(currentTrack.title + currentTrack.artist) }}
                >
                  {isPlaying ? (
                    <Visualizer analyser={analyserRef.current} playing className="w-8 h-8" />
                  ) : (
                    <Music4 size={18} className="text-white/80" />
                  )}
                </div>
                <div className="min-w-0 flex-1 md:flex-none md:w-48">
                  <p className="text-xs md:text-sm font-medium text-white truncate">{currentTrack.title}</p>
                  <p className="text-[10px] text-navy-300/50 truncate">
                    {currentTrack.artist || t('music.unknownArtist')}
                  </p>
                </div>

                {/* Controls + seek (center) */}
                <div className="flex-1 hidden md:flex flex-col items-center gap-1">
                  <div className="flex items-center gap-3">
                    <button onClick={prevTrack} className="p-1 text-navy-300 hover:text-white transition-colors" aria-label="Previous">
                      <SkipBack size={16} />
                    </button>
                    <button
                      onClick={() => playTrack(currentTrack.id)}
                      className="w-9 h-9 rounded-full bg-gradient-to-br from-cosmic-cyan to-cosmic-gold flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform"
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                    </button>
                    <button onClick={nextTrack} className="p-1 text-navy-300 hover:text-white transition-colors" aria-label="Next">
                      <SkipForward size={16} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-[9px] text-navy-300/50 tabular-nums shrink-0 w-8 text-right">
                      {formatTime(currentTime)}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={duration || 0}
                      step={0.5}
                      value={currentTime}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setCurrentTime(v);
                        if (audioRef.current) audioRef.current.currentTime = v;
                      }}
                      className="flex-1 h-1.5"
                      style={{ accentColor: '#40e0d0' }}
                    />
                    <span className="text-[9px] text-navy-300/50 tabular-nums shrink-0 w-8">
                      {formatTime(duration)}
                    </span>
                  </div>
                </div>

                {/* Volume */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => changeVolume(volume > 0 ? 0 : 0.8)} className="p-1 text-navy-300 hover:text-white" aria-label="Volume">
                    {volume > 0 ? <Volume2 size={15} /> : <VolumeX size={15} />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={volume}
                    onChange={(e) => changeVolume(Number(e.target.value))}
                    className="w-16 md:w-24 h-1"
                    style={{ accentColor: '#40e0d0' }}
                  />
                </div>
              </div>

              {/* Mobile-only seek */}
              <div className="flex items-center gap-2 mt-2 md:hidden">
                <span className="text-[9px] text-navy-300/50 tabular-nums shrink-0">{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.5}
                  value={currentTime}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setCurrentTime(v);
                    if (audioRef.current) audioRef.current.currentTime = v;
                  }}
                  className="flex-1 h-1.5"
                  style={{ accentColor: '#40e0d0' }}
                />
                <span className="text-[9px] text-navy-300/50 tabular-nums shrink-0">{formatTime(duration)}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
