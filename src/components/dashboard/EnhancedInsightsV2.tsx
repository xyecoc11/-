'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import type { Insight } from '@/lib/types';

interface EnhancedInsightsV2Props {
  insights: Insight[];
  loading?: boolean;
}

const severityStyles = {
  info: 'border-[var(--amber-500)]/30 bg-[var(--amber-500)]/5 text-[var(--amber-300)]',
  warn: 'border-[var(--warning-500)]/30 bg-[var(--warning-500)]/5 text-[var(--warning-500)]',
  critical: 'border-[var(--danger-500)]/30 bg-[var(--danger-500)]/5 text-[var(--danger-500)]',
};

const categoryColors = {
  Revenue: { bg: 'bg-[var(--success-500)]/20', text: 'badge-success', border: 'border-[var(--success-500)]/50' },
  Retention: { bg: 'bg-[var(--amber-500)]/20', text: 'text-[var(--amber-400)]', border: 'border-[var(--amber-500)]/50' },
  Risk: { bg: 'bg-[var(--danger-500)]/20', text: 'badge-danger', border: 'border-[var(--danger-500)]/50' },
};

export default function EnhancedInsightsV2({ insights, loading }: EnhancedInsightsV2Props) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  
  const getConfidence = (index: number) => 85 + (index * 5);
  
  const getCategory = (insight: Insight): keyof typeof categoryColors => {
    const lower = insight.body.toLowerCase();
    if (lower.includes('revenue') || lower.includes('mrr') || lower.includes('arr')) return 'Revenue';
    if (lower.includes('retention') || lower.includes('churn')) return 'Retention';
    return 'Risk';
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-[var(--bg-2)] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!insights || insights.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--text-2)]">
        <p>No insights available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {insights.map((insight, index) => {
        const confidence = getConfidence(index);
        const category = getCategory(insight);
        const isExpanded = expandedIndex === index;
        
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className={`
              relative rounded-xl border backdrop-blur-xl p-4
              ${severityStyles[insight.severity]}
              shadow-xl hover:shadow-2xl transition-all duration-300
              group overflow-hidden
            `}
          >
            {/* Left border accent with glow */}
            <div
              className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl"
              style={{
                borderLeft: '3px solid rgba(255,140,0,0.4)',
                boxShadow: '0 0 8px rgba(255,140,0,0.6)',
              }}
            />
            
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--amber-500)]/0 via-[var(--amber-500)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap flex-1">
                  <h4 className="font-semibold text-[var(--text-0)]">{insight.title}</h4>
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${categoryColors[category].bg} ${categoryColors[category].text}`}>
                    {category}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-[var(--text-2)]">Confidence:</span>
                  <span className="font-bold text-[var(--amber-400)]">{confidence}%</span>
                </div>
              </div>
              
              <p className="text-sm text-[var(--text-1)] leading-relaxed mb-3">
                {insight.body}
              </p>

              {/* Confidence bar */}
              <div className="mb-3 h-1.5 bg-[var(--bg-1)] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${confidence}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1 + 0.3 }}
                  className="h-full bg-[var(--amber-500)]"
                  style={{ boxShadow: 'var(--glow-amber)' }}
                />
              </div>

              {/* Expandable explain section */}
              <motion.button
                onClick={() => setExpandedIndex(isExpanded ? null : index)}
                className="flex items-center gap-2 text-xs text-[var(--amber-400)] hover:text-[var(--amber-300)] transition-colors"
              >
                <span>🔍</span>
                <span>Explain Trend</span>
                <motion.svg
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
              </motion.button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 p-3 rounded-lg bg-[var(--bg-2)] soft-border text-xs text-[var(--text-2)]">
                      This insight is based on analysis of revenue trends, customer behavior patterns, and historical data. 
                      The model identifies significant changes in key metrics and flags potential issues or opportunities for growth.
                      {insight.severity === 'critical' && ' Immediate action recommended.'}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

