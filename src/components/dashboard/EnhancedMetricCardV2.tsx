'use client';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useState, useEffect } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { useUIMode } from '@/hooks/useUIMode';

interface SparklineData {
  value: number;
  label?: string;
}

interface EnhancedMetricCardV2Props {
  label: string;
  value: number;
  percent?: boolean;
  loading?: boolean;
  trendColor?: 'green' | 'red' | 'amber' | 'neutral';
  tooltip?: string;
  sparkline?: SparklineData[];
  change?: number;
}

export default function EnhancedMetricCardV2({
  label,
  value,
  percent,
  loading,
  trendColor = 'amber',
  tooltip,
  sparkline,
  change,
}: EnhancedMetricCardV2Props) {
  const { mode } = useUIMode();
  const [isHovered, setIsHovered] = useState(false);
  const [displayValue, setDisplayValue] = useState(0);
  
  const spring = useSpring(value, { stiffness: 100, damping: 30 });
  const motionValue = useMotionValue(value);
  
  useEffect(() => {
    // Update motion value when prop changes
    motionValue.set(value);
    
    const unsubscribe = motionValue.on('change', (latest) => {
      spring.set(latest);
    });
    
    const unsubscribeSpring = spring.on('change', (latest) => {
      setDisplayValue(latest);
    });
    
    // Set initial value
    setDisplayValue(value);
    
    return () => {
      unsubscribe();
      unsubscribeSpring();
    };
  }, [value, motionValue, spring]);

  const formattedValue = percent
    ? `${(displayValue * 100).toFixed(1)}%`
    : `$${(displayValue / 100).toFixed(2)}`;

  const getColorClasses = () => {
    if (trendColor === 'green') return 'border-[var(--lime-glow)]/40 bg-[var(--lime-glow)]/5';
    if (trendColor === 'red') return 'border-[var(--lava-red)]/40 bg-[var(--lava-red)]/5';
    return 'border-[var(--amber-core)]/40 bg-[var(--amber-core)]/5';
  };

  const sparklineData = sparkline || [];
  const maxVal = sparklineData.length ? Math.max(...sparklineData.map(s => s.value)) : 1;
  const minVal = sparklineData.length ? Math.min(...sparklineData.map(s => s.value)) : 0;
  const range = maxVal - minVal || 1;

  const MotionWrapper = mode === 'performance' ? 'div' : motion.div;
  const motionProps = mode === 'performance' ? {} : {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    whileHover: { scale: 1.02, y: -2 },
    transition: { type: 'spring' as const, stiffness: 300, damping: 30, delay: 0.05 },
  };

  return (
    <MotionWrapper
      {...motionProps}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative group"
    >
      <motion.div
        animate={{
          boxShadow: isHovered
            ? `0 6px 20px ${trendColor === 'green' ? 'rgba(64,255,159,0.15)' : trendColor === 'red' ? 'rgba(255,59,31,0.15)' : 'rgba(255,90,0,0.15)'}, inset 0 0 8px ${trendColor === 'green' ? 'rgba(64,255,159,0.08)' : trendColor === 'red' ? 'rgba(255,59,31,0.08)' : 'rgba(255,140,0,0.08)'}, 0 0 30px ${trendColor === 'green' ? 'rgba(64,255,159,0.3)' : trendColor === 'red' ? 'rgba(255,59,31,0.3)' : 'rgba(255,110,0,0.25)'}`
            : `0 6px 20px ${trendColor === 'green' ? 'rgba(64,255,159,0.15)' : trendColor === 'red' ? 'rgba(255,59,31,0.15)' : 'rgba(255,90,0,0.15)'}, inset 0 0 8px ${trendColor === 'green' ? 'rgba(64,255,159,0.08)' : trendColor === 'red' ? 'rgba(255,59,31,0.08)' : 'rgba(255,140,0,0.08)'}`,
        }}
        className={`ember-card ${getColorClasses()} p-6 transition-all duration-300 ease-in-out overflow-hidden`}
        style={{
          filter: isHovered && mode === 'ai' ? 'blur(0.5px)' : 'none',
        }}
      >
        {/* Animated glow pulse */}
        {isHovered && mode === 'ai' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.3, scale: 1.2 }}
            transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
            className={`absolute inset-0 bg-gradient-to-r ${
              trendColor === 'green' ? 'from-[var(--lime-glow)]' : 
              trendColor === 'red' ? 'from-[var(--lava-red)]' : 
              'from-[var(--amber-core)]'
            }/20 blur-2xl`}
          />
        )}

        {/* Sparkline mini-chart */}
        {sparklineData.length > 0 && (
          <div className="absolute top-4 right-4 w-24 h-12 opacity-50 group-hover:opacity-90 transition-all duration-300">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData.map((s, i) => ({ value: s.value, index: i }))}>
                <defs>
                  <linearGradient id={`gradient-${label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={trendColor === 'green' ? '#40ff9f' : trendColor === 'red' ? '#ff3b1f' : '#ff7a00'} stopOpacity={0.6} />
                    <stop offset="100%" stopColor={trendColor === 'green' ? '#40ff9f' : trendColor === 'red' ? '#ff3b1f' : '#ff7a00'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={trendColor === 'green' ? '#40ff9f' : trendColor === 'red' ? '#ff3b1f' : '#ff7a00'}
                  strokeWidth={2}
                  fill={`url(#gradient-${label})`}
                  isAnimationActive={mode === 'ai'}
                  style={{ filter: `drop-shadow(0px 0px 3px ${trendColor === 'green' ? 'rgba(64,255,159,0.5)' : trendColor === 'red' ? 'rgba(255,59,31,0.5)' : 'rgba(255,122,0,0.5)'})` }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
              {label}
            </span>
            {change !== undefined && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`text-xs font-bold px-2 py-0.5 rounded ${
                  change >= 0 ? 'badge-success bg-[var(--lime-glow)]/20' : 'badge-danger bg-[var(--lava-red)]/20'
                }`}
              >
                {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
              </motion.span>
            )}
          </div>

          <motion.div
            key={value}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className={`text-4xl font-extrabold mb-2 ${
              trendColor === 'green' ? 'badge-success' :
              trendColor === 'red' ? 'badge-danger' :
              'kpi-number'
            } drop-shadow-lg`}
          >
            {loading ? (
              <span className="inline-block w-32 h-10 bg-slate-700/50 rounded animate-pulse" />
            ) : (
              <span className="tabular-nums">{formattedValue}</span>
            )}
          </motion.div>

          {/* Tooltip - positioned above card */}
          {tooltip && isHovered && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 12px)',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(20,10,5,0.98)',
                border: '1px solid rgba(255,140,0,0.5)',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 8px 30px rgba(0,0,0,.5), 0 0 20px rgba(255,140,0,0.2)',
                color: 'var(--text-main)',
                zIndex: 1000,
                minWidth: '240px',
                pointerEvents: 'none',
              }}
              className="text-sm"
            >
              {/* Arrow pointer */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '-8px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderTop: '8px solid rgba(20,10,5,0.98)',
                }}
              />
              <div className="font-bold mb-2 text-base" style={{ color: 'var(--amber-glow)', textShadow: '0 0 6px rgba(255,179,71,0.4)' }}>
                {label} {percent ? '(Percentage)' : label.includes('ARR') ? '(Annual Recurring Revenue)' : label.includes('MRR') ? '(Monthly Recurring Revenue)' : ''}
              </div>
              <div className="text-xs mb-2" style={{ color: 'var(--text-dim)' }}>
                {tooltip}
              </div>
              {change !== undefined && (
                <div className="text-xs pt-2 border-t" style={{ borderColor: 'rgba(255,140,0,0.2)' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Growth: </span>
                  <span className={change >= 0 ? 'badge-success' : 'badge-danger'}>
                    {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
    </MotionWrapper>
  );
}

