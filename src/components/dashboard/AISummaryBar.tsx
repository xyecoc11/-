'use client';
import { motion } from 'framer-motion';
import type { RevenueKPIs } from '@/lib/types';

interface AISummaryBarProps {
  kpis: RevenueKPIs & { mrrGrowth?: number; ltv?: number };
  topCustomersCount?: number;
}

export default function AISummaryBar({ kpis, topCustomersCount = 0 }: AISummaryBarProps) {
  // Generate AI summary based on real data
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

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 via-violet-500/10 to-cyan-500/10 backdrop-blur-xl p-4 shadow-xl overflow-hidden"
    >
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/20 to-violet-500/0 animate-pulse" />
      
      <div className="relative z-10 flex items-center gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-400 flex items-center justify-center">
          <span className="text-white font-bold text-sm">AI</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-200">
            {generateSummary()}
          </p>
        </div>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="flex-shrink-0 w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full"
        />
      </div>
    </motion.div>
  );
}

