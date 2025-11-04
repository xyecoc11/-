'use client';
import { motion } from 'framer-motion';
import type { CohortRow } from '@/lib/types';

interface EnhancedRetentionHeatmapProps {
  cohorts: CohortRow[];
}

export default function EnhancedRetentionHeatmap({ cohorts }: EnhancedRetentionHeatmapProps) {
  const getColorIntensity = (retention: number) => {
    if (retention >= 0.8) return 'bg-emerald-500';
    if (retention >= 0.5) return 'bg-cyan-500';
    if (retention >= 0.3) return 'bg-blue-500';
    if (retention > 0) return 'bg-yellow-500';
    return 'bg-slate-700';
  };

  const getTextColor = (retention: number) => {
    return retention > 0.5 ? 'text-white' : 'text-slate-300';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl p-6 shadow-2xl overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-violet-500/5 rounded-2xl" />
      <div className="relative z-10">
        <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <span className="w-1 h-5 bg-gradient-to-b from-cyan-400 to-violet-400 rounded-full" />
          Retention Cohorts
        </h3>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <table className="w-full text-center text-xs">
              <thead>
                <tr>
                  <th className="p-3 text-slate-400 bg-slate-900/50 sticky left-0 z-10 backdrop-blur-sm">
                    Cohort
                  </th>
                  {[...Array(6)].map((_, i) => (
                    <th key={i} className="p-3 text-slate-400 font-medium">
                      m{i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohorts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-slate-500 text-center">
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
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="font-mono bg-slate-950/80 sticky left-0 z-10 p-3 text-slate-300 backdrop-blur-sm border-r border-slate-700">
                        {row.cohortMonth}
                      </td>
                      {row.cells.map((cell, cellIndex) => (
                        <motion.td
                          key={cell.monthIndex}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.2, delay: rowIndex * 0.05 + cellIndex * 0.02 }}
                          className={`
                            p-4 rounded-lg border border-slate-700/50
                            ${getColorIntensity(cell.retention)}/20
                            backdrop-blur-sm
                            hover:scale-105 transition-transform
                            ${getTextColor(cell.retention)}
                          `}
                          style={{
                            background: `linear-gradient(135deg, ${
                              getColorIntensity(cell.retention)
                            }${Math.round(cell.retention * 40)}, transparent)`,
                          }}
                        >
                          <div className="font-bold text-sm">
                            {(cell.retention * 100).toFixed(0)}%
                          </div>
                        </motion.td>
                      ))}
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

