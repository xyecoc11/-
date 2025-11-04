'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ComposedChart } from 'recharts';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useUIMode } from '@/hooks/useUIMode';
import type { NetNewMRRBreakdown } from '@/lib/analytics';
import { Ember } from '@/theme/palette';

interface NetNewMRRBreakdownProps {
  breakdown: NetNewMRRBreakdown;
  monthlyData: Array<{
    month: string;
    new: number;
    expansion: number;
    contraction: number;
    churn: number;
  }>;
  previousPeriod?: NetNewMRRBreakdown;
}

export default function NetNewMRRBreakdownComponent({
  breakdown,
  monthlyData,
  previousPeriod,
}: NetNewMRRBreakdownProps) {
  const { mode } = useUIMode();
  const [showPrevious, setShowPrevious] = useState(false);

  const delta = previousPeriod
    ? breakdown.netNew - previousPeriod.netNew
    : 0;
  const deltaPercent = previousPeriod && previousPeriod.netNew !== 0
    ? (delta / previousPeriod.netNew) * 100
    : 0;

  const chartData = monthlyData.map(d => ({
    ...d,
    new: d.new / 100,
    expansion: d.expansion / 100,
    contraction: -d.contraction / 100,
    churn: -d.churn / 100,
  }));

  const MotionWrapper = mode === 'performance' ? 'div' : motion.div;

  return (
    <MotionWrapper
      initial={mode === 'performance' ? {} : { opacity: 0, y: 20 }}
      animate={mode === 'performance' ? {} : { opacity: 1, y: 0 }}
      transition={mode === 'performance' ? {} : { duration: 0.5 }}
      className="ember-card p-6 overflow-hidden ember-glow-bg"
    >
      {/* Subtle radial gradient background */}
      <div className="absolute inset-0 rounded-2xl" style={{
        background: 'radial-gradient(circle at 50% 50%, rgba(255,150,0,0.05), transparent 70%)',
      }} />
      
      {/* Glass effect chart area */}
      <div className="relative z-10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2" style={{ color: 'var(--amber-light)', textShadow: '0 0 10px rgba(255,150,0,.25)' }}>
          <span className="w-1 h-5 bg-[var(--amber-core)] rounded-full" style={{ boxShadow: 'var(--lava-glow)' }} />
          Net New MRR
        </h3>
        <button
          onClick={() => setShowPrevious(!showPrevious)}
          className="text-xs px-3 py-1.5 rounded-full transition-colors ember-btn-secondary"
        >
          {showPrevious ? 'Hide' : 'Compare'} Previous
        </button>
      </div>

      {/* KPI Card */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <div className="rounded-lg p-3" style={{ border: '1px solid var(--border-soft)', background: 'var(--lava-2)' }}>
          <div className="text-xs mb-1" style={{ color: 'var(--text-dim)' }}>Net New MRR</div>
          <div className={`text-xl font-bold ${breakdown.netNew >= 0 ? 'badge-success' : 'badge-danger'}`}>
            ${(breakdown.netNew / 100).toFixed(2)}
          </div>
          {previousPeriod && (
            <div className={`text-xs mt-1 ${delta >= 0 ? 'badge-success' : 'badge-danger'}`}>
              {delta >= 0 ? '↑' : '↓'} {Math.abs(deltaPercent).toFixed(1)}%
            </div>
          )}
        </div>
        <div className="rounded-lg p-3" style={{ border: '1px solid var(--border-soft)', background: 'var(--lava-2)' }}>
          <div className="text-xs mb-1" style={{ color: 'var(--text-dim)' }}>New</div>
          <div className="text-lg font-bold kpi-number">${(breakdown.new / 100).toFixed(2)}</div>
        </div>
        <div className="rounded-lg p-3" style={{ border: '1px solid var(--border-soft)', background: 'var(--lava-2)' }}>
          <div className="text-xs mb-1" style={{ color: 'var(--text-dim)' }}>Expansion</div>
          <div className="text-lg font-bold badge-success">${(breakdown.expansion / 100).toFixed(2)}</div>
        </div>
        <div className="rounded-lg p-3" style={{ border: '1px solid var(--border-soft)', background: 'var(--lava-2)' }}>
          <div className="text-xs mb-1" style={{ color: 'var(--text-dim)' }}>Contraction</div>
          <div className="text-lg font-bold badge-warning">${(breakdown.contraction / 100).toFixed(2)}</div>
        </div>
        <div className="rounded-lg p-3" style={{ border: '1px solid var(--border-soft)', background: 'var(--lava-2)' }}>
          <div className="text-xs mb-1" style={{ color: 'var(--text-dim)' }}>Churn</div>
          <div className="text-lg font-bold badge-danger">${(breakdown.churn / 100).toFixed(2)}</div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-xs" style={{ color: 'var(--text-dim)' }}>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ background: '#ff7a00' }} />
          <span>New</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ background: '#40ff9f' }} />
          <span>Expansion</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ background: '#ffb347' }} />
          <span>Contraction</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ background: '#ff3b1f' }} />
          <span>Churn</span>
        </div>
      </div>

      {/* Stacked Bar Chart */}
      {chartData && chartData.length > 0 ? (
        <div className="rounded-xl backdrop-blur-md mb-4" style={{
          background: 'rgba(20,10,5,0.3)',
          border: '1px solid rgba(255,140,0,0.15)',
          padding: '16px',
        }}>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <defs>
              <filter id="glow-new-nn">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <filter id="glow-expansion-nn">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#3a2212" strokeOpacity={0.45} />
          <XAxis dataKey="month" stroke="#3a2212" tick={{ fill: 'var(--text-dim)', fontSize: '12px' }} />
          <YAxis stroke="#3a2212" tick={{ fill: 'var(--text-dim)', fontSize: '12px' }} tickFormatter={(v) => `$${v}`} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const data = payload[0].payload;
              const newVal = data.new || 0;
              const expansionVal = data.expansion || 0;
              const contractionVal = Math.abs(data.contraction || 0);
              const churnVal = Math.abs(data.churn || 0);
              const total = newVal + expansionVal - contractionVal - churnVal;
              return (
                <div style={{
                  background: 'rgba(20,10,5,0.98)',
                  border: '1px solid rgba(255,140,0,0.5)',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 8px 30px rgba(0,0,0,.5), 0 0 20px rgba(255,140,0,0.2)',
                  color: 'var(--text-main)'
                }}>
                  <p className="text-base font-semibold mb-3" style={{ color: 'var(--text-main)', textShadow: '0 0 4px rgba(255,150,0,0.3)' }}>{data.month}</p>
                  <div className="space-y-2">
                    <p className="text-sm" style={{ color: '#40ff9f' }}>
                      <span className="font-bold">New:</span> <span className="font-semibold">${newVal.toFixed(2)}</span>
                    </p>
                    <p className="text-sm" style={{ color: '#40ff9f' }}>
                      <span className="font-bold">Expansion:</span> <span className="font-semibold">${expansionVal.toFixed(2)}</span>
                    </p>
                    <p className="text-sm" style={{ color: '#ffb347' }}>
                      <span className="font-bold">Contraction:</span> <span className="font-semibold">-${contractionVal.toFixed(2)}</span>
                    </p>
                    <p className="text-sm" style={{ color: '#ff3b1f' }}>
                      <span className="font-bold">Churn:</span> <span className="font-semibold">-${churnVal.toFixed(2)}</span>
                    </p>
                  </div>
                  <p className="font-bold mt-3 pt-3 border-t text-base" style={{ borderColor: 'rgba(255,140,0,0.2)', color: 'var(--amber-bright)', textShadow: '0 0 8px rgba(255,120,0,0.4)' }}>
                    Net New: ${total.toFixed(2)}
                  </p>
                </div>
              );
            }}
          />
          <Bar 
            dataKey="new" 
            stackId="a" 
            fill="#40ff9f" 
            name="New"
            filter="url(#glow-new-nn)"
            isAnimationActive={mode === 'ai'}
            style={{ filter: 'drop-shadow(0 0 6px rgba(64,255,159,0.6))' }}
          />
          <Bar 
            dataKey="expansion" 
            stackId="a" 
            fill="#40ff9f" 
            name="Expansion"
            filter="url(#glow-expansion-nn)"
            isAnimationActive={mode === 'ai'}
            style={{ filter: 'drop-shadow(0 0 6px rgba(64,255,159,0.6))' }}
          />
          <Bar 
            dataKey="contraction" 
            stackId="b" 
            fill="#ffb347" 
            name="Contraction"
            isAnimationActive={mode === 'ai'}
            style={{ filter: 'drop-shadow(0 0 6px rgba(255,179,71,0.6))' }}
          />
          <Bar 
            dataKey="churn" 
            stackId="b" 
            fill="#ff3b1f" 
            name="Churn"
            isAnimationActive={mode === 'ai'}
            style={{ filter: 'drop-shadow(0 0 6px rgba(255,59,31,0.6))' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      </div>
      ) : (
        <div className="text-center py-12 text-sm" style={{ color: 'var(--text-dim)' }}>
          No data available for Net New MRR breakdown
        </div>
      )}

      {/* Note */}
      <p className="text-xs mt-4 text-center" style={{ color: 'var(--text-dim)' }}>
        Net New MRR combines new, expansion, contraction, and churn.
      </p>
      </div>
    </MotionWrapper>
  );
}

