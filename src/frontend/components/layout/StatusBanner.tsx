/**
 * COMPONENT: StatusBanner
 * RESPONSIBILITY: Displays global system alerts and notifications in a stack.
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { Status } from '../../types';

interface ToastProps {
  status: Status;
  onClear: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ status, onClear }) => {
  useEffect(() => {
    const duration = status.duration || 4500;
    const timer = setTimeout(() => {
      onClear(status.id);
    }, duration);
    return () => clearTimeout(timer);
  }, [status.id, status.duration, onClear]);

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className="pointer-events-auto mb-2"
    >
      <div className={`flex min-w-[320px] max-w-[400px] items-center gap-3 rounded-xl border p-4 shadow-xl backdrop-blur-md ${
        status.type === 'error' ? 'border-red-200 bg-red-50/90 text-red-800' :
        status.type === 'success' ? 'border-green-200 bg-green-50/90 text-green-800' :
        'border-blue-200 bg-blue-50/90 text-blue-800'
      }`}>
        {status.type === 'error' ? <AlertTriangle size={18} className="shrink-0" /> : 
         status.type === 'success' ? <CheckCircle size={18} className="shrink-0" /> : 
         <Info size={18} className="shrink-0" />}
        <p className="text-xs font-bold leading-tight">{status.message}</p>
        <button 
          onClick={() => onClear(status.id)}
          className="ml-auto rounded-lg p-1 transition-colors hover:bg-black/5 shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    </motion.div>
  );
};

interface StatusBannerProps {
  statuses: Status[];
  onClear: (id: string) => void;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({ statuses, onClear }) => {
  return (
    <div className="fixed top-20 left-1/2 z-[2000] -translate-x-1/2 pointer-events-none flex flex-col items-center">
      <AnimatePresence>
        {statuses.map(s => (
          <Toast key={s.id} status={s} onClear={onClear} />
        ))}
      </AnimatePresence>
    </div>
  );
};
