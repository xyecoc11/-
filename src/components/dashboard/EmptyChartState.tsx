'use client';
import { motion } from 'framer-motion';

interface EmptyChartStateProps {
  title: string;
  icon?: string;
  message?: string;
}

export default function EmptyChartState({ title, icon = '⏳', message }: EmptyChartStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="ember-card p-12 overflow-hidden"
    >
      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        <div className="text-5xl mb-4 opacity-60" style={{ filter: 'drop-shadow(0 0 10px rgba(255,122,0,0.3))' }}>{icon}</div>
        <h3 className="text-lg font-semibold text-[var(--text-0)] mb-2">{title}</h3>
        <p className="text-sm text-[var(--text-2)]">{message || 'Not enough data yet'}</p>
      </div>
    </motion.div>
  );
}

