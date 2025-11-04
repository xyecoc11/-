import type { CohortRow } from '@/lib/types';

export default function RetentionHeatmap({ cohorts = [] }: { cohorts: CohortRow[] }) {
  // 6x6 grid: row = cohortMonth, col = retention month
  return (
    <div className="overflow-auto">
      <table className="min-w-max w-full table-fixed text-center text-xs">
        <thead>
          <tr>
            <th className="p-1 text-neutral-400 bg-neutral-900 sticky left-0">Cohort</th>
            {[...Array(6)].map((_, i) => <th key={i} className="p-1 text-neutral-400">m{i+1}</th>)}
          </tr>
        </thead>
        <tbody>
          {cohorts.map(row => (
            <tr key={row.cohortMonth}>
              <td className="font-mono bg-neutral-950 sticky left-0">{row.cohortMonth}</td>
              {row.cells.map(cell => (
                <td key={cell.monthIndex}
                  className="rounded bg-sky-900/30 border border-neutral-800"
                  style={{background: `rgba(56,189,248,${cell.retention})`}}>
                  {(cell.retention * 100).toFixed(0)}%
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
