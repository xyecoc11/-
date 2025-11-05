'use client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useUIMode } from '@/hooks/useUIMode';
import EnhancedMetricCardV2 from './EnhancedMetricCardV2';
import { Ember } from '@/theme/palette';

interface ProductAdoptionProps {
  companyId?: string;
  ahaMomentRate?: number;
  timeToValue?: number; // minutes
  featureAdoption?: Array<{
    feature: string;
    adoptionRate: number;
    retentionUplift: number;
  }>;
}

export default function ProductAdoption({
  companyId,
  ahaMomentRate: propAhaMomentRate,
  timeToValue: propTimeToValue,
  featureAdoption: propFeatureAdoption,
}: ProductAdoptionProps) {
  const { mode } = useUIMode();
  const [adoption, setAdoption] = useState<Array<{ x: number; y: number }>>([]);
  const [ahaMomentRate, setAhaMomentRate] = useState(propAhaMomentRate || 0);
  const [timeToValue, setTimeToValue] = useState(propTimeToValue || 0);
  const [featureAdoption, setFeatureAdoption] = useState(propFeatureAdoption || []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/analytics/features?companyId=${encodeURIComponent(companyId)}`);
        if (!res.ok) throw new Error('Failed to fetch features data');
        const json = await res.json();
        
        // Convert curve data to chart format
        const points = (json.curve ?? []).map((row: any, idx: number) => ({
          x: idx + 1, // день 1..30 на оси X
          y: Number(row.adoption_pct), // % кумулятивной адопшена
        }));
        setAdoption(points);
        
        // Update other metrics from API
        if (json.ahaMomentRate !== undefined) setAhaMomentRate(json.ahaMomentRate);
        if (json.timeToValueMin !== undefined) setTimeToValue(json.timeToValueMin);
        if (Array.isArray(json.features)) setFeatureAdoption(json.features);
      } catch (error) {
        console.error('[ProductAdoption] Error loading data:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [companyId]);

  // Convert adoption array to chart format
  const adoptionCurve = adoption.length > 0 
    ? adoption.map(p => ({ day: p.x, users: p.y }))
    : [];

  const MotionWrapper = mode === 'performance' ? 'div' : motion.div;
  const motionProps = mode === 'performance' ? {} : {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 },
  };

  return (
    <MotionWrapper {...motionProps} className="space-y-6">
      <div className="ember-card p-6">
        <h3 className="text-lg font-semibold text-[var(--amber-400)] tracking-tight mb-4 flex items-center gap-2">
          <span className="w-1 h-5 bg-[var(--amber-400)] rounded-full" style={{ boxShadow: 'var(--glow-amber)' }} />
          Product Adoption
        </h3>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <EnhancedMetricCardV2
            label="Aha Moment Rate"
            value={ahaMomentRate}
            percent
            trendColor={ahaMomentRate >= 0.6 ? 'green' : 'amber'}
            tooltip="Percentage of users who reached the Aha moment"
          />
          <EnhancedMetricCardV2
            label="Time to Value"
            value={timeToValue}
            trendColor="amber"
            tooltip="Median time (minutes) for users to reach first key action"
          />
        </div>

        {/* Adoption Curve */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-[var(--text-1)] mb-3">Cumulative Adoption Curve</h4>
          {loading ? (
            <div className="text-center py-8 text-sm" style={{ color: 'var(--text-dim)' }}>
              Loading adoption curve...
            </div>
          ) : adoptionCurve.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={adoptionCurve}>
                <CartesianGrid strokeDasharray="3 3" stroke={Ember.grid} strokeOpacity={0.45} />
                <XAxis dataKey="day" stroke={Ember.grid} tick={{ fill: Ember.text.dim, fontSize: '12px' }} />
                <YAxis stroke={Ember.grid} tick={{ fill: Ember.text.dim, fontSize: '12px' }} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={{
                  background: 'rgba(26,20,15,.95)',
                  border: `1px solid ${Ember.border}`,
                  color: Ember.text.main,
                  borderRadius: '12px'
                }} />
                <Line type="monotone" dataKey="users" stroke={Ember.amber.bright} strokeWidth={2} isAnimationActive={mode === 'ai'} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-sm" style={{ color: 'var(--text-dim)' }}>
              No adoption data available
            </div>
          )}
        </div>

        {/* Feature Table */}
        <div>
          <h4 className="text-sm font-semibold text-[var(--text-1)] mb-3">Feature Adoption & Retention</h4>
          <div className="rounded-lg soft-border bg-[var(--bg-1)] overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-[var(--bg-2)]">
                <tr>
                  <th className="p-2 text-left text-[var(--text-2)]">Feature</th>
                  <th className="p-2 text-right text-[var(--text-2)]">Adoption %</th>
                  <th className="p-2 text-right text-[var(--text-2)]">Retention Uplift</th>
                </tr>
              </thead>
              <tbody>
                {featureAdoption.map((f, i) => (
                  <tr key={f.feature} className="border-t border-border hover:bg-[#221a14]">
                    <td className="p-2 text-[var(--text-0)]">{f.feature}</td>
                    <td className="p-2 text-right">
                      <span className="text-[var(--amber-400)]">{(f.adoptionRate * 100).toFixed(1)}%</span>
                    </td>
                    <td className="p-2 text-right">
                      <span className={f.retentionUplift >= 0 ? 'badge-success' : 'badge-danger'}>
                        {f.retentionUplift >= 0 ? '+' : ''}{(f.retentionUplift * 100).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MotionWrapper>
  );
}

