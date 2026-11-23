'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getOrders, type Order } from '@/lib/api';
import AccountGate from '@/components/AccountGate';

function History({ placed }: { placed?: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    getOrders({ status, skip: page * 10, limit: 10 }, controller.signal)
      .then(data => { if (!controller.signal.aborted) setOrders(data); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [status, page, retry]);

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Lịch sử đơn hàng</h1>
        <label className="text-sm">Trạng thái
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}
            className="ml-3 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">
            <option value="">Tất cả</option>{['Chờ xác nhận', 'Đang giao', 'Đã giao', 'Đã hủy'].map(value => <option key={value}>{value}</option>)}
          </select>
        </label>
      </div>
      {placed && <p role="status" className="rounded-lg border border-emerald-800 p-4 text-emerald-300">Đặt hàng thành công. Mã đơn {placed}.</p>}
      {error ? <div role="alert" className="text-rose-300">{error} <button onClick={() => setRetry(retry + 1)} className="underline">Thử lại</button></div>
        : loading ? <p role="status">Đang tải đơn hàng…</p>
        : !orders.length ? <p>Chưa có đơn hàng phù hợp. <Link href="/products" className="text-sky-300 underline">Xem linh kiện</Link></p>
        : orders.map(order => (
          <article key={order.order_code} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex flex-wrap justify-between gap-3">
              <div><h2 className="break-all font-semibold">{order.order_code}</h2><p className="mt-1 text-sm text-slate-400">{new Date(order.dates.created_at).toLocaleString('vi-VN')}</p></div>
              <div className="text-sm"><p className={order.status === 'Đã hủy' ? 'text-rose-300' : 'text-sky-300'}>{order.status}</p><p className="text-slate-400">{order.payment_status}</p></div>
            </div>
            <ul className="divide-y divide-slate-800">
              {order.items.map(item => <li key={item.sku} className="flex flex-wrap justify-between gap-3 py-3 text-sm">
                <span>{item.name} × {item.quantity}</span><span>{item.unit_price.toLocaleString('vi-VN')} ₫ / sản phẩm</span>
              </li>)}
            </ul>
            <p className="text-sm text-slate-300">{order.shipping_address.full_name} · {order.shipping_address.phone}</p>
            <p className="text-sm text-slate-400">{[order.shipping_address.street, order.shipping_address.ward, order.shipping_address.district, order.shipping_address.province].join(', ')}</p>
            <div className="flex flex-wrap justify-between gap-3 border-t border-slate-800 pt-4"><p className="text-sm">{order.payment_method}</p><p className="font-bold text-sky-300">{order.total_amount.toLocaleString('vi-VN')} ₫</p></div>
          </article>
        ))}
      {!loading && !error && <nav aria-label="Phân trang đơn hàng" className="flex items-center justify-center gap-4">
        <button disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded border border-slate-700 px-3 py-2 disabled:opacity-40">Trang trước</button>
        <span>Trang {page + 1}</span>
        <button disabled={orders.length < 10} onClick={() => setPage(page + 1)} className="rounded border border-slate-700 px-3 py-2 disabled:opacity-40">Trang sau</button>
      </nav>}
    </div>
  );
}

export default function OrdersPage({ searchParams }: { searchParams: { placed?: string } }) {
  return <AccountGate><History placed={searchParams.placed} /></AccountGate>;
}
