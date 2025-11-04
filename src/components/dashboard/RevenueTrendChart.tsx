'use client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, LineChart } from 'recharts';
import { motion } from 'framer-motion';

interface RevenueData {
  month: string;
  mrr: number;
  arr: number;
  refunds: number;
}

interface RevenueTrendChartProps {
  months: string[];
  revenue: number[];
  mrrData?: number[];
  refundData?: number[];
}

export default function RevenueTrendChart({
  months,
  revenue,
  mrrData,
  refundData,
}: RevenueTrendChartProps) {
  // Prepare data for dual-axis chart
  const chartData: RevenueData[] = months.map((month, i) => ({
    month: month.slice(5), // Show only MM format
    mrr: (mrrData?.[i] ?? revenue[i]) / 100,
    arr: ((mrrData?.[i] ?? revenue[i]) * 12) / 100,
    refunds: (refundData?.[i] ?? 0) / 100,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 border border-cyan-500/30 rounded-lg p-3 shadow-2xl backdrop-blur-xl">
          <p className="text-slate-300 text-sm font-semibold mb-2">
            {payload[0].payload.month}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: <span className="font-bold">${entry.value.toFixed(2)}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl p-6 shadow-2xl"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-violet-500/5 rounded-2xl" />
      <div className="relative z-10">
        <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <span className="w-1 h-5 bg-gradient-to-b from-cyan-400 to-violet-400 rounded-full" />
          Revenue Trends (12mo)
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorArr" x1="0" y1="0" x2="0" y2="1">
                <linearGradient id="colorArr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
            <XAxis
              dataKey="month"
              stroke="#64748b"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              yAxisId="left"
              stroke="#64748b"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="mrr"
              stroke="#06b6d4"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorMrr)"
              name="MRR"
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="arr"
              stroke="#8b5cf6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorArr)"
              name="ARR"
            />
            {refundData && refundData.some(r => r > 0) && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="refunds"
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Refunds"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

