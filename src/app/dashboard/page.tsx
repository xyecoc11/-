'use client';
import { useEffect, useState, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useUIMode } from '@/hooks/useUIMode';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';
import EnhancedMetricCardV2 from '@/components/dashboard/EnhancedMetricCardV2';
import RevenueTrendChartV2 from '@/components/dashboard/RevenueTrendChartV2';
import EnhancedRetentionHeatmapV2 from '@/components/dashboard/EnhancedRetentionHeatmapV2';
import SystemHealthV2 from '@/components/dashboard/SystemHealthV2';
import AISummaryBarV2 from '@/components/dashboard/AISummaryBarV2';
import DataRangeSelector from '@/components/dashboard/DataRangeSelector';
import TopCustomersV2 from '@/components/dashboard/TopCustomersV2';
import CursorLight from '@/components/dashboard/CursorLight';
import RevenueBreakdownV2 from '@/components/dashboard/RevenueBreakdownV2';
import UIModeToggle from '@/components/dashboard/UIModeToggle';
import NetNewMRRBreakdownComponent from '@/components/dashboard/NetNewMRRBreakdown';
import DunningRecovery from '@/components/dashboard/DunningRecovery';
import AlertsAndInsightsPanel from '@/components/dashboard/AlertsAndInsightsPanel';
import ProductAdoption from '@/components/dashboard/ProductAdoption';
import EmptyChartState from '@/components/dashboard/EmptyChartState';
import Toast from '@/components/dashboard/Toast';
import {
  computeMRR,
  computeARR,
  computeMonthlyChurn,
  computeFailedPaymentsRate,
  buildRetentionCohorts,
  topCustomersByLTV,
  computeMRRGrowthRate,
  computeLTV,
  computeNRR,
  computeRefundRate,
  computeARPU,
  computeNetNewMRR,
  computeDunningMetrics,
  detectMRRAnomalies,
  type NetNewMRRBreakdown,
  type DunningMetrics,
} from '@/lib/analytics';
import type { RevenueKPIs, CohortRow, WhopOrder, WhopSubscription, WhopRefund, Insight } from '@/lib/types';

type DataRange = '7d' | '30d' | '90d' | 'YTD';

