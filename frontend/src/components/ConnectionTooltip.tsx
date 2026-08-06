import { motion, AnimatePresence } from 'framer-motion';
import { Connection } from '../types';
import { resolveConnectionLabel, getConnectionColor } from './connectionLabels';

interface ConnectionTooltipProps {
  connection: Connection | null;
  position: { x: number; y: number } | null;
  isVisible: boolean;
}

export default function ConnectionTooltip({ connection, position, isVisible }: ConnectionTooltipProps) {
  if (!connection || !position || !isVisible) return null;

  const label = resolveConnectionLabel(connection);
  const color = getConnectionColor(connection);
  const icon = connection.icon || connection.emoji || '👤';

  const adjustedX = Math.min(position.x, window.innerWidth - 260);
  const adjustedY = Math.min(position.y, window.innerHeight - 200);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 4 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="fixed z-[100] pointer-events-none"
          style={{
            left: adjustedX,
            top: adjustedY,
          }}
        >
          <div
            className="glass-card p-3.5 w-64 shadow-2xl"
            style={{
              borderTop: `3px solid ${color}`,
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ background: `${color}20`, border: `2px solid ${color}40` }}
              >
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white truncate">{connection.name}</h3>
                <div className="flex items-center gap-1 mt-0.5">
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{ background: `${color}20`, color }}
                  >
                    {label.label}
                  </span>
                  {connection.tags.length > 0 && (
                    <span className="text-[9px] text-navy-300/40">+{connection.tags.length} tags</span>
                  )}
                </div>
                {connection.description && (
                  <p className="text-[10px] text-navy-200/60 mt-1.5 line-clamp-3">
                    {connection.description}
                  </p>
                )}
                {connection.tags.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mt-1.5">
                    {connection.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[7px] px-1 py-0.5 rounded bg-white/5 text-navy-300/40">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                <div
                  className="mt-1.5 h-1 rounded-full overflow-hidden"
                  style={{ background: `${color}20` }}
                >
                  <div className="h-full w-1/3 rounded-full" style={{ background: color }} />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
