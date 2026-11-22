'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { Layers, X } from 'lucide-react';
import { getCategories, type Category } from '@/lib/api';

export default function CategorySidebar({ onNavigate }: { onNavigate: () => void }) {
  const panel = useRef<HTMLDialogElement>(null);
  const [categories, setCategories] = useState<Category[]>();
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (loading || categories) return;
    setLoading(true);
    setError(false);
    try {
      setCategories(await getCategories());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  function open() {
    panel.current?.showModal();
    void load();
  }

  function chooseCategory() {
    panel.current?.close();
    onNavigate();
  }

  return (
    <>
      <button type="button" onClick={open} aria-haspopup="dialog"
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-slate-800">
        <Layers size={16} /> Danh mục
      </button>
      <dialog ref={panel} aria-labelledby="category-sidebar-title"
        className="fixed inset-y-0 left-0 right-auto m-0 h-full max-h-none w-80 max-w-[90vw] bg-slate-900 p-5 text-slate-100 backdrop:bg-black/70">
        <div className="mb-5 flex items-center justify-between gap-2">
          <h2 id="category-sidebar-title" className="text-lg font-bold">Danh mục linh kiện</h2>
          <button type="button" onClick={() => panel.current?.close()} aria-label="Đóng danh mục"
            className="rounded-lg p-2 hover:bg-slate-800"><X size={20} /></button>
        </div>
        {loading && <p className="mb-4 text-sm text-slate-400" role="status">Đang tải danh mục…</p>}
        {error && (
          <div className="mb-4 text-sm">
            <p role="alert" className="text-rose-300">Không thể tải danh mục.</p>
            <button type="button" onClick={load} className="mt-2 text-sky-300 hover:underline">Thử lại</button>
          </div>
        )}
        <nav aria-label="Danh sách danh mục" className="space-y-1">
          <Link href="/products" onClick={chooseCategory}
            className="block rounded-lg px-3 py-2 font-medium hover:bg-slate-800">Tất cả linh kiện</Link>
          {categories?.map(category => (
            <Link key={category.id} href={'/products?category_id=' + encodeURIComponent(category.id)}
              onClick={chooseCategory} className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 hover:bg-slate-800">
              {category.name}
              {category.count !== undefined && <span className="text-xs text-slate-400">{category.count}</span>}
            </Link>
          ))}
        </nav>
      </dialog>
    </>
  );
}
