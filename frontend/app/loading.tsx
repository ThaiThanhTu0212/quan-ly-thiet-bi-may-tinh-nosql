export default function Loading() {
  return <div role="status" aria-label="Đang tải trang" className="mx-auto w-full max-w-6xl space-y-4 p-8"><div className="h-8 w-48 animate-pulse rounded bg-slate-800"/><div className="grid gap-4 sm:grid-cols-3">{[1,2,3].map(i=><div key={i} className="h-48 animate-pulse rounded-xl bg-slate-800"/>)}</div></div>;
}
