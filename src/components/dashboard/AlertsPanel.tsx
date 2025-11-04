'use client';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useUIMode } from '@/hooks/useUIMode';
import { evaluateAlerts, type AlertRule } from '@/config/alerts';

interface Alert {
  rule: AlertRule;
  timestamp: Date;
  dismissed?: boolean;
}

interface AlertsPanelProps {
  metrics: any;
  anomalyIndices?: number[];
  onScrollToSection?: (section: string) => void;
}

export default function AlertsPanel({ metrics, anomalyIndices = [], onScrollToSection }: AlertsPanelProps) {
  const { mode } = useUIMode();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const alerts: Alert[] = evaluateAlerts(metrics).filter(
    a => !dismissed.has(a.rule.id)
  );

  const handleDismiss = (id: string) => {
    setDismissed(prev => new Set([...prev, id]));
  };

  const getSeverityColor = (severity: string) => {
    if (severity === 'high') return 'border-[var(--danger-500)]/40 bg-[var(--danger-500)]/10 badge-danger';
    if (severity === 'medium') return 'border-[var(--warning-500)]/40 bg-[var(--warning-500)]/10 badge-warning';
    return 'border-[var(--amber-500)]/40 bg-[var(--amber-500)]/10 text-[var(--amber-400)]';
  };

  const MotionWrapper = mode === 'performance' ? 'div' : motion.div;
  const motionProps = mode === 'performance' ? {} : {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.5 },
  };

  return (
    <div className="space-y-4">
      {/* Content only, no header since it's in tabs */}

      <div className="space-y-3">
        {alerts.length === 0 && anomalyIndices.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-2)] text-sm">
            No active alerts
          </div>
        ) : (
          <>
            {alerts.map((alert, index) => (
              <motion.div
                key={alert.rule.id}
                initial={mode === 'performance' ? {} : { opacity: 0, y: 5 }}
                animate={mode === 'performance' ? {} : { opacity: 1, y: 0 }}
                transition={mode === 'performance' ? {} : { delay: index * 0.1 }}
                className={`rounded-lg border p-3 ${getSeverityColor(alert.rule.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{alert.rule.name}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${getSeverityColor(alert.rule.severity)}`}>
                        {alert.rule.severity}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-1)] mb-2">{alert.rule.description}</p>
                    <p className="text-xs text-[var(--text-2)]">
                      {alert.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {onScrollToSection && (
                      <button
                        onClick={() => onScrollToSection('relevant')}
                        className="text-xs px-2 py-1 rounded bg-[var(--bg-1)] hover:bg-[var(--bg-2)] text-[var(--amber-400)] transition-colors focus:ring-2 focus:ring-[var(--amber-500)]/50"
                      >
                        Details
                      </button>
                    )}
                    <button
                      onClick={() => handleDismiss(alert.rule.id)}
                      className="text-xs text-[var(--text-2)] hover:text-[var(--text-1)]"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}

            {anomalyIndices.length > 0 && (
              <div className="rounded-lg border border-purple-500/50 bg-purple-500/10 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-purple-400">MRR Anomalies Detected</span>
                </div>
                <p className="text-xs text-slate-300">
                  {anomalyIndices.length} unusual MRR change(s) detected (z-score &gt; 2)
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

