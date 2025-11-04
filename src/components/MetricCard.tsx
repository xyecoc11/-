export default function MetricCard({
  label,
  value,
  percent,
  loading,
  trendColor,
}: {
  label: string;
  value: number;
  percent?: boolean;
  loading?: boolean;
  trendColor?: 'green' | 'red';
}) {
  const display = percent ? `${(value * 100).toFixed(1)}%` : `$${(value / 100).toFixed(2)}`;
  const valueClass = trendColor ? (trendColor === 'green' ? 'text-green-400' : 'text-red-400') : '';
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="text-sm text-neutral-400">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${valueClass}`}>
        {loading ? <span className="animate-pulse text-neutral-600">•••</span> : display}
      </div>
    </div>
  );
}
