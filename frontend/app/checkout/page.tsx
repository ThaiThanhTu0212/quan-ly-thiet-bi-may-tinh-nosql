'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError, createOrder, getLocations, type CheckoutRequest, type Province } from '@/lib/api';
import { useSession } from '@/components/SessionProvider';
import { useCart } from '@/components/CartProvider';
import AccountGate from '@/components/AccountGate';

const field = 'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white';

function Checkout() {
  const router = useRouter();
  const { user } = useSession();
  const { cart, loading, busy, error: cartError, reload } = useCart();
  const [locations, setLocations] = useState<Province[]>([]);
  const [provinceId, setProvinceId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [wardId, setWardId] = useState('');
  const [error, setError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [locationLoading, setLocationLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [recoverable, setRecoverable] = useState(false);
  const locked = useRef(false);
  const attempt = useRef<CheckoutRequest | null>(null);
  const province = locations.find(item => item.province_id === provinceId);
  const district = province?.districts.find(item => item.district_id === districtId);
  const ward = district?.wards.find(item => item.ward_id === wardId);

  useEffect(() => {
    const request = new AbortController();
    setLocationLoading(true); setLocationError('');
    getLocations(request.signal).then(data => { if (!request.signal.aborted) setLocations(data); })
      .catch(err => { if (!request.signal.aborted) setLocationError(err.message); })
      .finally(() => { if (!request.signal.aborted) setLocationLoading(false); });
    return () => request.abort();
  }, [retry]);

  // Keep the same request identifier after a network failure, including a page reload.
  useEffect(() => {
    const key = 'checkout-attempt-' + user?.id;
    try {
      const saved = sessionStorage.getItem(key);
      if (saved) { attempt.current = JSON.parse(saved); setRecoverable(true); }
    } catch { /* A fresh request can still be submitted when browser storage is unavailable. */ }
  }, [user?.id]);

  async function send(payload: CheckoutRequest) {
    if (locked.current) return;
    locked.current = true; setSubmitting(true); setError('');
    try {
      const order = await createOrder(payload);
      attempt.current = null;
      setRecoverable(false);
      try { sessionStorage.removeItem('checkout-attempt-' + user?.id); } catch {}
      await reload().catch(() => {});
      router.replace('/account/orders?placed=' + encodeURIComponent(order.order_code));
    } catch (err) {
      setError((err as Error).message);
      // A rejected checkout did not commit; let the customer correct and resubmit it.
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        attempt.current = null;
        setRecoverable(false);
        try { sessionStorage.removeItem('checkout-attempt-' + user?.id); } catch {}
      }
    } finally { locked.current = false; setSubmitting(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!province || !district || !ward) { setError('Vui lòng chọn đầy đủ tỉnh, huyện và xã.'); return; }
    const data = new FormData(event.currentTarget);
    const draft = {
      shipping_address: {
        full_name: String(data.get('full_name')).trim(), phone: String(data.get('phone')).trim(),
        street: String(data.get('street')).trim(), province: province.province_name,
        district: district.district_name, ward: ward.ward_name,
      },
      items: cart.items.map(({ sku, quantity }) => ({ sku, quantity })),
      payment_method: String(data.get('payment_method')) as CheckoutRequest['payment_method'],
      expected_total: cart.total_amount,
    };
    // Reuse the identifier when the same checkout is retried.
    const previous = attempt.current;
    const payload = previous && JSON.stringify({ ...previous, request_id: undefined }) === JSON.stringify(draft)
      ? previous : { ...draft, request_id: crypto.randomUUID() };
    attempt.current = payload;
    setRecoverable(true);
    try { sessionStorage.setItem('checkout-attempt-' + user?.id, JSON.stringify(payload)); } catch {}
    void send(payload);
  }

  const unavailable = cart.items.some(item => !item.product || item.quantity > item.product.stock);
  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-8">
      <h1 className="text-3xl font-bold">Thanh toán</h1>
      {error && <div role="alert" className="space-y-3 rounded-lg border border-rose-800 p-4 text-rose-300">
        <p>{error}</p>
        {attempt.current && <button disabled={submitting} type="button" onClick={() => send(attempt.current!)} className="mr-4 underline">Thử lại yêu cầu đặt hàng</button>}
        <button disabled={submitting} type="button" onClick={() => reload().catch(() => {})} className="underline">Tải lại giỏ hàng</button>
      </div>}
      {cartError && <p role="alert" className="text-rose-300">{cartError}</p>}
      {loading ? <p role="status">Đang tải giỏ hàng…</p> : !cart.items.length ? (
        <div className="space-y-3">
          <p>Giỏ hàng đang trống.</p>
          {recoverable && attempt.current && <button disabled={submitting} onClick={() => send(attempt.current!)} className="text-sky-300 underline">Kiểm tra đơn hàng vừa gửi</button>}
          <Link href="/products" className="block text-sky-300 underline">Chọn linh kiện</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="grid gap-6 md:grid-cols-2">
          <fieldset disabled={submitting} className="space-y-4">
            <legend className="mb-3 text-lg font-semibold">Thông tin giao hàng</legend>
            <label className="block space-y-1 text-sm"><span>Họ tên người nhận</span><input name="full_name" autoComplete="name" defaultValue={user?.full_name} required maxLength={100} className={field} /></label>
            <label className="block space-y-1 text-sm"><span>Số điện thoại</span><input name="phone" type="tel" autoComplete="tel" required minLength={9} maxLength={20} className={field} /></label>
            <p className="text-sm text-slate-400">Email đơn hàng {user?.email}</p>
            {locationLoading && <p role="status">Đang tải địa chỉ…</p>}
            {locationError && <p role="alert" className="text-rose-300">{locationError} <button type="button" onClick={() => setRetry(retry + 1)} className="underline">Thử lại</button></p>}
            <label className="block space-y-1 text-sm"><span>Tỉnh / Thành phố</span>
              <select required value={provinceId} onChange={e => { setProvinceId(e.target.value); setDistrictId(''); setWardId(''); }} className={field}>
                <option value="">Chọn tỉnh / thành phố</option>{locations.map(item => <option key={item.province_id} value={item.province_id}>{item.province_name}</option>)}
              </select>
            </label>
            <label className="block space-y-1 text-sm"><span>Quận / Huyện</span>
              <select required disabled={!province} value={districtId} onChange={e => { setDistrictId(e.target.value); setWardId(''); }} className={field}>
                <option value="">Chọn quận / huyện</option>{province?.districts.map(item => <option key={item.district_id} value={item.district_id}>{item.district_name}</option>)}
              </select>
            </label>
            <label className="block space-y-1 text-sm"><span>Phường / Xã</span>
              <select required disabled={!district} value={wardId} onChange={e => setWardId(e.target.value)} className={field}>
                <option value="">Chọn phường / xã</option>{district?.wards.map(item => <option key={item.ward_id} value={item.ward_id}>{item.ward_name}</option>)}
              </select>
            </label>
            <label className="block space-y-1 text-sm"><span>Số nhà, tên đường</span><input name="street" autoComplete="street-address" required maxLength={250} className={field} /></label>
          </fieldset>
          <div className="h-fit space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold">Đơn hàng của bạn</h2>
            {cart.items.map(item => <p key={item.sku} className="text-sm">{item.product?.name ?? item.sku} × {item.quantity}</p>)}
            <p className="border-t border-slate-800 pt-4 text-lg font-bold">Tổng cộng {cart.total_amount.toLocaleString('vi-VN')} ₫</p>
            <label className="block space-y-1 text-sm"><span>Phương thức thanh toán</span>
              <select name="payment_method" disabled={submitting} className={field}><option value="COD">Thanh toán khi nhận hàng</option><option value="Chuyển khoản">Chuyển khoản</option></select>
            </label>
            <p className="text-sm text-slate-400">Cửa hàng sẽ xác nhận đơn và hướng dẫn chuyển khoản nếu bạn chọn phương thức này.</p>
            {unavailable && <p role="alert" className="text-rose-300">Có linh kiện không đủ hàng. Vui lòng điều chỉnh giỏ hàng.</p>}
            <button disabled={submitting || busy || unavailable || !!cartError || locationLoading || !!locationError || !ward}
              className="w-full rounded-lg bg-sky-600 py-3 font-semibold disabled:opacity-40">{submitting ? 'Đang đặt hàng…' : 'Xác nhận đặt hàng'}</button>
            <Link href="/cart" className="block text-center text-sm text-sky-300">Quay lại giỏ hàng</Link>
          </div>
        </form>
      )}
    </div>
  );
}

export default function CheckoutPage() { return <AccountGate><Checkout /></AccountGate>; }
