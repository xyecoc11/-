'use client';
import { motion } from 'framer-motion';

type Range = '7d' | '30d' | '90d' | 'YTD';

interface DataRangeSelectorProps {
  value: Range;
  onChange: (range: Range) => void;
}

export default function DataRangeSelector({ value, onChange }: DataRangeSelectorProps) {
  const ranges: Range[] = ['7d', '30d', '90d', 'YTD'];

  return (
    <div className="flex items-center gap-2 p-1 rounded-lg backdrop-blur-sm" style={{ background: 'var(--lava-1)', border: '1px solid var(--border-soft)' }}>
      {ranges.map((range) => (
        <motion.button
          key={range}
          onClick={() => onChange(range)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            value === range
              ? 'ember-btn'
              : 'ember-btn-secondary'
          }`}
        >
          {range}
        </motion.button>
      ))}
    </div>
  );
}

