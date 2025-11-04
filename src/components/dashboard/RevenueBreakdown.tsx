'use client';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';

interface PlanRevenue {
  plan: string;
  revenue: number;
}

interface ChannelRevenue {
  channel: string;
  revenue: number;
}

interface RevenueBreakdownProps {
  planRevenue?: PlanRevenue[];
  channelRevenue?: ChannelRevenue[];
}

const CHANNEL_COLORS = {
  Telegram: '#0088cc',
  Email: '#34d399',
  Discord: '#5865f2',
  Twitter: '#1da1f2',
  Instagram: '#e1306c',
  Other: '#64748b',
};

const PLAN_COLORS = ['#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b'];

export default function RevenueBreakdown({
  planRevenue = [],
  channelRevenue = [],
}: RevenueBreakdownProps) {
  // Default data if none provided
  const defaultPlans: PlanRevenue[] = planRevenue.length > 0 ? planRevenue : [
    { plan: 'Basic', revenue: 500 },
    { plan: 'Pro', revenue: 2000 },
    { plan: 'Enterprise', revenue: 5000 },
  ];

  const defaultChannels: ChannelRevenue[] = channelRevenue.length > 0 ? channelRevenue : [
    { channel: 'Telegram', revenue: 1500 },
    { channel: 'Email', revenue: 800 },
    { channel: 'Discord', revenue: 1200 },
    { channel: 'Twitter', revenue: 400 },
    { channel: 'Instagram', revenue: 300 },
  ];

  const channelData = defaultChannels.map(c => ({
    ...c,
    revenue: c.revenue / 100,
  }));

  const planData = defaultPlans.map(p => ({
    ...p,
    revenue: p.revenue / 100,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 border border-cyan-500/30 rounded-lg p-3 shadow-2xl">
          <p className="text-slate-300 text-sm font-semibold">
            {payload[0].name || payload[0].payload.channel || payload[0].payload.plan}
          </p>
          <p className="text-cyan-400 font-bold">${payload[0].value.toFixed(2)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Channel Revenue - Donut Chart */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl p-6 shadow-2xl"
      >
        <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <span className="w-1 h-5 bg-gradient-to-b from-cyan-400 to-violet-400 rounded-full" />
          Revenue by Channel
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={channelData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="revenue"
              label={(entry: any) => `${entry.channel}: $${entry.revenue.toFixed(0)}`}
              labelLine={false}
            >
              {channelData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CHANNEL_COLORS[entry.channel as keyof typeof CHANNEL_COLORS] || CHANNEL_COLORS.Other}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Plan Revenue - Bar Chart */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="relative rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl p-6 shadow-2xl"
      >
        <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <span className="w-1 h-5 bg-gradient-to-b from-violet-400 to-cyan-400 rounded-full" />
          Revenue by Plan
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={planData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
            <XAxis dataKey="plan" stroke="#64748b" style={{ fontSize: '12px' }} />
            <YAxis
              stroke="#64748b"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="revenue" radius={[8, 8, 0, 0]}>
              {planData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={PLAN_COLORS[index % PLAN_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}