function useDashboardData(range: DataRange = '90d', refreshTrigger: number = 0, companyId?: string) {
  const [data, setData] = useState<null | {
    kpis: RevenueKPIs & {
      mrrGrowth?: number;
      ltv?: number;
      nrr?: number;
      refundRate?: number;
      arpu?: number;
      cac?: number;
      paybackPeriod?: number;
    };
    months: string[];
    revenue: number[];
    mrrData: number[];
    refundData: number[];
    cohorts: CohortRow[];
    insights: Insight[];
    topCustomers: { userId: string; ltvCents: number }[];
    netNewMRR?: NetNewMRRBreakdown;
    netNewMRRMonthly?: Array<{
      month: string;
      new: number;
      expansion: number;
      contraction: number;
      churn: number;
    }>;
    dunningMetrics?: DunningMetrics;
    anomalyIndices?: number[];
    dailyFailedRecovered?: Array<{ date: string; failed: number; recovered: number }>;
  }>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [planRevenue, setPlanRevenue] = useState<Array<{ plan: string; revenue: number }>>([]);
  const [channelRevenue, setChannelRevenue] = useState<Array<{ channel: string; revenue: number }>>([]);
  const [featureData, setFeatureData] = useState<{ ahaMomentRate: number | null; timeToValueMin: number | null; features: Array<{ feature: string; adoptionRate: number; retentionUplift: number }>; } | null>(null);
  const [failureReasons, setFailureReasons] = useState<Array<{ reason: string; count: number; recovery_rate: number }>>([]);
  const [recoveryByDay, setRecoveryByDay] = useState<Array<{ day: number; recovery: number }>>([]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;
        
        // Fetch metrics from /api/metrics endpoint (from Supabase)
        let metricsData: any = null;
        try {
          const metricsRes = await fetch(`/api/metrics${companyId ? `?companyId=${encodeURIComponent(companyId)}` : ''}`, { 
            cache: 'no-store',
            next: { revalidate: 0 },
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
            }
          });
          if (metricsRes.ok) {
            const rawData = await metricsRes.json();
            metricsData = rawData;
            console.log('[Dashboard] ✅ Fetched metrics from API:', JSON.stringify(metricsData, null, 2));
            console.log('[Dashboard] ✅ MRR value:', metricsData.mrr, 'Type:', typeof metricsData.mrr);
          } else {
            const errorText = await metricsRes.text();
            console.error('[Dashboard] ❌ Metrics API returned error:', metricsRes.status, errorText);
          }
        } catch (err) {
          console.error('[Dashboard] ❌ Could not fetch metrics from API, falling back to local computation:', err);
        }
        
        // Still fetch raw data for charts and cohorts
        const [subsRes, ordersRes, refundsRes, revRes, healthRes] = await Promise.all([
          fetch(`/api/whop/subscriptions?days=${days}${companyId ? `&companyId=${encodeURIComponent(companyId)}` : ''}`).then(r => r.json()),
          fetch(`/api/whop/orders?days=${days}${companyId ? `&companyId=${encodeURIComponent(companyId)}` : ''}`).then(r => r.json()),
          fetch(`/api/whop/refunds?days=${days}${companyId ? `&companyId=${encodeURIComponent(companyId)}` : ''}`).then(r => r.json()),
          fetch(`/api/analytics/revenue?companyId=${encodeURIComponent(companyId || '')}`).then(r => r.json()),
          fetch(`/api/analytics/system-health?companyId=${encodeURIComponent(companyId || '')}`).then(r => r.json()),
        ]);
        
        if (subsRes.error) throw new Error(subsRes.error);
        if (ordersRes.error) throw new Error(ordersRes.error);
        if (refundsRes.error) throw new Error(refundsRes.error);
        
        const subs: WhopSubscription[] = subsRes.data ?? [];
        const orders: WhopOrder[] = ordersRes.data ?? [];
        const refunds: WhopRefund[] = refundsRes.data ?? [];
        // dynamic value: computed from Supabase
        setPlanRevenue((revRes?.plan || []).map((p: any) => ({ plan: p.plan, revenue: p.revenue })));
        setChannelRevenue(revRes?.channel || []);

        // Use metrics from API if available, otherwise compute locally
        const now = new Date();
        
        // Prioritize API metrics over local computation
        let mrr: number;
        let arr: number;
        let churnRate: number;
        let failedPaymentsRate: number;
        
        if (metricsData && typeof metricsData.mrr === 'number' && metricsData.mrr !== null && !isNaN(metricsData.mrr)) {
          // Use API metrics directly - values are already in cents format
          mrr = Number(metricsData.mrr);
          arr = Number(metricsData.arr) || mrr * 12;
          churnRate = Number(metricsData.churn) || 0;
          failedPaymentsRate = Number(metricsData.failedPayments) || 0;
          console.log('[Dashboard] ✅ Using API metrics (cents):', { 
            mrr, 
            arr, 
            churnRate, 
            failedPaymentsRate,
            'MRR in $': mrr / 100,
            'ARR in $': arr / 100
          });
        } else {
          // Fallback to local computation
          console.warn('[Dashboard] ⚠️ Metrics data not available or invalid, computing locally');
          console.warn('[Dashboard] metricsData:', metricsData);
          console.warn('[Dashboard] Raw data arrays - subs:', subs.length, 'orders:', orders.length, 'refunds:', refunds.length);
          mrr = computeMRR(subs, now);
          arr = computeARR(mrr);
          churnRate = computeMonthlyChurn(subs, now);
          failedPaymentsRate = computeFailedPaymentsRate(orders, refunds);
          console.log('[Dashboard] Computed locally:', { mrr, arr, churnRate, failedPaymentsRate });
        }

        // Chart: revenue per month (last 12)
        const months: string[] = [];
        const revenue: number[] = [];
        const mrrData: number[] = [];
        const refundData: number[] = [];
        
        const monthsAgo = (n: number) => new Date(now.getFullYear(), now.getMonth() - n, 1);
        const monthsToShow = range === '7d' ? 2 : range === '30d' ? 3 : 12;
        
        for (let i = monthsToShow - 1; i >= 0; i--) {
          const d = monthsAgo(i);
          const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
          months.push(key);
          
          const monthOrders = orders.filter(o => {
            const od = new Date(o.createdAt);
            return od.getFullYear() === d.getFullYear() && od.getMonth() === d.getMonth();
          });
          
          revenue.push(monthOrders.reduce((sum, o) => sum + o.amountCents, 0));
          
          // Use API MRR for current month (i === 0), otherwise compute from local data
          let monthMRR: number;
          if (i === 0 && metricsData && typeof metricsData.mrr === 'number') {
            monthMRR = metricsData.mrr;
            console.log('[Dashboard] 📈 Using API MRR for current month:', monthMRR);
          } else {
            monthMRR = computeMRR(subs, d);
          }
          mrrData.push(monthMRR);
          
          const monthRefunds = refunds.filter(r => {
            const rd = new Date(r.createdAt);
            return rd.getFullYear() === d.getFullYear() && rd.getMonth() === d.getMonth();
          });
          refundData.push(monthRefunds.reduce((sum, r) => sum + r.amountCents, 0));
        }
        
        console.log('[Dashboard] 📈 Chart data:', {
          months: months.length,
          mrrData: mrrData,
          lastMonthMRR: mrrData[mrrData.length - 1],
          revenue: revenue.slice(-3),
        });

        // Cohorts
        // dynamic value from Supabase
        const cohortsApi = await fetch(`/api/analytics/cohorts?companyId=${encodeURIComponent(companyId || '')}`).then(r => r.json()).catch(() => ({ cohorts: [] }));
        const cohorts = (cohortsApi?.cohorts || []) as CohortRow[];
        
        // Insights (POST)
        const kpis = { mrr, arr, churnRate, failedPaymentsRate };
        const insightsRes = await fetch('/api/insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kpis }),
        }).then(r => r.json());
        const insights: Insight[] = insightsRes.insights || [];
        
        // Top customers
        const topCustomers = topCustomersByLTV(orders, 10);

        // Compute extra KPIs - use API metrics if available, otherwise compute locally
        const prev = new Date(now);
        prev.setMonth(now.getMonth() - 1);
        const prevMRR = computeMRR(subs, prev);
        const mrrGrowth = computeMRRGrowthRate(mrr, prevMRR);
        
        const numActive = subs.filter(s => s.status === 'active' || s.status === 'trialing').length;
        
        // Prioritize API metrics for extended KPIs
        const arpu = (metricsData && typeof metricsData.arpu === 'number') ? metricsData.arpu : computeARPU(orders, numActive || 1);
        const ltv = (metricsData && typeof metricsData.ltv === 'number') ? metricsData.ltv : computeLTV(churnRate, arpu);
        
        const churnedMRR = subs
          .filter(s => s.status === 'canceled' && s.canceledAt && 
            new Date(s.canceledAt).getMonth() === now.getMonth() && 
            new Date(s.canceledAt).getFullYear() === now.getFullYear())
          .reduce((a, s) => a + s.amountCents, 0);
        
        // NRR from API is a decimal (0-1+), use it directly
        const nrr = (metricsData && typeof metricsData.nrr === 'number') ? metricsData.nrr : computeNRR(mrr, 0, churnedMRR);
        const refundRate = (metricsData && typeof metricsData.refundRate === 'number') ? metricsData.refundRate : computeRefundRate(orders, refunds);

        // Use CAC and Payback from API if available
        const cac = (metricsData && typeof metricsData.cac === 'number') ? metricsData.cac : (arpu * 0.3);
        const paybackPeriod = (metricsData && metricsData.payback !== null && metricsData.payback !== undefined) 
          ? metricsData.payback 
          : (cac > 0 ? ltv / cac : 0);

        const allKpis = {
          ...kpis,
          mrrGrowth,
          ltv,
          nrr,
          refundRate,
          arpu,
          cac,
          paybackPeriod,
        };
        
        // Debug: Log final KPIs before setting state
        console.log('[Dashboard] 🎯 Final KPIs to render:', JSON.stringify(allKpis, null, 2));

        // Compute Net New MRR
        const currentPeriodEnd = new Date(now);
        currentPeriodEnd.setMonth(now.getMonth() + 1);
        const currentPeriodStart = new Date(now);
        currentPeriodStart.setMonth(now.getMonth());
        const netNewMRR = computeNetNewMRR(subs, orders, currentPeriodStart, currentPeriodEnd);

        // Previous period
        const prevPeriodStart = new Date(now);
        prevPeriodStart.setMonth(now.getMonth() - 1);
        const prevPeriodEnd = new Date(now);
        const prevNetNewMRR = computeNetNewMRR(subs, orders, prevPeriodStart, prevPeriodEnd);

        // Monthly breakdown
        const netNewMRRMonthly = months.map((month, i) => {
          const monthStart = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]) - 1, 1);
          const monthEnd = new Date(monthStart);
          monthEnd.setMonth(monthEnd.getMonth() + 1);
          const breakdown = computeNetNewMRR(subs, orders, monthStart, monthEnd);
          return {
            month: month.slice(5),
            new: breakdown.new,
            expansion: breakdown.expansion,
            contraction: breakdown.contraction,
            churn: breakdown.churn,
          };
        });

        // Dunning metrics
        const dunningMetrics = computeDunningMetrics(orders, refunds, 30);

        // Mock daily data for dunning
        // dynamic value from Supabase
        const failuresApi = await fetch(`/api/analytics/failures?companyId=${encodeURIComponent(companyId || '')}`).then(r => r.json()).catch(() => ({ reasons: [], recoveryByDay: [] }));
        const reasonsArr = failuresApi?.reasons || [];
        const recoveryArr = failuresApi?.recoveryByDay || [];
        setFailureReasons(reasonsArr);
        setRecoveryByDay(recoveryArr);
        const dailyFailedRecovered = recoveryArr.map((x: any) => ({ date: String(x.day), failed: 0, recovered: x.recovery }));

        // dynamic value from Supabase (mock removed)

        // Anomaly detection
        const mrrDaily = mrrData || [];
        const anomalyIndices = detectMRRAnomalies(mrrDaily);

        if (isMounted) {
          const finalData = {
            kpis: allKpis,
            months,
            revenue,
            mrrData,
            refundData,
            cohorts,
            insights,
            topCustomers,
            netNewMRR,
            netNewMRRMonthly,
            dunningMetrics,
            anomalyIndices,
            dailyFailedRecovered,
          };
          
          console.log('[Dashboard] 📊 Setting state with data:', {
            mrr: finalData.kpis.mrr,
            arr: finalData.kpis.arr,
            hasMrrData: finalData.mrrData.length > 0,
            mrrDataLength: finalData.mrrData.length,
            firstMrrValue: finalData.mrrData[0],
          });
          
          setData(finalData);
          setLastRefreshed(new Date());
        }
      } catch (e: any) {
        if (isMounted) setError(e.message || 'Failed to load dashboard');
      }
    })();
    return () => { isMounted = false; };
  }, [range, refreshTrigger]);

  return { 
    ...data, 
    error, 
    loading: !data && !error, 
    lastRefreshed,
    planRevenue,
    channelRevenue,
    featureData,
    failureReasons,
    recoveryByDay,
  };
}

