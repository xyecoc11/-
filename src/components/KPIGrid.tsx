import type { RevenueKPIs } from '@/lib/types';
import MetricCard from '@/components/MetricCard';

type KPIs = RevenueKPIs & { mrrGrowth?: number; ltv?: number; nrr?: number; refundRate?: number };
export default function KPIGrid({ kpis, loading }: { kpis: KPIs; loading?: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
      <MetricCard label="MRR" value={kpis.mrr} loading={loading} />
      <MetricCard label="ARR" value={kpis.arr} loading={loading} />
      <MetricCard label="Churn" value={kpis.churnRate} percent loading={loading} trendColor={kpis.churnRate!=null?(kpis.churnRate<0.06?'green':'red'):undefined}/>
      <MetricCard label="Failed payments" value={kpis.failedPaymentsRate} percent loading={loading} trendColor={kpis.failedPaymentsRate!=null?(kpis.failedPaymentsRate<0.05?'green':'red'):undefined}/>
      <MetricCard label="MRR Growth" value={kpis.mrrGrowth ?? 0} percent loading={loading} trendColor={kpis.mrrGrowth!=null?(kpis.mrrGrowth>=0?'green':'red'):undefined}/>
      <MetricCard label="LTV" value={kpis.ltv ?? 0} loading={loading} trendColor={'green'} />
      <MetricCard label="NRR" value={kpis.nrr ?? 0} percent loading={loading} trendColor={kpis.nrr!=null?(kpis.nrr>=1?'green':'red'):undefined}/>
      <MetricCard label="Refund Rate" value={kpis.refundRate ?? 0} percent loading={loading} trendColor={kpis.refundRate!=null?(kpis.refundRate<0.02?'green':'red'):undefined}/>
    </div>
  );
}
