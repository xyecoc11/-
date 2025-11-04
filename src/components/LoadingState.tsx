export default function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="rounded-md border border-neutral-800 bg-neutral-900 p-3 text-neutral-400 animate-pulse">
      {label}...
    </div>
  );
}
