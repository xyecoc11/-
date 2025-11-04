export default function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-red-900 bg-red-950/40 p-3 text-red-300">
      {message}
    </div>
  );
}
