export default function ChartCard({ children }: { children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 h-64">
      {children}
    </div>
  );
}
