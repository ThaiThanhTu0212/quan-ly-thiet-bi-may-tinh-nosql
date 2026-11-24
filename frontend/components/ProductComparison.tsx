'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getComparison, type Product } from '@/lib/api';
import { useComparison } from '@/components/ComparisonProvider';
import { useSession } from '@/components/SessionProvider';
import { useCart } from '@/components/CartProvider';
import ProductImage from '@/components/ProductImage';
import { specLabel, specValue } from '@/lib/product-specs';
export default function ProductComparison({initialSkus}:{initialSkus:string[]|null}) {
  const selection=useComparison(),{user}=useSession(),cart=useCart(),router=useRouter();
  const skus=initialSkus??selection.items.map(item=>item.sku),signature=JSON.stringify(skus);
  const [products,setProducts]=useState<Product[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState(''),[actionError,setActionError]=useState(''),[different,setDifferent]=useState(false),[retry,setRetry]=useState(0);
  useEffect(()=>{const c=new AbortController();setError('');setProducts([]);if(skus.length<2){setLoading(false);return;}setLoading(true);getComparison(skus,c.signal).then(rows=>{if(!c.signal.aborted)setProducts(rows);}).catch(e=>{if(!c.signal.aborted)setError(e.message);}).finally(()=>{if(!c.signal.aborted)setLoading(false);});return()=>c.abort();},[signature,retry]);
  function remove(sku:string){selection.remove(sku);if(initialSkus)router.replace('/compare?skus='+encodeURIComponent(skus.filter(s=>s!==sku).join(',')));}
  async function add(product:Product){if(!user){router.push('/login');return;}setActionError('');try{await cart.add([{sku:product.sku,quantity:1}]);}catch(e){setActionError((e as Error).message);}}
  const keys=Array.from(new Set(products.flatMap(p=>Object.keys(p.specs)))).filter(key=>!different||products.some(p=>JSON.stringify(p.specs[key])!==JSON.stringify(products[0].specs[key])));
  return <div className="mx-auto max-w-7xl space-y-5 px-4 py-8 pb-28"><h1 className="text-3xl font-bold">So sánh linh kiện</h1><p className="text-sm text-slate-400">Chọn 2–4 sản phẩm cùng danh mục. Giá và tồn kho được tải lại từ cửa hàng.</p>
    <div className="flex flex-wrap gap-2">{skus.map(sku=><button key={sku} onClick={()=>remove(sku)} className="rounded-lg border border-slate-700 px-3 py-2 text-sm" aria-label={'Bỏ '+sku}>{sku} ✕</button>)}</div>
    {skus.length<2&&<p className="rounded-xl border border-slate-800 p-5">Cần ít nhất 2 linh kiện. <Link href="/products" className="text-sky-300 underline">Chọn thêm sản phẩm</Link></p>}
    {error&&<p role="alert" className="text-rose-300">{error} <button onClick={()=>setRetry(x=>x+1)} className="underline">Thử lại</button></p>}{actionError&&<p role="alert" className="text-rose-300">{actionError}</p>}
    {loading&&<div role="status" aria-label="Đang tải bảng so sánh" className="h-72 animate-pulse rounded-xl bg-slate-800"/>}
    {!loading&&products.length>=2&&<><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={different} onChange={e=>setDifferent(e.target.checked)}/>Chỉ hiện thông số khác nhau</label>
      <div className="overflow-x-auto rounded-xl border border-slate-800"><table className="w-full table-fixed border-collapse text-left text-sm" style={{minWidth:180+products.length*230}}><caption className="sr-only">So sánh {products.length} linh kiện {products[0].category.name}</caption><thead><tr><th className="w-44 border-b border-slate-800 p-4">{products[0].category.name}</th>{products.map(p=><th key={p.sku} className="border-b border-l border-slate-800 p-4 align-top"><ProductImage src={p.images[0]} alt={p.name} className="mb-3 h-36 w-full rounded-lg bg-white object-contain"/><Link href={'/products/'+encodeURIComponent(p.sku)} className="text-sky-300 hover:underline">{p.name}</Link></th>)}</tr></thead><tbody>
        <tr><th className="p-4">Giá bán</th>{products.map(p=><td key={p.sku} className="border-l border-slate-800 p-4 font-semibold text-sky-300">{p.price.toLocaleString('vi-VN')} đ</td>)}</tr>
        <tr className="bg-slate-900"><th className="p-4">Thương hiệu</th>{products.map(p=><td key={p.sku} className="border-l border-slate-800 p-4">{p.brand.name}</td>)}</tr>
        <tr><th className="p-4">Tồn kho</th>{products.map(p=><td key={p.sku} className="border-l border-slate-800 p-4">{p.stock>0?p.stock+' sản phẩm':'Hết hàng'}</td>)}</tr>
        {keys.map((key,index)=><tr key={key} className={index%2===0?'bg-slate-900':''}><th className="p-4 font-medium text-slate-300">{specLabel(products[0].category.id,key)}</th>{products.map(p=><td key={p.sku} className="break-words border-l border-slate-800 p-4">{key in p.specs?specValue(p.specs[key]):'—'}</td>)}</tr>)}
        <tr><th className="p-4">Thao tác</th>{products.map(p=><td key={p.sku} className="space-y-3 border-l border-slate-800 p-4"><button disabled={!p.stock||cart.busy||cart.loading} onClick={()=>add(p)} className="block rounded-lg bg-sky-600 px-4 py-2 disabled:opacity-40">Thêm giỏ hàng</button><button onClick={()=>remove(p.sku)} className="text-rose-300">Bỏ khỏi so sánh</button></td>)}</tr>
      </tbody></table></div>{different&&!keys.length&&<p className="text-sm text-slate-400">Các thông số hiện có giống nhau.</p>}
    </>}
  </div>;
}
