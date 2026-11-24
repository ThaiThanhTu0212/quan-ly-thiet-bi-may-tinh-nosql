'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getProductBySku, getProducts, type Product } from '@/lib/api';
import { specLabel, specValue } from '@/lib/product-specs';
import { useSession } from '@/components/SessionProvider';
import { useCart } from '@/components/CartProvider';
import ProductImage from '@/components/ProductImage';
import ProductCard from '@/components/ProductCard';
import { CompareToggle } from '@/components/ComparisonProvider';

const money = (value: number) => value.toLocaleString('vi-VN') + ' đ';
export default function ProductDetails({ sku }: { sku: string }) {
  const router = useRouter();
  const { user } = useSession();
  const cart = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [relatedError, setRelatedError] = useState('');
  const [retry, setRetry] = useState(0);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [buying, setBuying] = useState(false);
  const [actionError, setActionError] = useState('');
  const zoom = useRef<HTMLDialogElement>(null);
  const locked = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setRelatedError(''); setProduct(null); setRelated([]); setActiveImage(0); setQuantity(1);
    async function load() {
      try {
        const item = await getProductBySku(sku, controller.signal);
        if (controller.signal.aborted) return;
        setProduct(item); setLoading(false);
        try {
          const result = await getProducts({ category_id: item.category.id, limit: 5, sort: 'price_asc' }, controller.signal);
          if (!controller.signal.aborted) setRelated(result.items.filter(p => p.sku !== sku).slice(0, 4));
        } catch { if (!controller.signal.aborted) setRelatedError('Không tải được sản phẩm cùng loại.'); }
      } catch (e) { if (!controller.signal.aborted) setError((e as Error).message); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [sku, retry]);

  const inCart = cart.cart.items.find(item => item.sku === sku)?.quantity ?? 0;
  const available = product ? Math.max(0, Math.min(product.stock - inCart, 999 - inCart)) : 0;
  async function add(checkout: boolean) {
    if (locked.current || !product) return;
    if (!user) { router.push('/login'); return; }
    if (quantity < 1 || quantity > available) { setActionError('Số lượng vượt quá tồn kho hoặc giới hạn giỏ hàng.'); return; }
    locked.current = true; setBuying(true); setActionError('');
    try { await cart.add([{ sku, quantity }]); if (checkout) router.push('/checkout'); }
    catch (e) { setActionError((e as Error).message); }
    finally { locked.current = false; setBuying(false); }
  }
  return <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
    <nav aria-label="Đường dẫn" className="flex flex-wrap gap-2 text-sm text-slate-400"><Link href="/">Trang chủ</Link><span>/</span><Link href="/products">Linh kiện PC</Link>{product && <><span>/</span><Link href={'/products?category_id='+encodeURIComponent(product.category.id)}>{product.category.name}</Link></>}</nav>
    {loading ? <div role="status" aria-label="Đang tải chi tiết sản phẩm" className="grid gap-6 md:grid-cols-2"><div className="h-96 animate-pulse rounded-2xl bg-slate-800"/><div className="h-96 animate-pulse rounded-2xl bg-slate-800"/></div>
      : error ? <div role="alert" className="rounded-xl border border-rose-900 p-6"><p className="text-rose-300">{error}</p><button onClick={()=>setRetry(x=>x+1)} className="mt-4 text-sky-300 underline">Thử lại</button><Link href="/products" className="ml-5 text-sky-300">Quay lại danh sách</Link></div>
      : product && <>
        <div className="grid gap-8 lg:grid-cols-2">
          <section aria-label="Ảnh sản phẩm" className="min-w-0 space-y-4">
            <button type="button" onClick={()=>zoom.current?.showModal()} aria-label="Phóng to ảnh sản phẩm" className="flex h-80 w-full items-center justify-center rounded-2xl bg-white p-5 sm:h-[420px]">
              <ProductImage src={product.images[activeImage]} alt={product.name} className="h-full w-full object-contain" />
            </button>
            <p className="text-center text-xs text-slate-400">Nhấn vào ảnh để phóng to</p>
            <div className="flex gap-3 overflow-x-auto pb-2">{product.images.map((image,index)=><button key={image+'-'+index} type="button" aria-label={'Xem ảnh '+(index+1)} aria-pressed={activeImage===index} onClick={()=>setActiveImage(index)} className={'h-20 w-20 shrink-0 rounded-lg border-2 bg-white p-1 '+(index===activeImage?'border-sky-400':'border-transparent')}><ProductImage src={image} alt={'Ảnh '+(index+1)+' '+product.name} className="h-full w-full object-contain"/></button>)}</div>
          </section>
          <section className="space-y-5">
            <p className="text-sm text-sky-300">{product.brand.name} · {product.category.name}</p>
            <h1 className="text-2xl font-bold leading-snug sm:text-3xl">{product.name}</h1>
            <p className="text-sm text-slate-400">SKU: {product.sku}</p>
            <CompareToggle product={product}/>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5"><p className="text-3xl font-bold text-sky-300">{money(product.price)}</p><p className={'mt-3 text-sm '+(product.stock>0?'text-emerald-300':'text-rose-300')}>{product.stock>0?`Còn ${product.stock} sản phẩm`:'Tạm hết hàng'}</p>{product.stock>0&&product.stock<=product.min_stock_alert&&<p className="mt-2 text-xs text-amber-300">Số lượng còn ít.</p>}</div>
            <label className="flex items-center gap-4 text-sm">Số lượng<input aria-label="Số lượng mua" type="number" min={1} max={Math.max(1,available)} step={1} value={quantity} disabled={!available||buying||cart.busy} onChange={e=>setQuantity(Math.max(1,Math.min(Math.max(1,available),Math.floor(Number(e.target.value)||1))))} className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" /></label>
            {inCart>0&&<p className="text-sm text-slate-400">Giỏ hàng đã có {inCart} sản phẩm này.</p>}
            <p className="text-sm">Tạm tính: <strong>{money(product.price*quantity)}</strong></p>
            {actionError&&<p role="alert" className="text-sm text-rose-300">{actionError}</p>}
            <div className="grid gap-3 sm:grid-cols-2"><button disabled={!available||quantity>available||buying||cart.busy||cart.loading} onClick={()=>add(false)} className="rounded-xl border border-sky-600 px-4 py-3 font-semibold text-sky-300 disabled:opacity-40">{buying?'Đang xử lý…':'Thêm vào giỏ hàng'}</button><button disabled={!available||quantity>available||buying||cart.busy||cart.loading} onClick={()=>add(true)} className="rounded-xl bg-sky-600 px-4 py-3 font-semibold disabled:opacity-40">Mua ngay</button></div>
            {!user&&<p className="text-sm text-slate-400">Vui lòng <Link href="/login" className="text-sky-300 underline">đăng nhập</Link> để mua hàng.</p>}
            {!available&&product.stock>0&&<p className="text-sm text-amber-300">Đã đạt số lượng tối đa có thể thêm. Hãy kiểm tra giỏ hàng.</p>}
            <div className="flex flex-wrap gap-5 text-sm"><Link href="/cart" className="text-sky-300 underline">Xem giỏ hàng</Link><Link href="/build-pc" className="text-sky-300 underline">Tự xây dựng cấu hình PC</Link></div>
          </section>
        </div>
        <div className="grid gap-6 lg:grid-cols-2"><section className="rounded-xl border border-slate-800 bg-slate-900 p-5"><h2 className="mb-4 text-xl font-semibold">Thông số kỹ thuật</h2><dl className="divide-y divide-slate-800">{Object.entries(product.specs).map(([key,value])=><div key={key} className="grid grid-cols-2 gap-4 py-3 text-sm"><dt className="text-slate-400">{specLabel(product.category.id,key)}</dt><dd className="break-words">{specValue(value)}</dd></div>)}</dl>{!Object.keys(product.specs).length&&<p className="text-sm text-slate-400">Thông số đang được cập nhật.</p>}</section><section className="rounded-xl border border-slate-800 bg-slate-900 p-5"><h2 className="mb-4 text-xl font-semibold">Mô tả sản phẩm</h2><p className="whitespace-pre-line text-sm leading-7 text-slate-300">{product.description||'Mô tả đang được cập nhật.'}</p></section></div>
        <section><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Linh kiện cùng loại</h2><Link href={'/products?category_id='+encodeURIComponent(product.category.id)} className="text-sm text-sky-300">Xem tất cả</Link></div>{relatedError?<p className="text-sm text-slate-400">{relatedError}</p>:related.length?<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{related.map(p=><ProductCard key={p.sku} product={p}/>)}</div>:<p className="text-sm text-slate-400">Chưa có thêm linh kiện cùng loại.</p>}</section>
        <dialog ref={zoom} aria-label="Ảnh phóng to" className="w-[calc(100%-2rem)] max-w-5xl rounded-2xl border border-slate-700 bg-slate-950 p-4 text-white backdrop:bg-black/80"><form method="dialog" className="mb-3 flex justify-end"><button className="rounded-lg border border-slate-600 px-4 py-2" aria-label="Đóng ảnh phóng to">Đóng ✕</button></form><ProductImage src={product.images[activeImage]} alt={product.name} className="max-h-[75vh] w-full rounded-lg bg-white object-contain"/></dialog>
      </>}
  </div>;
}
