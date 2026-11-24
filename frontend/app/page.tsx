'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Package } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import { getBestSellers, getCategories, type Category, type Product } from '@/lib/api';

export default function HomePage() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [failed, setFailed] = useState<string[]>([]);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setFailed([]);
    getCategories(controller.signal).then(setCategories).catch(() => {
      if (!controller.signal.aborted) setFailed(current => [...current, 'danh mục']);
    });
    getBestSellers(controller.signal).then(setProducts).catch(() => {
      if (!controller.signal.aborted) setFailed(current => [...current, 'linh kiện bán chạy']);
    });
    return () => controller.abort();
  }, [retry]);

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-6 sm:px-6 lg:px-8">
      <Link href="/products" className="block overflow-hidden rounded-2xl border border-slate-800"
        aria-label="Xem ưu đãi linh kiện PC">
        <img src="/images/images_slide/slide1.jpg" alt="Banner khuyến mãi linh kiện PC" className="h-auto w-full" fetchPriority="high" />
      </Link>

      {!!failed.length && (
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-800 p-4 text-sm">
          <p role="alert" className="text-rose-300">Không thể tải {failed.join(' và ')}.</p>
          <button type="button" onClick={() => setRetry(retry + 1)} className="text-sky-300 hover:underline">Thử lại</button>
        </div>
      )}

      <section aria-labelledby="categories-heading" className="space-y-4">
        <h1 id="categories-heading" className="text-2xl font-bold text-white">Danh mục nổi bật</h1>
        {!categories && !failed.includes('danh mục') && <p role="status" className="text-sm text-slate-400">Đang tải danh mục…</p>}
        {categories?.length === 0 && <p className="text-sm text-slate-400">Chưa có danh mục.</p>}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {categories?.map(category => (
            <Link key={category.id} href={'/products?category_id=' + encodeURIComponent(category.id)}
              className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm font-semibold hover:border-sky-600 hover:text-sky-300">
              <Package size={18} className="shrink-0 text-sky-400" />
              {category.name}
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="bestsellers-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="bestsellers-heading" className="text-2xl font-bold text-white">Linh kiện bán chạy</h2>
          <Link href="/products" className="flex items-center gap-2 text-sm text-sky-300 hover:underline">
            Xem tất cả linh kiện <ArrowRight size={16} />
          </Link>
        </div>
        {!products && !failed.includes('linh kiện bán chạy') && <p role="status" className="text-sm text-slate-400">Đang tải linh kiện bán chạy…</p>}
        {products?.length === 0 && <p className="text-sm text-slate-400">Chưa có dữ liệu bán chạy.</p>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products?.map(product => <ProductCard key={product.sku} product={product} />)}
        </div>
      </section>
    </div>
  );
}
