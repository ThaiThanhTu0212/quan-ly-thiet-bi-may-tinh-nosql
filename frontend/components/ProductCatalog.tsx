'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import { getProducts, type ProductListResponse } from '@/lib/api';

const PAGE_SIZE = 9;
const FILTERS = { category_id: '', brand_id: '', q: '', socket: '', ram_type: '', vram_min: '', capacity_min: '', min_price: '', max_price: '' };
const fieldClass = 'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white';
const actionClass = 'rounded-lg border border-slate-700 px-3 py-2 hover:bg-slate-800 disabled:opacity-40';
const specFields = [
  { field: 'socket', key: 'socket', label: 'Socket' },
  { field: 'ram_type', key: 'ram_type', label: 'Chuẩn RAM' },
  { field: 'vram_min', key: 'vram_gb', label: 'VRAM tối thiểu (GB)' },
  { field: 'capacity_min', key: 'capacity_gb', label: 'Dung lượng tối thiểu (GB)' },
] as const;

export default function ProductCatalog({ initialCategory }: { initialCategory: string }) {
  const [draft, setDraft] = useState({ ...FILTERS, category_id: initialCategory });
  const [filters, setFilters] = useState(draft);
  const [sort, setSort] = useState('relevance');
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<ProductListResponse>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    getProducts({ ...filters, sort, limit: PAGE_SIZE, skip: page * PAGE_SIZE }, controller.signal)
      .then(data => { if (!controller.signal.aborted) setResult(data); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filters, sort, page, retry]);

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.min_price && draft.max_price && Number(draft.min_price) > Number(draft.max_price)) {
      setFormError('Giá từ phải nhỏ hơn hoặc bằng giá đến.');
      return;
    }
    setFormError('');
    setPage(0);
    setFilters({ ...draft, q: draft.q.trim() });
  }

  function chooseCategory(category_id: string) {
    const specs = { socket: '', ram_type: '', vram_min: '', capacity_min: '' };
    setFormError('');
    setPage(0);
    setDraft({ ...draft, ...specs, category_id });
    setFilters({ ...filters, ...specs, category_id });
  }

  function reset() {
    setDraft(FILTERS);
    setFilters({ ...FILTERS });
    setSort('relevance');
    setPage(0);
    setFormError('');
  }

  const pages = Math.ceil((result?.total ?? 0) / PAGE_SIZE);

  return (
    <form onSubmit={apply} className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-bold text-white">Linh kiện PC</h1>
        <div className="flex w-full gap-2 sm:w-auto">
          <input aria-label="Tìm linh kiện" placeholder="Tìm theo tên hoặc hãng" value={draft.q}
            onChange={e => setDraft({ ...draft, q: e.target.value })} maxLength={120} className={fieldClass} />
          <button type="submit" aria-label="Tìm kiếm" className={actionClass}><Search size={18} /></button>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <aside aria-label="Danh mục và bộ lọc" className="h-fit space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-semibold"><SlidersHorizontal size={16} /> Bộ lọc</h2>
            <button type="button" onClick={reset} className="text-sm text-sky-300 hover:underline">Đặt lại</button>
          </div>
          <label className="block space-y-1 text-sm"><span>Danh mục</span>
            <select value={draft.category_id} onChange={e => chooseCategory(e.target.value)} className={fieldClass}>
              <option value="">Tất cả danh mục</option>
              {result?.categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label className="block space-y-1 text-sm"><span>Thương hiệu</span>
            <select value={draft.brand_id} onChange={e => setDraft({ ...draft, brand_id: e.target.value })} className={fieldClass}>
              <option value="">Tất cả thương hiệu</option>
              {result?.brands.map(brand => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
            </select>
          </label>
          {specFields.map(({ field, key, label }) => {
            const options = result?.spec_options?.[key] ?? [];
            if (!options.length) return null;
            return (
              <label key={field} className="block space-y-1 text-sm"><span>{label}</span>
                <select value={draft[field]} onChange={e => setDraft({ ...draft, [field]: e.target.value })} className={fieldClass}>
                  <option value="">Tất cả</option>
                  {options.map(value => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
            );
          })}
          <fieldset className="grid grid-cols-2 gap-2">
            <legend className="mb-1 text-sm">Khoảng giá (₫)</legend>
            <input aria-label="Giá từ" placeholder="Từ" type="number" min={0} className={fieldClass}
              value={draft.min_price} onChange={e => setDraft({ ...draft, min_price: e.target.value })} />
            <input aria-label="Giá đến" placeholder="Đến" type="number" min={0} className={fieldClass}
              value={draft.max_price} onChange={e => setDraft({ ...draft, max_price: e.target.value })} />
          </fieldset>
          {formError && <p role="alert" className="text-sm text-rose-300">{formError}</p>}
          <button type="submit" className="w-full rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold hover:bg-sky-500">Áp dụng bộ lọc</button>
        </aside>
        <section aria-label="Kết quả tìm kiếm" aria-busy={loading} className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <p role="status" className="text-slate-400">{loading ? 'Đang tải linh kiện…' : error ? '' : `${result?.total ?? 0} linh kiện`}</p>
            <label className="flex items-center gap-2">Sắp xếp
              <select value={sort} onChange={e => { setPage(0); setSort(e.target.value); }} className={fieldClass}>
                <option value="relevance">Phù hợp nhất</option>
                <option value="newest">Mới nhất</option>
                <option value="price_asc">Giá tăng dần</option>
                <option value="price_desc">Giá giảm dần</option>
                <option value="name">Theo tên</option>
              </select>
            </label>
          </div>
          {error ? (
            <div className="rounded-xl border border-slate-800 p-6">
              <p role="alert" className="mb-3 text-rose-300">{error}</p>
              <button type="button" className={actionClass} onClick={() => setRetry(retry + 1)}>Thử lại</button>
            </div>
          ) : loading ? (
            <div aria-hidden className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-64 animate-pulse rounded-xl bg-slate-900" />)}
            </div>
          ) : !result?.items.length ? (
            <p className="rounded-xl border border-slate-800 p-8 text-center text-slate-400">Không tìm thấy linh kiện phù hợp.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {result.items.map(product => <ProductCard key={product.sku} product={product} />)}
            </div>
          )}
          {!error && !loading && pages > 1 && (
            <nav aria-label="Phân trang linh kiện" className="flex items-center justify-center gap-3">
              <button type="button" aria-label="Trang trước" disabled={page === 0} className={actionClass} onClick={() => setPage(page - 1)}><ChevronLeft size={18} /></button>
              <span className="text-sm">Trang {page + 1} / {pages}</span>
              <button type="button" aria-label="Trang sau" disabled={page >= pages - 1} className={actionClass} onClick={() => setPage(page + 1)}><ChevronRight size={18} /></button>
            </nav>
          )}
        </section>
      </div>
    </form>
  );
}
