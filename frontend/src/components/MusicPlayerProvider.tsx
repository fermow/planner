import { createContext, useCallback, useContext, useEffect, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music4, Play, Pause, Repeat, SkipBack, SkipForward, Volume2, VolumeX, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useTranslation } from '../i18n/t';
import type { MusicTrack } from '../types';
import { Visualizer, coverGradient, formatTime } from './MusicVisualizer';

interface MusicPlayerContextValue {
  currentTrack: MusicTrack | null;
  currentId: string | null;
  isPlaying: boolean;
  isRepeat: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  analyserRef: MutableRefObject<AnalyserNode | null>;
  playTrack: (id: string) => void;
  togglePlay: () => void;
  toggleRepeat: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seek: (time: number) => void;
  changeVolume: (v: number) => void;
  stop: () => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextValue | null>(null);

export function useMusicPlayer(): MusicPlayerContextValue {
  const ctx = useContext(MusicPlayerContext);
  if (!ctx) throw new Error('useMusicPlayer must be used within MusicPlayerProvider');
  return ctx;
}

export default function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const music = useStore((s) => s.music);
  const { t } = useTranslation();

  const audioRef = useRef<HTMLAudioElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRepeat, setIsRepeat] = useState(() => {
    try { return localStorage.getItem('celestial-music-repeat') === '1'; } catch { return false; }
  });
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    try { return Number(localStorage.getItem('celestial-music-volume') || '0.8'); } catch { return 0.8; }
  });

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

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentId) return;
    if (audio.paused) {
      ensureAnalyser();
      ctxRef.current?.resume();
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [currentId, ensureAnalyser]);

  const playTrack = useCallback(
    (id: string) => {
      const audio = audioRef.current;
      const track = music.find((m) => m.id === id);
      if (!audio || !track) return;
      if (currentId === id) {
        togglePlay();
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
    [currentId, music, togglePlay, ensureAnalyser]
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

  const seek = useCallback((time: number) => {
    setCurrentTime(time);
    if (audioRef.current) audioRef.current.currentTime = time;
  }, []);

  const changeVolume = useCallback((v: number) => {
    setVolume(v);
    try { localStorage.setItem('celestial-music-volume', String(v)); } catch {}
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  const toggleRepeat = useCallback(() => {
    const next = !isRepeat;
    setIsRepeat(next);
    try { localStorage.setItem('celestial-music-repeat', next ? '1' : '0'); } catch {}
  }, [isRepeat]);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    setCurrentId(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const value: MusicPlayerContextValue = {
    currentTrack,
    currentId,
    isPlaying,
    isRepeat,
    currentTime,
    duration,
    volume,
    analyserRef,
    playTrack,
    togglePlay,
    toggleRepeat,
    nextTrack,
    prevTrack,
    seek,
    changeVolume,
    stop,
  };

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}

      {/* Global audio element — lives outside page components so playback survives navigation */}
      <audio
        ref={audioRef}
        hidden
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          if (isRepeat && audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
          } else {
            nextTrack();
          }
        }}
      />

      {/* Sticky player bar — visible on every page while a track is active */}
      <AnimatePresence>
        {currentTrack && (
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed bottom-16 left-0 right-0 z-40 px-2 pb-2 md:bottom-0 md:px-4 md:pb-3"
          >
            <div className="glass-card relative max-w-3xl mx-auto p-2.5 md:p-3 shadow-2xl">
              {/* Close / stop — pinned to the top-right corner, raised above the bar */}
              <button
                onClick={stop}
                className="absolute -top-2.5 -right-2 md:-top-3 md:-right-3 p-1 rounded-full bg-navy-900/90 border border-white/10 shadow-lg text-navy-300 hover:text-cosmic-rose hover:bg-navy-800 transition-colors z-10"
                aria-label={t('music.close')}
                title={t('music.close')}
              >
                <X size={14} />
              </button>
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
                      onClick={togglePlay}
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
                      onChange={(e) => seek(Number(e.target.value))}
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
                  <button
                    onClick={toggleRepeat}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isRepeat
                        ? 'text-cosmic-cyan bg-white/5'
                        : 'text-navy-300 hover:text-white hover:bg-white/5'
                    }`}
                    aria-label={t('music.repeat')}
                    title={t('music.repeat')}
                  >
                    <Repeat size={15} />
                  </button>
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
                  onChange={(e) => seek(Number(e.target.value))}
                  className="flex-1 h-1.5"
                  style={{ accentColor: '#40e0d0' }}
                />
                <span className="text-[9px] text-navy-300/50 tabular-nums shrink-0">{formatTime(duration)}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </MusicPlayerContext.Provider>
  );
}
