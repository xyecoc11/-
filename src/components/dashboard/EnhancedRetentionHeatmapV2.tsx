'use client';
import { motion } from 'framer-motion';
import { useState } from 'react';
import type { CohortRow } from '@/lib/types';

interface EnhancedRetentionHeatmapV2Props {
  cohorts: CohortRow[];
}

export default function EnhancedRetentionHeatmapV2({ cohorts }: EnhancedRetentionHeatmapV2Props) {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);

  const getColorIntensity = (retention: number) => {
    if (retention >= 0.8) return { bg: 'bg-emerald-500', border: 'border-emerald-400/50', glow: 'shadow-emerald-500/30' };
    if (retention >= 0.5) return { bg: 'bg-yellow-500', border: 'border-yellow-400/50', glow: 'shadow-yellow-500/30' };
    if (retention >= 0.3) return { bg: 'bg-orange-500', border: 'border-orange-400/50', glow: 'shadow-orange-500/30' };
    if (retention > 0) return { bg: 'bg-red-500', border: 'border-red-400/50', glow: 'shadow-red-500/30' };
    return { bg: 'bg-slate-700', border: 'border-slate-600/30', glow: '' };
  };

  const getTextColor = (retention: number) => {
    return retention > 0.5 ? 'text-white' : 'text-slate-300';
  };

  const getGradientStop = (retention: number) => {
    if (retention >= 0.8) return 'from-emerald-400 to-emerald-600';
    if (retention >= 0.5) return 'from-yellow-400 to-yellow-600';
    if (retention >= 0.3) return 'from-orange-400 to-orange-600';
    if (retention > 0) return 'from-red-400 to-red-600';
    return 'from-slate-600 to-slate-800';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="ember-card p-6 overflow-hidden"
    >
      <div className="relative z-10">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-semibold tracking-tight text-[var(--amber-400)] flex items-center gap-3">
            <span className="w-1.5 h-6 bg-[var(--amber-500)] rounded-full" style={{ boxShadow: 'var(--glow-amber)' }} />
            Retention Cohorts
          </h3>
        </div>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <table className="w-full text-center text-xs">
              <thead>
                <tr>
                  <th className="p-3 text-[var(--text-2)] bg-[var(--bg-2)] sticky left-0 z-10 backdrop-blur-sm border-r border-border">
                    Cohort
                  </th>
                  {[...Array(6)].map((_, i) => (
                    <th key={i} className="p-3 text-[var(--text-2)] font-medium">
                      m{i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohorts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-[var(--text-2)] text-center">
                      No cohort data available
                    </td>
                  </tr>
                ) : (
                  cohorts.map((row, rowIndex) => (
                    <motion.tr
                      key={row.cohortMonth}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: rowIndex * 0.05 }}
                      className="hover:bg-[#221a14] transition-colors"
                    >
                      <td className="font-mono bg-[var(--bg-2)] sticky left-0 z-10 p-3 text-[var(--text-0)] backdrop-blur-sm border-r border-border">
                        {row.cohortMonth}
                      </td>
                      {row.cells.map((cell, cellIndex) => {
                        const colors = getColorIntensity(cell.retention);
                        const isHovered = hoveredCell?.row === rowIndex && hoveredCell?.col === cellIndex;
                        
                        return (
                          <motion.td
                            key={cell.monthIndex}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.2, delay: rowIndex * 0.05 + cellIndex * 0.02 }}
                            onMouseEnter={() => setHoveredCell({ row: rowIndex, col: cellIndex })}
                            onMouseLeave={() => setHoveredCell(null)}
                            className={`
                              p-4 rounded-xl border backdrop-blur-sm
                              ${colors.bg}/20 ${colors.border}
                              ${isHovered ? colors.glow + ' scale-105 bg-zinc-800/50' : 'hover:bg-zinc-800/50'}
                              transition-all duration-200 cursor-pointer
                              ${getTextColor(cell.retention)}
                              shadow-inner
                            `}
                            style={{
                              background: `linear-gradient(135deg, ${
                                colors.bg.replace('/20', '').replace('bg-', '').replace('-500', '-400')
                              }${Math.round(cell.retention * 60)}, transparent)`,
                            }}
                          >
                            <div className="font-bold text-sm">
                              {(cell.retention * 100).toFixed(0)}%
                            </div>
                            {isHovered && (
                              <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                  background: 'rgba(26,20,15,.95)',
                                  border: '1px solid var(--border)',
                                  borderRadius: '8px',
                                  padding: '8px',
                                  boxShadow: '0 8px 30px rgba(0,0,0,.35)',
                                  color: 'var(--text-0)'
                                }}
                                className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50 px-2 py-1 text-xs whitespace-nowrap"
                              >
                                Retention: {(cell.retention * 100).toFixed(1)}%
                              </motion.div>
                            )}
                          </motion.td>
                        );
                      })}
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