export default function DashboardPage({ companyId }: { companyId?: string }) {
  const { mode } = useUIMode();
  const [range, setRange] = useState<DataRange>('90d');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const { 
    kpis, 
    months, 
    revenue, 
    mrrData, 
    refundData, 
    cohorts, 
    insights, 
    topCustomers,
    netNewMRR,
    netNewMRRMonthly,
    dunningMetrics,
    anomalyIndices,
    dailyFailedRecovered,
    error, 
    loading, 
    lastRefreshed,
    planRevenue,
    channelRevenue,
    featureData,
    failureReasons,
    recoveryByDay,
  } = useDashboardData(range, refreshTrigger, companyId);

  // Auto-refresh metrics every 60 seconds
  useEffect(() => {
    const refreshMetrics = async () => {
      setIsRefreshing(true);
      try {
        const res = await fetch('/api/metrics', { cache: 'no-store' });
        if (res.ok) {
          // Trigger a refresh by updating the trigger
          setRefreshTrigger(prev => prev + 1);
        }
      } catch (err) {
        console.error('[Auto-refresh] Error:', err);
      } finally {
        setIsRefreshing(false);
      }
    };

    // Set up interval for periodic refresh (first after 60s, then every 60s)
    const interval = setInterval(refreshMetrics, 60000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Debug: Log what we're about to render
  useEffect(() => {
    if (kpis) {
      console.log('[Dashboard] 🎨 Rendering with KPIs:', {
        mrr: kpis.mrr,
        arr: kpis.arr,
        churnRate: kpis.churnRate,
        hasData: !!kpis,
        mrrDataLength: mrrData?.length || 0,
        'kpis object': kpis,
      });
    } else {
      console.warn('[Dashboard] ⚠️ KPIs are null/undefined');
    }
  }, [kpis, mrrData]);

  const handleRefresh = async () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleForceSync = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    try {
      const response = await fetch('/api/sync/whop/trigger');
      if (response.ok) {
        setShowToast(true);
        // Trigger refresh after a short delay to show updated data
        setTimeout(() => {
          setRefreshTrigger(prev => prev + 1);
        }, 1000);
      } else {
        console.error('Sync failed:', await response.text());
      }
    } catch (error) {
      console.error('Error triggering sync:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Generate sparkline data
  const generateSparkline = (values: number[]): Array<{ value: number; label?: string }> => {
    return values.slice(-12).map((v, i) => ({ value: v / 100, label: String(i) }));
  };

  if (loading) return <LoadingState label="Loading dashboard" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="min-h-screen relative overflow-hidden text-[var(--text-main)]">
      {/* Cursor spotlight with smooth spring follow */}
      {mode === 'ai' && <CursorLight />}

      {/* Animated grid pattern overlay */}
      <div className="fixed inset-0 opacity-[0.04] pointer-events-none z-0" 
        style={{
          backgroundImage: `
            linear-gradient(var(--amber-core) 1px, transparent 1px),
            linear-gradient(90deg, var(--amber-core) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      <Toast 
        message="Sync triggered" 
        isVisible={showToast} 
        onClose={() => setShowToast(false)} 
      />
      
      <main className="relative z-10 mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 pb-20 space-y-8">
        {/* Header with data range selector */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ color: 'var(--amber-light)', textShadow: '0 0 10px rgba(255,150,0,.25)' }}>
              Revenue Dashboard
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>Real-time analytics & insights</p>
          </div>
          <div className="flex items-center gap-4">
            {lastRefreshed && (
              <span className="text-xs hidden sm:inline" style={{ color: 'var(--text-dim)' }}>
                Data refreshed {Math.floor((Date.now() - lastRefreshed.getTime()) / 60000)} min ago
              </span>
            )}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleForceSync}
              disabled={isSyncing}
              className="p-2 rounded-lg transition-colors disabled:opacity-50 ember-btn-secondary"
              title="Force Sync"
            >
              <motion.span
                animate={{ rotate: isSyncing ? 360 : 0 }}
                transition={{ duration: 1, repeat: isSyncing ? Infinity : 0, ease: 'linear' }}
                className="text-lg"
              >
                ⚡
              </motion.span>
            </motion.button>
            <UIModeToggle />
            <DataRangeSelector value={range} onChange={setRange} />
          </div>
        </motion.div>

        {/* AI Summary Bar */}
        <AISummaryBarV2
          kpis={kpis!}
          topCustomersCount={topCustomers?.length || 0}
          onRefresh={handleRefresh}
          lastRefreshed={lastRefreshed || undefined}
        />

        {/* Loading shimmer overlay */}
        {isRefreshing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gradient-to-r from-transparent via-[var(--amber-core)]/10 to-transparent z-50 pointer-events-none"
            style={{
              backgroundSize: '200% 100%',
              animation: 'shimmer 2s infinite',
            }}
          />
        )}

        {/* Expanded KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          <EnhancedMetricCardV2
            label="MRR"
            value={kpis?.mrr ?? 0}
            tooltip="Monthly Recurring Revenue from active subscriptions"
            sparkline={generateSparkline(mrrData || [])}
            trendColor="amber"
            change={kpis?.mrrGrowth ? kpis.mrrGrowth * 100 : undefined}
          />
          <EnhancedMetricCardV2
            label="ARR"
            value={kpis?.arr ?? 0}
            tooltip="Annual Recurring Revenue (MRR × 12)"
            sparkline={generateSparkline((mrrData || []).map(m => m * 12))}
            trendColor="amber"
          />
          <EnhancedMetricCardV2
            label="Churn Rate"
            value={kpis?.churnRate ?? 0}
            percent
            tooltip="Monthly subscription cancellation rate"
            trendColor={(kpis?.churnRate ?? 0) < 0.06 ? 'green' : 'red'}
            change={(kpis?.churnRate ?? 0) * 100}
          />
          <EnhancedMetricCardV2
            label="Failed Payments"
            value={kpis?.failedPaymentsRate ?? 0}
            percent
            tooltip="Percentage of orders that were refunded"
            trendColor={(kpis?.failedPaymentsRate ?? 0) < 0.05 ? 'green' : 'red'}
          />
          <EnhancedMetricCardV2
            label="ARPU"
            value={kpis?.arpu ?? 0}
            tooltip="Average Revenue Per User"
            trendColor="amber"
          />
          <EnhancedMetricCardV2
            label="LTV"
            value={kpis?.ltv ?? 0}
            tooltip="Customer Lifetime Value"
            trendColor="green"
          />
          <EnhancedMetricCardV2
            label="NRR"
            value={kpis?.nrr ?? 0}
            percent
            tooltip="Net Revenue Retention"
            trendColor={(kpis?.nrr ?? 0) >= 1 ? 'green' : 'red'}
          />
          <EnhancedMetricCardV2
            label="Refund Rate"
            value={kpis?.refundRate ?? 0}
            percent
            tooltip="Percentage of revenue refunded"
            trendColor={(kpis?.refundRate ?? 0) < 0.02 ? 'green' : 'red'}
          />
          <EnhancedMetricCardV2
            label="CAC"
            value={kpis?.cac ?? 0}
            tooltip="Customer Acquisition Cost (estimated)"
            trendColor="amber"
          />
          <EnhancedMetricCardV2
            label="Payback Period"
            value={kpis?.paybackPeriod ?? 0}
            tooltip="Months to recover CAC (LTV/CAC)"
            trendColor={(kpis?.paybackPeriod ?? 0) < 12 ? 'green' : 'red'}
          />
        </div>

        {/* Revenue Trend Chart */}
        {mrrData && mrrData.length > 0 && months && months.length > 0 ? (
          <RevenueTrendChartV2
            months={months}
            revenue={revenue || []}
            mrrData={mrrData}
            refundData={refundData}
          />
        ) : (
          <EmptyChartState title="Revenue Trends" icon="📉" />
        )}

        {/* Revenue Breakdown */}
        <RevenueBreakdownV2 planRevenue={planRevenue} channelRevenue={channelRevenue} />

        {/* Net New MRR Breakdown */}
        {netNewMRR && netNewMRRMonthly && (
          <NetNewMRRBreakdownComponent
            breakdown={netNewMRR}
            monthlyData={netNewMRRMonthly}
          />
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Retention Cohorts */}
          <div className="lg:col-span-2">
            <EnhancedRetentionHeatmapV2 cohorts={cohorts!} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Alerts & Insights (Combined with Tabs) */}
            <AlertsAndInsightsPanel
              metrics={{
                refundRate: kpis!.refundRate || 0,
                failedPaymentsRate: kpis!.failedPaymentsRate,
                netNewMRR: netNewMRR,
                netNewMRRConsecutiveDays: netNewMRR && netNewMRR.netNew < 0 ? 3 : 0,
                nrr: kpis!.nrr || 0,
              }}
              anomalyIndices={anomalyIndices || []}
              insights={insights!}
            />

            {/* Top Customers */}
            <TopCustomersV2 customers={topCustomers!} />
          </div>
        </div>

        {/* Dunning & Recovery */}
        {dunningMetrics && dailyFailedRecovered && (
          <DunningRecovery
            metrics={dunningMetrics}
            dailyData={dailyFailedRecovered}
            failureReasons={(failureReasons || []).map((r: any) => ({ reason: r.reason || 'unknown', count: r.count || 0, recoveryRate: (r.recovery_rate || 0) / 100 }))}
            recoveryCohort={(recoveryByDay || []).map((r: any) => ({ daysSince: r.day, recovered: r.recovery, total: 100 }))}
          />
        )}

        {/* Product Adoption */}
        <ProductAdoption 
          ahaMomentRate={featureData?.ahaMomentRate ?? 0}
          timeToValue={featureData?.timeToValueMin ?? 0}
          featureAdoption={featureData?.features ?? []}
        />

        {/* System Health */}
        <SystemHealthV2 companyId={companyId} />
      </main>
    </div>
  );
}
