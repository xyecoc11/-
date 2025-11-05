'use client';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

interface HealthMetric {
  label: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  trend?: 'up' | 'down' | 'stable';
}

export default function SystemHealthV2({ companyId }: { companyId?: string }) {
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // dynamic value: computed from Supabase
        const res = await fetch(`/api/analytics/system-health?companyId=${encodeURIComponent(companyId || '')}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (active) setMetrics(data.metrics || []);
      } catch {}
    })();
    return () => { active = false; };
  }, [companyId]);

  const getStatusIcon = (status: string) => {
    if (status === 'healthy') return <span className="w-2 h-2 rounded-full bg-[var(--success-500)]" style={{ boxShadow: 'var(--glow-green)' }} />;
    if (status === 'warning') return <span className="w-2 h-2 rounded-full bg-[var(--warning-500)]" style={{ boxShadow: '0 0 8px rgba(255,193,7,0.5)' }} />;
    return <span className="w-2 h-2 rounded-full bg-[var(--danger-500)]" style={{ boxShadow: 'var(--glow-red)' }} />;
  };

  const getStatusColor = (status: string) => {
    if (status === 'healthy') return 'border-[var(--success-500)]/30 bg-[var(--success-500)]/5';
    if (status === 'warning') return 'border-[var(--warning-500)]/30 bg-[var(--warning-500)]/5';
    return 'border-[var(--danger-500)]/30 bg-[var(--danger-500)]/5';
  };

  const getStatusGlow = (status: string) => {
    if (status === 'healthy') return 'shadow-[var(--success-500)]/20';
    if (status === 'warning') return 'shadow-[var(--warning-500)]/20';
    return 'shadow-[var(--danger-500)]/20';
  };

  const getTrendIcon = (trend?: string) => {
    if (trend === 'up') return '↗';
    if (trend === 'down') return '↘';
    return '→';
  };

  const getTrendColor = (trend?: string) => {
    if (trend === 'up') return 'badge-success';
    if (trend === 'down') return 'badge-danger';
    return 'text-[var(--text-2)]';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="ember-card p-6 overflow-hidden"
    >
      <div className="relative z-10">
        <h3 className="text-xl font-semibold tracking-tight text-[var(--amber-400)] mb-6 flex items-center gap-3">
          <span className="w-1.5 h-6 bg-[var(--amber-500)] rounded-full" style={{ boxShadow: 'var(--glow-amber)' }} />
          System Health
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileHover={{ y: -2, scale: 1.01 }}
              className={`
                rounded-xl border backdrop-blur-sm p-3
                ${getStatusColor(metric.status)}
                ${getStatusGlow(metric.status)}
                shadow-lg hover:shadow-xl transition-all relative
              `}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs text-[var(--text-2)] ${metric.status === 'healthy' ? 'pulse-dot' : ''}`}>
                  {metric.label}
                </span>
                <div className="flex items-center gap-1">
                  <span>{getStatusIcon(metric.status)}</span>
                  {metric.trend && (
                    <span className={`text-xs ${getTrendColor(metric.trend)}`}>
                      {getTrendIcon(metric.trend)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg text-[var(--text-0)] font-semibold">
                  {metric.label === 'Last Sync' 
                    ? metric.value.toFixed(1)
                    : metric.value.toFixed(metric.label === 'Avg Latency' ? 0 : 1)
                  }
                </span>
                <span className="text-xs text-[var(--text-2)]">{metric.unit}</span>
              </div>
            </motion.div>
          ))}
        </div>
        {metrics.length === 0 && (
          <p className="text-xs mt-2" style={{ color: 'var(--text-dim)' }}>No data yet</p>
        )}
      </div>
    </motion.div>
  );
}

