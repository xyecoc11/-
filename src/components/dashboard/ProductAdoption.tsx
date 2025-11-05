'use client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';
import { useState, useMemo } from 'react';
import { useUIMode } from '@/hooks/useUIMode';
import EnhancedMetricCardV2 from './EnhancedMetricCardV2';
import { Ember } from '@/theme/palette';

interface ProductAdoptionProps {
  ahaMomentRate?: number;
  timeToValue?: number; // minutes
  featureAdoption?: Array<{
    feature: string;
    adoptionRate: number;
    retentionUplift: number;
  }>;
}

// Mock feature adoption curve data
const generateAdoptionCurve = (feature: string) => {
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  let cumulative = 0;
  return days.map(day => {
    cumulative += Math.random() * 5 + (30 - day) * 0.5;
    return { day, users: Math.min(cumulative, 100) };
  });
};

export default function ProductAdoption({
  ahaMomentRate = 0,
  timeToValue = 0,
  featureAdoption = [],
}: ProductAdoptionProps) {
  const { mode } = useUIMode();
  const [selectedFeature, setSelectedFeature] = useState(featureAdoption[0]?.feature || '');

  const adoptionCurve = useMemo(() => {
    return generateAdoptionCurve(selectedFeature);
  }, [selectedFeature]);

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
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-[var(--text-1)]">Cumulative Adoption Curve</h4>
            <select
              value={selectedFeature}
              onChange={(e) => setSelectedFeature(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg bg-[var(--bg-1)] soft-border text-[var(--text-0)] focus:ring-2 focus:ring-[var(--amber-500)]/50"
            >
              {featureAdoption.map(f => (
                <option key={f.feature} value={f.feature}>{f.feature}</option>
              ))}
            </select>
          </div>
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

