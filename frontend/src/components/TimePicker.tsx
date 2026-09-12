import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, Clock, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  className?: string;
}

function splitTime(value: string) {
  const [hour = '00', minute = '00'] = value.split(':');
  return {
    hour: String(Math.min(23, Math.max(0, Number(hour) || 0))).padStart(2, '0'),
    minute: String(Math.min(59, Math.max(0, Number(minute) || 0))).padStart(2, '0'),
  };
}

function wrap(value: number, limit: number) {
  return ((value % limit) + limit) % limit;
}

const controlButtonStyle = {
  alignItems: 'center',
  background: 'transparent',
  border: 0,
  borderRadius: 12,
  color: '#40e0d0',
  cursor: 'pointer',
  display: 'flex',
  height: 34,
  justifyContent: 'center',
  padding: 0,
  width: 60,
} as const;

export function TimePicker({ value, onChange, className = '' }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const { hour, minute } = splitTime(value);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    if (open) document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  const shiftTime = (part: 'hour' | 'minute', amount: number) => {
    const nextHour = part === 'hour'
      ? String(wrap(Number(hour) + amount, 24)).padStart(2, '0')
      : hour;
    const nextMinute = part === 'minute'
      ? String(wrap(Number(minute) + amount, 60)).padStart(2, '0')
      : minute;
    onChange(`${nextHour}:${nextMinute}`);
  };

  const Spinner = ({ part, current, label }: { part: 'hour' | 'minute'; current: string; label: string }) => (
    <div style={{ alignItems: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button type="button" aria-label={`Increase ${label}`} onClick={() => shiftTime(part, 1)} style={controlButtonStyle}>
        <ChevronUp size={25} strokeWidth={2.5} />
      </button>
      <output
        aria-label={label}
        style={{
          alignItems: 'center', background: '#40e0d0', borderRadius: 16, color: '#07101c',
          display: 'flex', fontFamily: 'JetBrains Mono, monospace', fontSize: 34, fontWeight: 700,
          height: 70, justifyContent: 'center', letterSpacing: '-0.05em', lineHeight: 1, width: 76,
        }}
      >
        {current}
      </output>
      <button type="button" aria-label={`Decrease ${label}`} onClick={() => shiftTime(part, -1)} style={controlButtonStyle}>
        <ChevronDown size={25} strokeWidth={2.5} />
      </button>
    </div>
  );

  return (
    <div className={`inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-left text-xs text-navy-100 transition-all hover:border-cosmic-cyan/50 hover:bg-cosmic-cyan/10 focus:outline-none focus:ring-2 focus:ring-cosmic-cyan/40"
      >
        <Clock size={13} className="shrink-0 text-cosmic-cyan" />
        <span className="font-mono text-sm tabular-nums text-white">{value || '--:--'}</span>
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              role="presentation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onMouseDown={() => setOpen(false)}
              style={{
                alignItems: 'center', background: 'rgba(3, 5, 13, 0.72)', backdropFilter: 'blur(14px)',
                display: 'flex', inset: 0, justifyContent: 'center', padding: 16, position: 'fixed',
                WebkitBackdropFilter: 'blur(14px)', zIndex: 2147483647,
              }}
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label="Select start time"
                initial={{ opacity: 0, scale: 0.94, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 10 }}
                transition={{ duration: 0.16 }}
                onMouseDown={(event) => event.stopPropagation()}
                style={{
                  background: '#090d18', border: '1px solid rgba(64, 224, 208, 0.45)', borderRadius: 20,
                  boxShadow: '0 24px 80px rgba(0, 0, 0, 0.75), 0 0 35px rgba(64, 224, 208, 0.12)',
                  boxSizing: 'border-box', color: '#ffffff', padding: 20, position: 'relative', width: 292,
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close time picker"
                  style={{ background: 'transparent', border: 0, color: '#8492cf', cursor: 'pointer', padding: 4, position: 'absolute', right: 12, top: 12 }}
                >
                  <X size={17} />
                </button>

                <div style={{ alignItems: 'center', color: '#40e0d0', display: 'flex', fontSize: 12, fontWeight: 700, gap: 7, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  <Clock size={15} /> Start time
                </div>

                <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'center', margin: '22px 0 18px', gap: 18 }}>
                  <Spinner part="hour" current={hour} label="Hour" />
                  <span style={{ color: '#40e0d0', fontSize: 28, fontWeight: 700, marginTop: 1 }}>:</span>
                  <Spinner part="minute" current={minute} label="Minute" />
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{ background: '#40e0d0', border: 0, borderRadius: 12, color: '#07101c', cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: '11px 14px', width: '100%' }}
                >
                  Done
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
