'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useSession } from '@/components/SessionProvider';
import { getCart, addCartItems, setCartQuantity, removeCartItem, clearCart, type Cart } from '@/lib/api';

const empty: Cart = { items: [], total_amount: 0 };
interface CartContextValue {
  cart: Cart; loading: boolean; busy: boolean; error: string; notice: string;
  reload: () => Promise<void>;
  add: (items: { sku: string; quantity: number }[]) => Promise<void>;
  update: (sku: string, quantity: number) => Promise<void>;
  remove: (sku: string) => Promise<void>; clear: () => Promise<void>;
}
const Context = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, pending } = useSession();
  const [cart, setCart] = useState<Cart>(empty);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const owner = useRef(user?.id);
  owner.current = user?.id;
  const locked = useRef(false);

  async function reload() {
    const identity = user?.id;
    if (!identity) return;
    setLoading(true);
    try {
      const result = await getCart();
      if (owner.current === identity) { setCart(result); setError(''); }
    } catch (err) {
      if (owner.current === identity) setError((err as Error).message);
      throw err;
    } finally { if (owner.current === identity) setLoading(false); }
  }

  useEffect(() => {
    const request = new AbortController();
    setCart(empty); setError(''); setNotice('');
    if (pending || !user) { setLoading(false); return; }
    setLoading(true);
    getCart(request.signal).then(data => { if (!request.signal.aborted) setCart(data); })
      .catch(err => { if (!request.signal.aborted) setError(err.message); })
      .finally(() => { if (!request.signal.aborted) setLoading(false); });
    return () => request.abort();
  }, [user?.id, pending]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  async function mutate(action: () => Promise<Cart>, message: string) {
    if (!user) throw new Error('Vui lòng đăng nhập để sử dụng giỏ hàng.');
    if (locked.current) throw new Error('Giỏ hàng đang cập nhật. Vui lòng chờ.');
    locked.current = true; setBusy(true); setError('');
    const identity = user.id;
    try {
      const result = await action();
      if (owner.current === identity) { setCart(result); setNotice(message); }
    } catch (err) {
      if (owner.current === identity) setError((err as Error).message);
      throw err;
    } finally { locked.current = false; setBusy(false); }
  }

  return (
    <Context.Provider value={{ cart, loading, busy, error, notice, reload,
      add: items => mutate(() => addCartItems(items), 'Đã thêm linh kiện vào giỏ hàng.'),
      update: (sku, qty) => mutate(() => setCartQuantity(sku, qty), 'Đã cập nhật số lượng.'),
      remove: sku => mutate(() => removeCartItem(sku), 'Đã xóa linh kiện.'),
      clear: () => mutate(clearCart, 'Đã xóa giỏ hàng.') }}>
      {children}
      {notice && <p role="status" className="fixed bottom-5 right-5 z-50 max-w-xs rounded-xl border border-emerald-700 bg-slate-900 p-4 text-sm text-emerald-300 shadow-xl">{notice}</p>}
    </Context.Provider>
  );
}

export function useCart() {
  const context = useContext(Context);
  if (!context) throw new Error('Giỏ hàng chưa được khởi tạo.');
  return context;
}
