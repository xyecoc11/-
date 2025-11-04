'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useUIMode } from '@/hooks/useUIMode';
import AlertsPanel from './AlertsPanel';
import EnhancedInsightsV2 from './EnhancedInsightsV2';
import type { Insight } from '@/lib/types';

interface AlertsAndInsightsPanelProps {
  metrics: any;
  anomalyIndices?: number[];
  insights: Insight[];
  onScrollToSection?: (section: string) => void;
}

export default function AlertsAndInsightsPanel({
  metrics,
  anomalyIndices = [],
  insights,
  onScrollToSection,
}: AlertsAndInsightsPanelProps) {
  const { mode } = useUIMode();
  const [activeTab, setActiveTab] = useState<'alerts' | 'insights'>('alerts');
  
  // Determine default tab based on alerts
  const hasAlerts = metrics && (
    (metrics.refundRate && metrics.refundRate > 0.02) ||
    (metrics.failedPaymentsRate && metrics.failedPaymentsRate > 0.05) ||
    (metrics.netNewMRR && metrics.netNewMRR.netNew < 0) ||
    (metrics.nrr && metrics.nrr < 1) ||
    (anomalyIndices && anomalyIndices.length > 0)
  );

  // Set default tab on mount
  useEffect(() => {
    if (!hasAlerts) {
      setActiveTab('insights');
    }
  }, [hasAlerts]);

  const MotionWrapper = mode === 'performance' ? 'div' : motion.div;
  const motionProps = mode === 'performance' ? {} : {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.5 },
  };

  return (
    <MotionWrapper
      {...motionProps}
      className="ember-card p-6"
    >
      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b" style={{ borderColor: 'var(--border-soft)' }}>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-2 text-sm font-medium transition-all relative ${
            activeTab === 'alerts'
              ? 'ember-btn'
              : 'ember-btn-secondary'
          }`}
        >
          Alerts
          {activeTab === 'alerts' && hasAlerts && (
            <motion.span
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5"
              style={{ background: 'var(--amber-core)' }}
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab('insights')}
          className={`px-4 py-2 text-sm font-medium transition-all relative ${
            activeTab === 'insights'
              ? 'ember-btn'
              : 'ember-btn-secondary'
          }`}
        >
          Insights
          {activeTab === 'insights' && (
            <motion.span
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5"
              style={{ background: 'var(--amber-core)' }}
            />
          )}
        </button>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'alerts' ? (
          <motion.div
            key="alerts"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <AlertsPanel
              metrics={metrics}
              anomalyIndices={anomalyIndices}
              onScrollToSection={onScrollToSection}
            />
          </motion.div>
        ) : (
          <motion.div
            key="insights"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <EnhancedInsightsV2 insights={insights} />
          </motion.div>
        )}
      </AnimatePresence>
    </MotionWrapper>
  );
}

