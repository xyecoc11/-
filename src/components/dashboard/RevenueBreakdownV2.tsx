'use client';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, LabelList } from 'recharts';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Ember } from '@/theme/palette';

interface PlanRevenue {
  plan: string;
  revenue: number;
}

interface ChannelRevenue {
  channel: string;
  revenue: number;
}

interface RevenueBreakdownV2Props {
  planRevenue?: PlanRevenue[];
  channelRevenue?: ChannelRevenue[];
}

const CHANNEL_COLORS = {
  Email: '#ff8a00',      // Lava amber
  Telegram: '#ffb347',   // Amber glow
  Discord: '#ff9100',     // Amber bright
  Twitter: '#ffb347',
  Instagram: '#ffd59b',
  Other: '#9b8573',
};

const PLAN_COLORS = ['#ff7a00', '#ff9100', '#ffb347', '#ffd59b'];

export default function RevenueBreakdownV2({
  planRevenue = [],
  channelRevenue = [],
}: RevenueBreakdownV2Props) {
  const [hoveredChannel, setHoveredChannel] = useState<string | null>(null);
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);

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

  const totalChannelRevenue = channelData.reduce((sum, c) => sum + c.revenue, 0);
  const totalPlanRevenue = planData.reduce((sum, p) => sum + p.revenue, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0];
      const isChannel = entry.payload?.channel;
      const isPlan = entry.payload?.plan;
      const total = isChannel ? totalChannelRevenue : totalPlanRevenue;
      const percentage = total > 0 ? (entry.value / total) * 100 : 0;
      
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            background: 'rgba(20,10,5,0.95)',
            border: '1px solid rgba(255,140,0,0.4)',
            borderRadius: '12px',
            padding: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,.35), 0 0 12px rgba(255,120,0,0.15)',
            color: 'var(--text-main)'
          }}
        >
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-main)', textShadow: '0 0 4px rgba(255,150,0,0.2)' }}>
            {isChannel ? 'Channel' : 'Plan'}: {entry.name || entry.payload?.channel || entry.payload?.plan}
          </p>
          <p className="font-bold mb-1" style={{ color: 'var(--amber-bright)', textShadow: '0 0 8px rgba(255,120,0,0.4)' }}>
            Revenue: ${entry.value.toFixed(2)}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
            Share: {percentage.toFixed(1)}%
          </p>
        </motion.div>
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
        className="ember-card p-6 overflow-hidden"
      >
        <div className="relative z-10">
          <h3 className="text-lg font-semibold tracking-tight mb-4 flex items-center gap-2" style={{ color: 'var(--amber-light)', textShadow: '0 0 10px rgba(255,150,0,.25)' }}>
            <span className="w-1 h-5 bg-[var(--amber-core)] rounded-full" style={{ boxShadow: 'var(--lava-glow)' }} />
            Revenue by Channel
          </h3>
          <div className="relative">
            {/* Shadow glow behind donut */}
            <div 
              className="absolute inset-0 flex items-center justify-center"
              style={{
                filter: 'blur(20px)',
                opacity: 0.3,
                zIndex: 0,
              }}
            >
              <div
                className="w-64 h-64 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(255,140,0,0.2), transparent)',
                }}
              />
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <defs>
                  <filter id="donut-glow">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <Pie
                  data={channelData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={hoveredChannel ? 115 : 110}
                  paddingAngle={3}
                  dataKey="revenue"
                  onMouseEnter={(_, index) => setHoveredChannel(channelData[index].channel)}
                  onMouseLeave={() => setHoveredChannel(null)}
                  style={{ transition: 'all 0.3s ease', filter: 'url(#donut-glow)' }}
                  label={({ channel, revenue, percent, cx, cy, midAngle, innerRadius, outerRadius }: any) => {
                    const RADIAN = Math.PI / 180;
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                    const percentage = (percent * 100).toFixed(0);
                    return (
                      <text 
                        x={x} 
                        y={y} 
                        fill="var(--text-main)" 
                        textAnchor={x > cx ? 'start' : 'end'} 
                        dominantBaseline="central"
                        fontSize="11"
                        fontWeight="600"
                        style={{ textShadow: '0 0 4px rgba(255,150,0,0.3)' }}
                      >
                        {percentage}%
                      </text>
                    );
                  }}
                  labelLine={false}
                >
                  {channelData.map((entry, index) => {
                    const isHovered = hoveredChannel === entry.channel;
                    const color = CHANNEL_COLORS[entry.channel as keyof typeof CHANNEL_COLORS] || CHANNEL_COLORS.Other;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={color}
                        style={{
                          filter: isHovered ? 'drop-shadow(0 0 12px rgba(255,140,0,0.8)) brightness(1.2)' : undefined,
                          transition: 'all 0.3s ease',
                        }}
                      />
                    );
                  })}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
            {channelData.map((entry, index) => {
              const color = CHANNEL_COLORS[entry.channel as keyof typeof CHANNEL_COLORS] || CHANNEL_COLORS.Other;
              const percentage = (entry.revenue / totalChannelRevenue) * 100;
              return (
                <div
                  key={index}
                  className="flex items-center gap-2 text-xs"
                  style={{ color: 'var(--text-dim)' }}
                  onMouseEnter={() => setHoveredChannel(entry.channel)}
                  onMouseLeave={() => setHoveredChannel(null)}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      background: color,
                      boxShadow: hoveredChannel === entry.channel ? `0 0 8px ${color}` : undefined,
                    }}
                  />
                  <span className="font-medium">{entry.channel}</span>
                  <span className="text-[var(--amber-glow)]">({percentage.toFixed(1)}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Plan Revenue - Bar Chart */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="ember-card p-6 overflow-hidden"
      >
        <div className="relative z-10">
          <div className="mb-2">
            <h3 className="text-lg font-semibold tracking-tight mb-1 flex items-center gap-2" style={{ color: 'var(--amber-light)', textShadow: '0 0 10px rgba(255,150,0,.25)' }}>
              <span className="w-1 h-5 bg-[var(--amber-bright)] rounded-full" style={{ boxShadow: 'var(--lava-glow)' }} />
              Revenue by Plan
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-dim)', marginLeft: '1.5rem' }}>
              Distribution of revenue by subscription tier
            </p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={planData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3a2212" strokeOpacity={0.45} />
              <XAxis dataKey="plan" stroke="#3a2212" tick={{ fill: 'var(--text-dim)', fontSize: '12px' }} />
              <YAxis
                stroke="#3a2212"
                tick={{ fill: 'var(--text-dim)', fontSize: '12px' }}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,122,0,0.1)', stroke: 'rgba(255,122,0,0.3)', strokeWidth: 1 }} />
              <Bar 
                dataKey="revenue" 
                radius={[8, 8, 0, 0]}
                barSize={60}
                style={{
                  transition: 'all 0.3s ease',
                }}
              >
                {planData.map((entry, index) => {
                  const color = PLAN_COLORS[index % PLAN_COLORS.length];
                  const isHovered = hoveredPlan === entry.plan;
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={`url(#barGradient-${index})`}
                      onMouseEnter={() => setHoveredPlan(entry.plan)}
                      onMouseLeave={() => setHoveredPlan(null)}
                      style={{
                        filter: isHovered ? 'drop-shadow(0 0 8px rgba(255,140,0,0.6)) brightness(1.15)' : undefined,
                        transition: 'all 0.3s ease',
                      }}
                    />
                  );
                })}
                <LabelList 
                  dataKey="revenue" 
                  position="top" 
                  formatter={(label: any) => {
                    const value = typeof label === 'number' ? label : (typeof label === 'string' ? parseFloat(label) : 0);
                    return `$${value.toFixed(0)}`;
                  }}
                  style={{
                    fill: 'var(--amber-bright)',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    textShadow: '0 0 4px rgba(255,120,0,0.4)',
                  }}
                />
              </Bar>
              <defs>
                {planData.map((_, index) => {
                  const color = PLAN_COLORS[index % PLAN_COLORS.length];
                  const lighter = index === 0 ? '#ff9100' : index === 1 ? '#ffa94d' : index === 2 ? '#ffb85c' : '#ffd59b';
                  return (
                    <linearGradient key={`barGradient-${index}`} id={`barGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={lighter} />
                      <stop offset="100%" stopColor={color} />
                    </linearGradient>
                  );
                })}
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}

