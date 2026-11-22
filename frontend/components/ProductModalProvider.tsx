'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { getProductBySku, type Product } from '@/lib/api';

const ProductModalContext = createContext<(sku: string) => void>(() => {});

export function useProductModal() {
  return useContext(ProductModalContext);
}

export function ProductModalProvider({ children }: { children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [sku, setSku] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sku) return;
    const request = new AbortController();
    getProductBySku(sku, request.signal)
      .then(item => { if (!request.signal.aborted) setProduct(item); })
      .catch(err => { if (!request.signal.aborted) setError(err.message); });
    return () => request.abort();
  }, [sku]);

  function showProduct(nextSku: string) {
    setProduct(null);
    setError('');
    setSku(nextSku);
    if (!dialog.current?.open) dialog.current?.showModal();
  }

  return (
    <ProductModalContext.Provider value={showProduct}>
      {children}
      <dialog ref={dialog} onClose={() => setSku(null)} aria-labelledby="product-title"
        className="w-[calc(100%-2rem)] max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-100 backdrop:bg-black/70">
        <div className="flex items-start justify-between gap-4">
          <h2 id="product-title" className="text-xl font-bold">{product?.name ?? 'Chi tiết linh kiện'}</h2>
          <form method="dialog">
            <button type="submit" aria-label="Đóng chi tiết" className="rounded-lg p-2 hover:bg-slate-800"><X size={18} /></button>
          </form>
        </div>
        {error && <p role="alert" className="mt-4 text-rose-400">{error}</p>}
        {!product && !error && <p role="status" className="mt-4 text-slate-400">Đang tải chi tiết…</p>}
        {product && (
          <div className="mt-4 space-y-4">
            {product.images[0] && <img src={product.images[0]} alt={product.name} className="mx-auto h-40 object-contain" />}
            <p className="font-semibold text-sky-300">{product.price.toLocaleString('vi-VN')} ₫ · {product.stock ? `Còn ${product.stock} sản phẩm` : 'Hết hàng'}</p>
            {product.description && <p className="text-sm text-slate-300">{product.description}</p>}
            <dl className="divide-y divide-slate-800 text-sm">
              {Object.entries(product.specs).map(([key, value]) => (
                <div key={key} className="grid grid-cols-2 gap-4 py-2">
                  <dt className="text-slate-400">{key.replaceAll('_', ' ')}</dt>
                  <dd>{typeof value === 'boolean' ? (value ? 'Có' : 'Không') : Array.isArray(value) ? value.join(', ') : String(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </dialog>
    </ProductModalContext.Provider>
  );
}
