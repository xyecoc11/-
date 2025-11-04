'use client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts';
import { motion } from 'framer-motion';
import { useUIMode } from '@/hooks/useUIMode';
import type { DunningMetrics } from '@/lib/analytics';
import EnhancedMetricCardV2 from './EnhancedMetricCardV2';
import { Ember } from '@/theme/palette';

interface DunningRecoveryProps {
  metrics: DunningMetrics;
  dailyData: Array<{ date: string; failed: number; recovered: number }>;
  failureReasons: Array<{ reason: string; count: number; recoveryRate: number }>;
  recoveryCohort: Array<{ daysSince: number; recovered: number; total: number }>;
}

export default function DunningRecovery({
  metrics,
  dailyData,
  failureReasons,
  recoveryCohort,
}: DunningRecoveryProps) {
  const { mode } = useUIMode();
  const MotionWrapper = mode === 'performance' ? 'div' : motion.div;
  const motionProps = mode === 'performance' ? {} : {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 },
  };

  const chartData = dailyData.map(d => ({
    ...d,
    failed: d.failed / 100,
    recovered: d.recovered / 100,
  }));

  const cohortData = recoveryCohort.map(c => ({
    days: `D${c.daysSince}`,
    rate: c.total > 0 ? (c.recovered / c.total) * 100 : 0,
  }));

  return (
    <MotionWrapper {...motionProps} className="space-y-6">
      <div className="ember-card p-6">
        <h3 className="text-lg font-semibold tracking-tight mb-4 flex items-center gap-2" style={{ color: 'var(--amber-light)', textShadow: '0 0 10px rgba(255,150,0,.25)' }}>
          <span className="w-1 h-5 bg-[var(--amber-core)] rounded-full" style={{ boxShadow: 'var(--lava-glow)' }} />
          Dunning & Recovery
        </h3>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <EnhancedMetricCardV2
            label="Failed Payments"
            value={metrics.failedPaymentsRate}
            percent
            trendColor={metrics.failedPaymentsRateDelta >= 0 ? 'red' : 'green'}
            change={metrics.failedPaymentsRateDelta * 100}
            tooltip="Percentage of failed payments"
          />
          <EnhancedMetricCardV2
            label="$ at Risk"
            value={metrics.amountAtRisk}
            trendColor="red"
            tooltip="Total amount from failed payments in last 30 days"
          />
          <EnhancedMetricCardV2
            label="Recovery Rate"
            value={metrics.recoveryRate}
            percent
            trendColor={metrics.recoveryRate >= 0.5 ? 'green' : 'red'}
            tooltip="Percentage of failed payments recovered within 7 days"
          />
          <EnhancedMetricCardV2
            label="Avg Retries"
            value={metrics.avgRetries * 100}
            trendColor="amber"
            tooltip="Average number of retry attempts to recover payment"
          />
        </div>

        {/* Daily Failed vs Recovered */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-[var(--text-1)] mb-3">Daily Failed vs Recovered (30d)</h4>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={Ember.grid} strokeOpacity={0.45} />
              <XAxis dataKey="date" stroke={Ember.grid} tick={{ fill: Ember.text.dim, fontSize: '12px' }} />
              <YAxis stroke={Ember.grid} tick={{ fill: Ember.text.dim, fontSize: '12px' }} tickFormatter={(v) => `$${v}`} />
              <Tooltip contentStyle={{
                background: 'rgba(26,20,15,.95)',
                border: `1px solid ${Ember.border}`,
                color: Ember.text.main,
                borderRadius: '12px'
              }} />
              <Line type="monotone" dataKey="failed" stroke={Ember.danger} strokeWidth={2} name="Failed" isAnimationActive={mode === 'ai'} />
              <Line type="monotone" dataKey="recovered" stroke={Ember.success} strokeWidth={2} name="Recovered" isAnimationActive={mode === 'ai'} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Failure Reasons Table */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--text-1)] mb-3">Top Failure Reasons</h4>
            <div className="rounded-lg soft-border bg-[var(--bg-1)] overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-[var(--bg-2)]">
                  <tr>
                    <th className="p-2 text-left text-[var(--text-2)]">Reason</th>
                    <th className="p-2 text-right text-[var(--text-2)]">Count</th>
                    <th className="p-2 text-right text-[var(--text-2)]">Recovery %</th>
                  </tr>
                </thead>
                <tbody>
                  {failureReasons.map((r, i) => (
                    <tr key={r.reason} className="border-t border-border hover:bg-[#221a14]">
                      <td className="p-2 text-[var(--text-0)]">{r.reason}</td>
                      <td className="p-2 text-right text-[var(--text-2)]">{r.count}</td>
                      <td className="p-2 text-right">
                        <span className={r.recoveryRate >= 0.5 ? 'badge-success' : 'badge-danger'}>
                          {(r.recoveryRate * 100).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recovery Cohort */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--text-1)] mb-3">Recovery by Days Since Failure</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={cohortData}>
                <CartesianGrid strokeDasharray="3 3" stroke={Ember.grid} strokeOpacity={0.45} />
                <XAxis dataKey="days" stroke={Ember.grid} tick={{ fill: Ember.text.dim, fontSize: '12px' }} />
                <YAxis stroke={Ember.grid} tick={{ fill: Ember.text.dim, fontSize: '12px' }} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={{
                  background: 'rgba(26,20,15,.95)',
                  border: `1px solid ${Ember.border}`,
                  color: Ember.text.main,
                  borderRadius: '12px'
                }} />
                <Bar dataKey="rate" fill={Ember.success} radius={[4, 4, 0, 0]} isAnimationActive={mode === 'ai'} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </MotionWrapper>
  );
}

