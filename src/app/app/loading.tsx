export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="h-14 w-64 animate-pulse rounded-2xl bg-mist" />
      <div className="h-5 w-96 max-w-full animate-pulse rounded-full bg-mist" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-56 animate-pulse rounded-vial bg-mist" />
        <div className="h-56 animate-pulse rounded-vial bg-mist" />
      </div>
    </div>
  );
}
