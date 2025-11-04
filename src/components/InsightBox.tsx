import type { Insight } from '@/lib/types';

export default function InsightBox({ insights }: { insights: Insight[] }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 space-y-3">
      {insights.map((i, idx) => (
        <div key={idx} className="border-l-2 pl-3" style={{ borderColor: colorFor(i.severity) }}>
          <div className="font-medium">{i.title}</div>
          <div className="text-sm text-neutral-300">{i.body}</div>
        </div>
      ))}
    </div>
  );
}

function colorFor(sev: Insight['severity']) {
  switch (sev) {
    case 'critical':
      return '#ef4444';
    case 'warn':
      return '#f59e0b';
    default:
      return '#22c55e';
  }
}
