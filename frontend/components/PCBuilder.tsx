'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { checkPCCompatibility, getProducts, getSharedBuild, savePCBuild, type CompatibilityResponse, type Product, type Selection } from '@/lib/api';
import { useCart } from '@/components/CartProvider';
import { useSession } from '@/components/SessionProvider';
import CompatibilityBanner from '@/components/CompatibilityBanner';

const slots = [
  ['cpu', 'LSP01', 'CPU'], ['mainboard', 'LSP02', 'Mainboard'], ['ram', 'LSP03', 'RAM'],
  ['gpu', 'LSP05', 'Card đồ họa'], ['storage', 'LSP04', 'Ổ cứng SSD / HDD'], ['psu', 'LSP06', 'Nguồn PSU'],
  ['case', 'LSP07', 'Vỏ case'], ['cooler', 'LSP08', 'Tản nhiệt CPU'],
] as const;
const money = (price: number) => price.toLocaleString('vi-VN') + ' ₫';

export default function PCBuilder({ shareCode }: { shareCode: string }) {
  const { user } = useSession();
  const cart = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [title, setTitle] = useState('Cấu hình PC của tôi');
  const [result, setResult] = useState<CompatibilityResponse | null>(null);
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [retry, setRetry] = useState(0);
  const locked = useRef(false);

  useEffect(() => {
    const request = new AbortController();
    setLoading(true); setError(''); setReady(false);
    async function load() {
      try {
        const first = await getProducts({ limit: 100 }, request.signal);
        const all = [...first.items];
        for (let skip = 100; skip < first.total; skip += 100) {
          const page = await getProducts({ limit: 100, skip }, request.signal);
          all.push(...page.items);
        }
        let chosen: Record<string, string> = {};
        let name = 'Cấu hình PC của tôi';
        if (shareCode) {
          const shared = await getSharedBuild(shareCode, request.signal);
          chosen = Object.fromEntries(Object.entries(shared.components).map(([key, product]) => [key, product.sku]));
          name = shared.title;
        } else {
          try {
            const stored = JSON.parse(sessionStorage.getItem('pc-builder-draft') || '{}');
            chosen = Object.fromEntries(slots.map(([key]) => [key,
              typeof stored.selection?.[key] === 'string' ? stored.selection[key] : ''
            ]));
            name = typeof stored.title === 'string' ? stored.title : name;
          } catch {}
        }
        if (!request.signal.aborted) {
          setProducts(all); setSelection(chosen); setTitle(name); setReady(true);
        }
      } catch (err) { if (!request.signal.aborted) setError((err as Error).message); }
      finally { if (!request.signal.aborted) setLoading(false); }
    }
    void load();
    return () => request.abort();
  }, [shareCode, retry]);

  useEffect(() => {
    if (!ready) return;
    try { sessionStorage.setItem('pc-builder-draft', JSON.stringify({ selection, title })); } catch {}
  }, [selection, title, ready]);

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    setResult(null); setChecking(true); setError('');
    const payload: Selection = Object.fromEntries(Object.entries(selection).filter(([, sku]) => sku).map(([slot, sku]) => [slot + '_sku', sku]));
    checkPCCompatibility(payload, controller.signal)
      .then(data => { if (!controller.signal.aborted) setResult(data); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => controller.abort();
  }, [selection, ready]);

  function select(slot: string, sku: string) {
    setResult(null); setChecking(true);
    setSelection(current => ({ ...current, [slot]: sku }));
    setShareUrl(''); setCopied(false); setActionError('');
  }

  async function save() {
    if (locked.current) return;
    locked.current = true; setSaving(true); setActionError('');
    try {
      setCopied(false);
      const saved = await savePCBuild({ title, components: Object.fromEntries(Object.entries(selection).filter(([, sku]) => sku)) });
      setShareUrl(window.location.origin + '/build-pc?share=' + encodeURIComponent(saved.build_code));
    } catch (err) { setActionError((err as Error).message); }
    finally { locked.current = false; setSaving(false); }
  }
  async function addAll() {
    setActionError('');
    try {
      await cart.add(Object.values(selection).filter(Boolean).map(sku => ({ sku, quantity: 1 })));
    } catch (err) { setActionError((err as Error).message); }
  }

  const chosen = Object.values(selection).filter(Boolean);
  const total = Object.entries(selection).reduce((sum, [, sku]) => sum + (products.find(p => p.sku === sku)?.price ?? 0), 0);
  const outOfStock = chosen.some(sku => !products.some(p => p.sku === sku && p.stock > 0));

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-8">
      <div className="flex flex-wrap justify-between gap-3"><h1 className="text-3xl font-bold">Build PC</h1>
        <button onClick={() => { setResult(null); setChecking(true); setSelection({}); setShareUrl(''); }} className="text-sm text-slate-400 hover:text-white">Đặt lại cấu hình</button>
      </div>
      {shareCode && <p className="text-sm text-sky-300">Đang xem cấu hình chia sẻ. Giá và tồn kho được cập nhật theo danh mục hiện tại.</p>}
      {loading && <p role="status">Đang tải linh kiện…</p>}
      {error && <p role="alert" className="text-rose-300">{error} <button onClick={() => setRetry(retry + 1)} className="underline">Thử lại</button></p>}
      {ready && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {slots.map(([slot, category, label]) => {
              const product = products.find(item => item.sku === selection[slot]);
              return (
                <div key={slot} className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <label className="block space-y-2"><span className="font-semibold">{label}</span>
                    <select value={selection[slot] ?? ''} onChange={e => select(slot, e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                      <option value="">Chọn {label}</option>
                      {selection[slot] && !product && <option value={selection[slot]}>{selection[slot]} · Đã ngừng bán</option>}
                      {products.filter(item => item.category.id === category).map(item => <option key={item.sku} value={item.sku}>{item.name} · {money(item.price)}{item.stock ? '' : ' · Hết hàng'}</option>)}
                    </select>
                  </label>
                  {product && <div className="flex items-center gap-3">
                    {product.images[0] && <img src={product.images[0]} alt="" className="h-14 w-14 rounded bg-white object-contain" />}
                    <div className="text-xs text-slate-400">
                      <p>{[product.specs.socket, product.specs.ram_type, product.specs.capacity_gb && product.specs.capacity_gb + ' GB'].filter(Boolean).join(' · ')}</p>
                      <p>{product.stock ? 'Còn ' + product.stock + ' sản phẩm' : 'Hết hàng'}</p>
                    </div>
                  </div>}
                </div>
              );
            })}
          </div>
          <CompatibilityBanner data={result} loading={checking} />
          <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xl font-bold">Tổng chi phí {money(total)}</p>
            {actionError && <p role="alert" className="text-rose-300">{actionError}</p>}
            {!user && <p className="text-sm"><Link href="/login" className="text-sky-300 underline">Đăng nhập</Link> để lưu cấu hình hoặc thêm vào giỏ hàng.</p>}
            <div className="flex flex-wrap gap-3">
              <button disabled={!user || !chosen.length || !result?.is_compatible || checking || cart.busy || outOfStock}
                onClick={addAll} className="rounded-lg bg-sky-600 px-4 py-3 font-semibold disabled:opacity-40">Thêm toàn bộ cấu hình vào giỏ hàng</button>
              <Link href="/cart" className="rounded-lg border border-slate-700 px-4 py-3">Xem giỏ hàng</Link>
            </div>
            {outOfStock && <p className="text-sm text-rose-300">Có linh kiện hết hàng hoặc đã ngừng bán.</p>}
            <div className="flex flex-wrap gap-3">
              <input aria-label="Tên cấu hình" value={title} onChange={e => { setTitle(e.target.value); setShareUrl(''); }} maxLength={100}
                className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
              <button disabled={!user || saving || !chosen.length || !title.trim() || checking || !result}
                onClick={save} className="rounded-lg border border-sky-700 px-4 py-2 text-sky-300 disabled:opacity-40">{saving ? 'Đang lưu…' : 'Lưu và chia sẻ'}</button>
            </div>
            {shareUrl && <div className="flex flex-wrap items-center gap-3 text-sm">
              <Link href={shareUrl} className="break-all text-sky-300 underline">{shareUrl}</Link>
              <button onClick={async () => { try { await navigator.clipboard.writeText(shareUrl); setCopied(true); } catch { setActionError('Hãy sao chép liên kết phía trên.'); } }}>{copied ? 'Đã sao chép' : 'Sao chép liên kết'}</button>
            </div>}
          </div>
        </>
      )}
    </div>
  );
}
