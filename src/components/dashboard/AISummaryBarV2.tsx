'use client';
import { motion } from 'framer-motion';
import { useState } from 'react';
import type { RevenueKPIs } from '@/lib/types';
import TypewriterText from './TypewriterText';
import { useUIMode } from '@/hooks/useUIMode';

interface AISummaryBarV2Props {
  kpis: RevenueKPIs & { mrrGrowth?: number; ltv?: number };
  topCustomersCount?: number;
  onRefresh?: () => void;
  lastRefreshed?: Date;
}

export default function AISummaryBarV2({ kpis, topCustomersCount = 0, onRefresh, lastRefreshed }: AISummaryBarV2Props) {
  const { mode } = useUIMode();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const generateSummary = () => {
    const parts: string[] = [];
    
    if (kpis.mrrGrowth !== undefined && kpis.mrrGrowth > 0) {
      parts.push(`↑${(kpis.mrrGrowth * 100).toFixed(0)}% MRR`);
    } else if (kpis.mrrGrowth !== undefined && kpis.mrrGrowth < 0) {
      parts.push(`↓${Math.abs(kpis.mrrGrowth * 100).toFixed(0)}% MRR`);
    }
    
    if (kpis.churnRate !== undefined && kpis.churnRate < 0.05) {
      parts.push(`↓${(kpis.churnRate * 100).toFixed(1)}% churn`);
    } else if (kpis.churnRate !== undefined && kpis.churnRate >= 0.05) {
      parts.push(`↑${(kpis.churnRate * 100).toFixed(1)}% churn`);
    }
    
    if (topCustomersCount > 0) {
      parts.push(`+${topCustomersCount} high-LTV users`);
    }
    
    if (kpis.failedPaymentsRate !== undefined && kpis.failedPaymentsRate > 0.1) {
      parts.push(`⚠️ ${(kpis.failedPaymentsRate * 100).toFixed(0)}% failed payments`);
    }

    return parts.length > 0 
      ? `This month: ${parts.join(', ')}.`
      : 'No significant changes detected this month.';
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    }
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getMinutesAgo = () => {
    if (!lastRefreshed) return 'just now';
    const diff = Math.floor((Date.now() - lastRefreshed.getTime()) / 60000);
    if (diff < 1) return 'just now';
    if (diff === 1) return '1 min ago';
    return `${diff} mins ago`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`ember-card p-4 overflow-hidden ember-glow-bg ${mode === 'ai' ? 'shimmer-bg' : ''}`}
    >
      {/* Shimmer animation */}
      <motion.div
        animate={{
          backgroundPosition: ['0% 0%', '100% 0%'],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          repeatType: 'reverse',
        }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--amber-core)]/5 to-transparent bg-[length:200%_100%] rounded-xl"
      />

      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          {/* Glowing AI icon */}
          <motion.div
            animate={{
              boxShadow: [
                'var(--lava-glow)',
                '0 0 30px rgba(255, 110, 0, 0.6)',
                'var(--lava-glow)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--amber-core)' }}
          >
            <span className="text-white font-bold text-sm">AI</span>
          </motion.div>

          {/* Typing animation text */}
          <div className="flex-1 min-w-0">
            <TypewriterText text={generateSummary()} />
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Last refreshed time */}
          {lastRefreshed && (
            <span className="text-xs hidden sm:inline" style={{ color: 'var(--text-dim)' }}>
              Updated {getMinutesAgo()}
            </span>
          )}

          {/* Refresh button */}
          <motion.button
            whileHover={{ scale: 1.1, rotate: 180 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg transition-colors disabled:opacity-50 ember-btn-secondary"
          >
            <motion.svg
              animate={{ rotate: isRefreshing ? 360 : 0 }}
              transition={{ duration: 1, repeat: isRefreshing ? Infinity : 0, ease: 'linear' }}
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </motion.svg>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

