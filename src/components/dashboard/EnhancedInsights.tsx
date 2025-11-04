'use client';
import { motion } from 'framer-motion';
import type { Insight } from '@/lib/types';

interface EnhancedInsightsProps {
  insights: Insight[];
  loading?: boolean;
}

const severityStyles = {
  info: 'border-cyan-500/30 bg-cyan-500/5 text-cyan-300',
  warn: 'border-yellow-500/30 bg-yellow-500/5 text-yellow-300',
  critical: 'border-red-500/30 bg-red-500/5 text-red-300',
};

const categoryColors = {
  Revenue: 'bg-emerald-500/20 text-emerald-400',
  Retention: 'bg-blue-500/20 text-blue-400',
  Risk: 'bg-red-500/20 text-red-400',
};

export default function EnhancedInsights({ insights, loading }: EnhancedInsightsProps) {
  // Mock confidence for demo (in real app, could come from AI response)
  const getConfidence = (index: number) => 85 + (index * 5);
  
  // Mock category (in real app, could be extracted from insight content)
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
          <div key={i} className="h-24 bg-slate-800/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!insights || insights.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <p>No insights available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {insights.map((insight, index) => {
        const confidence = getConfidence(index);
        const category = getCategory(insight);
        
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
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-slate-100">{insight.title}</h4>
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${categoryColors[category]}`}>
                    {category}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-slate-400">Confidence:</span>
                  <span className="font-bold text-cyan-400">{confidence}%</span>
                </div>
              </div>
              
              <p className="text-sm text-slate-300 leading-relaxed">
                {insight.body}
              </p>

              {/* Confidence bar */}
              <div className="mt-3 h-1 bg-slate-800/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${confidence}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1 + 0.3 }}
                  className="h-full bg-gradient-to-r from-cyan-400 to-violet-400"
                />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

