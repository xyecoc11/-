export type AlertSeverity = 'low' | 'medium' | 'high';

export interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: any) => boolean;
  severity: AlertSeverity;
  description: string;
}

export const alertRules: AlertRule[] = [
  {
    id: 'refund-rate-high',
    name: 'High Refund Rate',
    condition: (metrics) => metrics.refundRate > 0.12,
    severity: 'high',
    description: 'Refund rate exceeds 12%',
  },
  {
    id: 'failed-payments-high',
    name: 'High Failed Payments',
    condition: (metrics) => metrics.failedPaymentsRate > 0.08,
    severity: 'high',
    description: 'Failed payments rate exceeds 8%',
  },
  {
    id: 'net-new-mrr-negative',
    name: 'Negative Net New MRR',
    condition: (metrics) => {
      if (!metrics.netNewMRR) return false;
      return metrics.netNewMRR.netNew < 0 && metrics.netNewMRRConsecutiveDays >= 3;
    },
    severity: 'medium',
    description: 'Net New MRR negative for 3+ consecutive days',
  },
  {
    id: 'nrr-below-100',
    name: 'NRR Below 100%',
    condition: (metrics) => metrics.nrr !== undefined && metrics.nrr < 1.0,
    severity: 'medium',
    description: 'Net Revenue Retention below 100% month-to-date',
  },
];

export function evaluateAlerts(metrics: any): Array<{ rule: AlertRule; timestamp: Date }> {
  return alertRules
    .filter(rule => rule.condition(metrics))
    .map(rule => ({ rule, timestamp: new Date() }));
}

