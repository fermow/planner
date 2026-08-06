import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function NotificationToast() {
  const { toast, clearToast } = useStore();

  const icons = {
    success: <CheckCircle size={18} className="text-green-400" />,
    error: <AlertCircle size={18} className="text-red-400" />,
    info: <Info size={18} className="text-cosmic-cyan" />,
  };

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 20, x: '-50%' }}
          className="fixed bottom-6 left-1/2 z-50 flex items-center gap-3 glass-card px-4 py-3 shadow-xl"
        >
          {icons[toast.type]}
          <span className="text-sm text-navy-100">{toast.message}</span>
          <button onClick={clearToast} className="ml-2 text-navy-300 hover:text-white">
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
