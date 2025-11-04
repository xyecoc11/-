'use client';
import { motion } from 'framer-motion';
import { useState } from 'react';

interface SparklineData {
  value: number;
  label?: string;
}

interface EnhancedMetricCardProps {
  label: string;
  value: number;
  percent?: boolean;
  loading?: boolean;
  trendColor?: 'green' | 'red' | 'blue' | 'cyan';
  tooltip?: string;
  sparkline?: SparklineData[];
  change?: number; // percentage change
}

export default function EnhancedMetricCard({
  label,
  value,
  percent,
  loading,
  trendColor,
  tooltip,
  sparkline,
  change,
}: EnhancedMetricCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const display = percent 
    ? `${(value * 100).toFixed(1)}%` 
    : `$${(value / 100).toFixed(2)}`;
  
  const getColorClasses = () => {
    if (trendColor === 'green') return 'text-emerald-400 border-emerald-500/20';
    if (trendColor === 'red') return 'text-red-400 border-red-500/20';
    if (trendColor === 'cyan') return 'text-cyan-400 border-cyan-500/20';
    return 'text-blue-400 border-blue-500/20';
  };

  const maxSparkline = sparkline?.length ? Math.max(...sparkline.map(s => s.value)) : 1;
  const minSparkline = sparkline?.length ? Math.min(...sparkline.map(s => s.value)) : 0;
  const range = maxSparkline - minSparkline || 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative group"
    >
      <div
        className={`
          relative rounded-2xl border backdrop-blur-xl
          bg-gradient-to-br from-slate-900/90 to-slate-800/90
          ${getColorClasses()}
          p-5 transition-all duration-300
          ${isHovered ? 'shadow-2xl shadow-cyan-500/20 scale-[1.02]' : 'shadow-xl'}
          overflow-hidden
        `}
      >
        {/* Animated glow effect */}
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/50 to-cyan-500/0 blur-xl"
          />
        )}

        {/* Sparkline mini-chart */}
        {sparkline && sparkline.length > 0 && (
          <div className="absolute top-2 right-2 w-16 h-8 opacity-60">
            <svg viewBox="0 0 64 32" className="w-full h-full">
              <polyline
                points={sparkline.map((s, i) => 
                  `${i * (64 / (sparkline.length - 1))},${32 - ((s.value - minSparkline) / range) * 32}`
                ).join(' ')}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className={trendColor === 'green' ? 'text-emerald-400' : trendColor === 'red' ? 'text-red-400' : 'text-cyan-400'}
              />
            </svg>
          </div>
        )}

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {label}
            </span>
            {change !== undefined && (
              <span className={`text-xs font-semibold ${
                change >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
              </span>
            )}
          </div>

          <motion.div
            key={value}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className={`text-3xl font-bold ${getColorClasses().split(' ')[0]} mb-2`}
          >
            {loading ? (
              <span className="inline-block w-24 h-8 bg-slate-700/50 rounded animate-pulse" />
            ) : (
              display
            )}
          </motion.div>

          {/* Tooltip */}
          {tooltip && isHovered && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute left-0 top-full mt-2 z-50 w-48 p-2 rounded-lg bg-slate-900/95 border border-slate-700 text-xs text-slate-300 shadow-2xl"
            >
              {tooltip}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

