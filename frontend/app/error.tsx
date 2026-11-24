'use client';
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return <div role="alert" className="p-8 text-center"><h1 className="mb-4 text-xl font-semibold">Không thể tải trang</h1><p className="mb-4 text-slate-400">Vui lòng thử lại.</p><button onClick={reset} className="rounded-lg bg-sky-600 px-4 py-2">Thử lại</button></div>;
}
