'use client';
import { useUIMode } from '@/hooks/useUIMode';
import { motion } from 'framer-motion';

export default function UIModeToggle() {
  const { mode, setMode } = useUIMode();

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg backdrop-blur-sm" style={{ background: 'var(--lava-1)', border: '1px solid var(--border-soft)' }}>
      <button
        onClick={() => setMode('ai')}
        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
          mode === 'ai'
            ? 'ember-btn'
            : 'ember-btn-secondary'
        }`}
      >
        AI Effects
      </button>
      <button
        onClick={() => setMode('performance')}
        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
          mode === 'performance'
            ? 'ember-btn'
            : 'ember-btn-secondary'
        }`}
      >
        Performance
      </button>
    </div>
  );
}

