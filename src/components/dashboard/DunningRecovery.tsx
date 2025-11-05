'use client';
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts';
import { motion } from 'framer-motion';
import { useUIMode } from '@/hooks/useUIMode';
import EnhancedMetricCardV2 from './EnhancedMetricCardV2';
import { Ember } from '@/theme/palette';

interface DunningRecoveryProps {
  companyId?: string;
  // Legacy props for backward compatibility
  metrics?: any;
  dailyData?: Array<{ date: string; failed: number; recovered: number }>;
  failureReasons?: Array<{ reason: string; count: number; recoveryRate: number }>;
  recoveryCohort?: Array<{ daysSince: number; recovered: number; total: number }>;
}

interface FailuresData {
  failedPayments: number;
  atRisk: number;
  recoveredPayments: number;
  recoveryRate: number;
  avgRetries: number;
  reasons: Array<{ reason: string; count: number; recovery_rate: number }>;
  recoveryByDay: Array<{ day: number; recovery: number }>;
}

export default function DunningRecovery({
  companyId,
  metrics: legacyMetrics,
  dailyData: legacyDailyData,
  failureReasons: legacyFailureReasons,
  recoveryCohort: legacyRecoveryCohort,
}: DunningRecoveryProps) {
  const { mode } = useUIMode();
  const [failures, setFailures] = useState<FailuresData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const res = await fetch(`/api/analytics/failures?companyId=${encodeURIComponent(companyId)}`);
        if (!res.ok) throw new Error('Failed to fetch failures data');
        const data = await res.json();
        setFailures(data);
      } catch (error) {
        console.error('[DunningRecovery] Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [companyId]);

  // Use API data if available, otherwise fall back to legacy props
  const failureReasons = failures?.reasons || legacyFailureReasons || [];
  const recoveryByDay = failures?.recoveryByDay || legacyRecoveryCohort || [];

  const chartData = (failures?.recoveryByDay || legacyDailyData || []).map((d: any) => ({
    date: String(d.day || d.date || ''),
    failed: 0, // Failed payments by day not available in current API
    recovered: typeof d.recovery === 'number' ? d.recovery : (d.recovered || 0),
  }));

  const cohortData = recoveryByDay.map((c: any) => ({
    days: `D${c.daysSince || c.day || 0}`,
    rate: c.recovery !== undefined ? c.recovery : (c.total > 0 ? (c.recovered / c.total) * 100 : 0),
  }));

  const MotionWrapper = mode === 'performance' ? 'div' : motion.div;
  const motionProps = mode === 'performance' ? {} : {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 },
  };

  if (loading) {
    return (
      <div className="ember-card p-6">
        <div className="text-center py-8 text-sm" style={{ color: 'var(--text-dim)' }}>
          Loading Dunning & Recovery data...
        </div>
      </div>
    );
  }

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
            value={failures?.failedPayments || legacyMetrics?.failedPaymentsRate || 0}
            trendColor={failures?.recoveryRate && failures.recoveryRate > 0 ? 'green' : 'red'}
            change={failures?.recoveryRate ? failures.recoveryRate : 0}
            tooltip="Number of failed payments in last 30 days"
          />
          <EnhancedMetricCardV2
            label="$ at Risk"
            value={(failures?.atRisk || legacyMetrics?.amountAtRisk || 0) / 100}
            trendColor="red"
            tooltip="Total amount from failed payments in last 30 days"
          />
          <EnhancedMetricCardV2
            label="Recovery Rate"
            value={(failures?.recoveryRate || legacyMetrics?.recoveryRate || 0) / 100}
            percent
            trendColor={(failures?.recoveryRate || legacyMetrics?.recoveryRate || 0) >= 50 ? 'green' : 'red'}
            tooltip="Percentage of failed payments recovered within 7 days"
          />
          <EnhancedMetricCardV2
            label="Avg Retries"
            value={failures?.avgRetries || legacyMetrics?.avgRetries || 0}
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
                  {failureReasons.map((r, i) => {
                    // Handle both API format (recovery_rate as number) and legacy format (recoveryRate as decimal)
                    const recoveryRate = r.recovery_rate !== undefined ? r.recovery_rate : (r.recoveryRate || 0) * 100;
                    return (
                      <tr key={r.reason || `reason-${i}`} className="border-t border-border hover:bg-[#221a14]">
                        <td className="p-2 text-[var(--text-0)]">{r.reason || 'unknown'}</td>
                        <td className="p-2 text-right text-[var(--text-2)]">{r.count || 0}</td>
                        <td className="p-2 text-right">
                          <span className={recoveryRate >= 50 ? 'badge-success' : 'badge-danger'}>
                            {recoveryRate.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
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

