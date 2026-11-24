'use client';
import { useEffect } from 'react';
export default function AdminFeedback({ error, notice, clear }: { error: string; notice: string; clear: () => void }) {
  useEffect(() => { if (!notice) return; const timer = setTimeout(clear, 4000); return () => clearTimeout(timer); }, [notice, clear]);
  return <>{error && <p role="alert" className="my-4 rounded-lg border border-rose-800 p-4 text-rose-300">{error}</p>}{notice && <p role="status" className="fixed bottom-5 right-5 z-50 rounded-xl border border-emerald-700 bg-slate-900 p-4 text-emerald-300">{notice}</p>}</>;
}
