'use client';
import ProductImage from '@/components/ProductImage';

import Link from 'next/link';
import { useCart } from '@/components/CartProvider';
import AccountGate from '@/components/AccountGate';

const money = (value: number) => value.toLocaleString('vi-VN') + ' ₫';

function CartContents() {
  const { cart, loading, busy, error, reload, update, remove, clear } = useCart();
  const invalid = cart.items.some(item => !item.product || item.quantity > item.product.stock);
  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Giỏ hàng</h1>
        <button disabled={busy || loading} onClick={() => reload().catch(() => {})} className="text-sm text-sky-300">Tải lại</button>
      </div>
      {error && <p role="alert" className="text-rose-300">{error}</p>}
      {loading ? <p role="status">Đang tải giỏ hàng…</p> : !cart.items.length ? (
        <div className="space-y-4 rounded-xl border border-slate-800 p-8 text-center">
          <p>Giỏ hàng đang trống.</p><Link href="/products" className="text-sky-300 underline">Chọn linh kiện</Link>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900 px-4">
            {cart.items.map(({ sku, quantity, product }) => (
              <li key={sku} className="flex flex-wrap items-center justify-between gap-4 py-5">
                <div className="flex min-w-0 items-center gap-3">
                  {product?.images[0] && <ProductImage src={product.images[0]} alt="" className="h-16 w-16 rounded-lg bg-white object-contain" />}
                  <div><p className="font-semibold">{product?.name ?? sku}</p>
                    <p className="text-sm text-slate-400">{product ? money(product.price) : 'Sản phẩm đã ngừng bán'}</p>
                    {product && quantity > product.stock && <p className="text-sm text-rose-300">Chỉ còn {product.stock} sản phẩm trong kho.</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button aria-label={'Giảm số lượng ' + sku} disabled={busy || quantity <= 1}
                    onClick={() => update(sku, quantity - 1).catch(() => {})} className="rounded border border-slate-700 px-3 py-1 disabled:opacity-40">−</button>
                  <span aria-label="Số lượng">{quantity}</span>
                  <button aria-label={'Tăng số lượng ' + sku} disabled={busy || !product || quantity >= product.stock || quantity >= 999}
                    onClick={() => update(sku, quantity + 1).catch(() => {})} className="rounded border border-slate-700 px-3 py-1 disabled:opacity-40">+</button>
                  <button disabled={busy} onClick={() => remove(sku).catch(() => {})} className="text-sm text-rose-300">Xóa</button>
                </div>
                <p className="font-semibold text-sky-300">{product ? money(product.price * quantity) : '—'}</p>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <button disabled={busy} onClick={() => clear().catch(() => {})} className="text-sm text-rose-300">Xóa toàn bộ giỏ hàng</button>
            <p className="text-lg font-bold">Tạm tính {money(cart.total_amount)}</p>
          </div>
          {invalid && <p role="alert" className="text-rose-300">Vui lòng điều chỉnh linh kiện thiếu hàng trước khi thanh toán.</p>}
          {!invalid && !busy && !error && <Link href="/checkout" className="inline-block rounded-lg bg-sky-600 px-5 py-3 font-semibold hover:bg-sky-500">Tiến hành thanh toán</Link>}
        </>
      )}
    </div>
  );
}

export default function CartPage() {
  return <AccountGate><CartContents /></AccountGate>;
}
