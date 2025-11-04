'use client';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, isVisible, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed top-4 right-4 z-50 rounded-lg px-4 py-3 shadow-lg"
          style={{
            background: 'linear-gradient(135deg, rgba(255,150,0,0.15) 0%, rgba(255,150,0,0.25) 100%)',
            border: '1px solid rgba(255,150,0,0.3)',
            color: 'var(--amber-light)',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 16px rgba(255,150,0,0.2), 0 0 20px rgba(255,150,0,0.1)',
            maxWidth: '320px',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <span className="text-sm font-medium">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

