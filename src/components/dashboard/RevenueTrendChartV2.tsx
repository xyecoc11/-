'use client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, LineChart } from 'recharts';
import { motion } from 'framer-motion';
import { useUIMode } from '@/hooks/useUIMode';
import { Ember } from '@/theme/palette';

interface RevenueData {
  month: string;
  mrr: number;
  arr: number;
  refunds: number;
  forecast?: number;
}

interface RevenueTrendChartV2Props {
  months: string[];
  revenue: number[];
  mrrData?: number[];
  refundData?: number[];
}

export default function RevenueTrendChartV2({
  months,
  revenue,
  mrrData,
  refundData,
}: RevenueTrendChartV2Props) {
  const { mode } = useUIMode();
  // Calculate forecast for next 3 months (simple linear extrapolation)
  const calculateForecast = (data: number[]) => {
    if (data.length < 2) return [];
    const recent = data.slice(-3);
    const avgGrowth = recent.length > 1 
      ? (recent[recent.length - 1] - recent[0]) / recent.length
      : 0;
    const last = recent[recent.length - 1];
    return Array.from({ length: 3 }, (_, i) => last + avgGrowth * (i + 1));
  };

  const forecastData = calculateForecast(mrrData || revenue);
  const forecastMonths = Array.from({ length: 3 }, (_, i) => {
    const date = new Date(months[months.length - 1]);
    date.setMonth(date.getMonth() + i + 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  });

  const chartData: RevenueData[] = [
    ...months.map((month, i) => ({
      month: month.slice(5),
      mrr: (mrrData?.[i] ?? revenue[i]) / 100,
      arr: ((mrrData?.[i] ?? revenue[i]) * 12) / 100,
      refunds: (refundData?.[i] ?? 0) / 100,
    })),
    ...forecastMonths.map((month, i) => ({
      month: month.slice(5),
      mrr: forecastData[i] / 100,
      arr: (forecastData[i] * 12) / 100,
      refunds: 0,
      forecast: forecastData[i] / 100,
    })),
  ];

  const CustomTooltip = ({ active, payload, label, coordinate }: any) => {
    if (active && payload && payload.length) {
      const isForecast = payload[0].payload.forecast !== undefined;
      const currentData = payload[0].payload;
      const currentIndex = chartData.findIndex(d => d.month === label);
      const prevData = currentIndex > 0 ? chartData[currentIndex - 1] : null;
      
      const mrrEntry = payload.find((e: any) => e.dataKey === 'mrr');
      const arrEntry = payload.find((e: any) => e.dataKey === 'arr');
      
      const mrrChange = mrrEntry && prevData && prevData.mrr > 0
        ? ((mrrEntry.value - prevData.mrr) / prevData.mrr) * 100
        : null;
      
      const arrChange = arrEntry && prevData && prevData.arr > 0
        ? ((arrEntry.value - prevData.arr) / prevData.arr) * 100
        : null;
      
      // Position tooltip to top-right of cursor
      const tooltipStyle: React.CSSProperties = {
        position: 'absolute',
        left: coordinate?.x ? coordinate.x + 20 : 'auto',
        top: coordinate?.y ? coordinate.y - 80 : 'auto',
        background: 'rgba(20,10,5,0.98)',
        border: '1px solid rgba(255,140,0,0.5)',
        color: 'var(--text-main)',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 8px 30px rgba(0,0,0,.5), 0 0 20px rgba(255,140,0,0.2)',
        pointerEvents: 'none',
        zIndex: 1000,
        minWidth: '200px',
      };
      
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          style={tooltipStyle}
        >
          <p className="text-base font-semibold mb-3" style={{ color: 'var(--text-main)', textShadow: '0 0 4px rgba(255,150,0,0.3)' }}>
            Month: {label} {isForecast && <span className="text-xs" style={{ color: 'var(--amber-glow)', textShadow: '0 0 4px rgba(255,179,71,0.4)' }}>(Forecast)</span>}
          </p>
          {mrrEntry && (
            <p className="text-sm mb-2" style={{ color: '#FFA500' }}>
              <span className="font-bold">MRR:</span> <span className="font-semibold">${mrrEntry.value.toFixed(2)}</span>
            </p>
          )}
          {arrEntry && (
            <p className="text-sm mb-2" style={{ color: '#FFD580' }}>
              <span className="font-bold">ARR:</span> <span className="font-semibold">${arrEntry.value.toFixed(2)}</span>
            </p>
          )}
          {mrrChange !== null && !isForecast && (
            <p className="text-sm font-semibold mt-2 pt-2 border-t" style={{ borderColor: 'rgba(255,140,0,0.2)' }}>
              <span style={{ color: 'var(--text-dim)' }}>Δ vs prev: </span>
              <span className={mrrChange >= 0 ? 'badge-success' : 'badge-danger'}>
                {mrrChange >= 0 ? '+' : ''}{mrrChange.toFixed(1)}%
              </span>
            </p>
          )}
        </motion.div>
      );
    }
    return null;
  };

  const MotionWrapper = mode === 'performance' ? 'div' : motion.div;
  const motionProps = mode === 'performance' ? {} : {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 },
  };

  return (
    <MotionWrapper
      {...motionProps}
      className="ember-card p-6 overflow-hidden ember-glow-bg"
    >
      {/* Subtle radial gradient background */}
      <div className="absolute inset-0 rounded-2xl" style={{
        background: 'radial-gradient(circle at 50% 50%, rgba(255,150,0,0.05), transparent 70%)',
      }} />
      
      {/* Glass effect chart area */}
      <div className="relative z-10">
        <div className="rounded-xl backdrop-blur-md" style={{
          background: 'rgba(20,10,5,0.3)',
          border: '1px solid rgba(255,140,0,0.15)',
          padding: '16px',
          marginBottom: '16px',
        }}>
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-semibold tracking-tight flex items-center gap-3" style={{ color: 'var(--amber-light)', textShadow: '0 0 10px rgba(255,150,0,.25)' }}>
            <span className="w-1.5 h-6 bg-[var(--amber-core)] rounded-full" style={{ boxShadow: 'var(--lava-glow)' }} />
            Revenue Trends (12mo)
          </h3>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[var(--amber-core)]" style={{ boxShadow: 'var(--lava-glow)' }} />
              <span style={{ color: 'var(--text-dim)' }}>MRR</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[var(--amber-light)]" style={{ boxShadow: '0 0 8px rgba(255,213,155,0.4)' }} />
              <span style={{ color: 'var(--text-dim)' }}>ARR</span>
            </div>
          </div>
        </div>
        </div>
        <ResponsiveContainer width="100%" height={380}>
          <AreaChart 
            data={chartData} 
            margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <defs>
              <linearGradient id="amberGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(255,165,0,0.25)" />
                <stop offset="50%" stopColor="rgba(255,165,0,0.15)" />
                <stop offset="100%" stopColor="rgba(255,165,0,0)" />
              </linearGradient>
              <linearGradient id="amberGradientLight" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffd59b" stopOpacity={0.3} />
                <stop offset="50%" stopColor="#ffd59b" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#ffd59b" stopOpacity={0.05} />
              </linearGradient>
              <filter id="glow-mrr">
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <filter id="glow-arr">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              {/* Moving highlight animation gradient */}
              <linearGradient id="shimmer" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                <stop offset="50%" stopColor="rgba(255,255,255,0.3)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                <animateTransform
                  attributeName="gradientTransform"
                  type="translate"
                  values="-1 0;1 0;-1 0"
                  dur="8s"
                  repeatCount="indefinite"
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#3a2212" strokeOpacity={0.45} />
            <XAxis
              dataKey="month"
              stroke="#3a2212"
              tick={{ fill: 'var(--text-dim)', fontSize: '12px' }}
            />
            <YAxis
              yAxisId="left"
              stroke="#3a2212"
              tick={{ fill: 'var(--text-dim)', fontSize: '12px' }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ stroke: `rgba(255,122,0,0.3)`, strokeWidth: 1 }}
              offset={20}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="mrr"
              stroke="#FFA500"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#amberGradient)"
              name="MRR"
              filter="url(#glow-mrr)"
              isAnimationActive={mode === 'ai'}
              animationDuration={1500}
              style={{ 
                filter: 'drop-shadow(0 0 8px rgba(255,165,0,0.67))',
                transition: 'all 0.3s ease',
              }}
              dot={{ fill: '#FFA500', r: 5, strokeWidth: 2, stroke: '#1c0e08', style: { filter: 'drop-shadow(0 0 4px rgba(255,165,0,0.8))' } }}
              activeDot={{ 
                r: 9, 
                stroke: '#ffb347', 
                strokeWidth: 3, 
                fill: '#FFA500',
                style: { filter: 'drop-shadow(0 0 12px rgba(255,165,0,0.9))' } 
              }}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="arr"
              stroke="#FFD580"
              strokeWidth={3}
              strokeDasharray="6 6"
              fillOpacity={1}
              fill="url(#amberGradientLight)"
              name="ARR"
              filter="url(#glow-arr)"
              isAnimationActive={mode === 'ai'}
              animationDuration={1500}
              style={{ 
                filter: 'drop-shadow(0 0 6px rgba(255,213,128,0.6))',
                transition: 'all 0.3s ease',
              }}
              dot={{ fill: '#FFD580', r: 5, strokeWidth: 2, stroke: '#1c0e08', style: { filter: 'drop-shadow(0 0 4px rgba(255,213,128,0.6))' } }}
              activeDot={{ 
                r: 9, 
                stroke: '#ffb347', 
                strokeWidth: 3, 
                fill: '#FFD580',
                style: { filter: 'drop-shadow(0 0 10px rgba(255,213,128,0.8))' } 
              }}
            />
            {refundData && refundData.some(r => r > 0) && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="refunds"
                stroke="#ff3b1f"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Refunds"
                dot={false}
                style={{ filter: 'drop-shadow(0px 0px 4px rgba(255,59,31,0.5))' }}
              />
            )}
            {/* Forecast line with marching ants */}
            {forecastData.length > 0 && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="forecast"
                stroke="#ffb347"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Forecast"
                dot={{ fill: '#ffb347', r: 4 }}
                style={{
                  filter: 'drop-shadow(0px 0px 4px rgba(255,179,71,0.4))',
                  strokeDashoffset: 0,
                  animation: 'dash 1s linear infinite',
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </MotionWrapper>
  );
}

