'use client';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

interface HealthMetric {
  label: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  icon?: string;
}

export default function SystemHealth() {
  const [metrics, setMetrics] = useState<HealthMetric[]>([
    { label: 'API Uptime', value: 99.9, unit: '%', status: 'healthy' },
    { label: 'Telegram Delivery', value: 98.5, unit: '%', status: 'healthy' },
    { label: 'Email Delivery', value: 97.2, unit: '%', status: 'healthy' },
    { label: 'Avg Latency', value: 145, unit: 'ms', status: 'healthy' },
    { label: 'Last Sync', value: 2, unit: 'min ago', status: 'healthy' },
  ]);

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      setMetrics(prev => prev.map(m => ({
        ...m,
        value: m.label === 'Last Sync' 
          ? Math.max(1, m.value - 0.5)
          : m.value + (Math.random() - 0.5) * 0.1,
      })));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    if (status === 'healthy') return 'border-emerald-500/30 bg-emerald-500/5';
    if (status === 'warning') return 'border-yellow-500/30 bg-yellow-500/5';
    return 'border-red-500/30 bg-red-500/5';
  };

  const getStatusGlow = (status: string) => {
    if (status === 'healthy') return 'shadow-emerald-500/20';
    if (status === 'warning') return 'shadow-yellow-500/20';
    return 'shadow-red-500/20';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl p-6 shadow-xl"
    >
      <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
        <span className="w-1 h-5 bg-gradient-to-b from-cyan-400 to-emerald-400 rounded-full" />
        System Health
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className={`
              rounded-xl border backdrop-blur-sm p-3
              ${getStatusColor(metric.status)}
              ${getStatusGlow(metric.status)}
              shadow-lg hover:scale-105 transition-transform
            `}
          >
            <div className="text-xs text-slate-400 mb-1">{metric.label}</div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-slate-100">
                {metric.label === 'Last Sync' 
                  ? metric.value.toFixed(1)
                  : metric.value.toFixed(metric.label === 'Avg Latency' ? 0 : 1)
                }
              </span>
              <span className="text-xs text-slate-500">{metric.unit}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

