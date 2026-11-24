'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { apiRequest, type Product } from '@/lib/api';
import AdminFeedback from '@/components/AdminFeedback';
import ProductImagesEditor from '@/components/ProductImagesEditor';
import ProductSpecsEditor from '@/components/ProductSpecsEditor';
const blank: Product = {sku:'', name:'', category:{id:'LSP01',name:'CPU'}, brand:{id:'',name:''},price:0,stock:0,min_stock_alert:5,images:[],description:'',specs:{}};
const categories = [['LSP01','CPU'],['LSP02','Mainboard'],['LSP03','RAM'],['LSP04','SSD / HDD'],['LSP05','VGA'],['LSP06','PSU'],['LSP07','Case'],['LSP08','Tản nhiệt'],['LSP09','Màn hình']];
const field = 'w-full rounded-lg border border-slate-700 bg-slate-950 p-2';
export default function ProductsAdmin() {
  const [brands,setBrands]=useState<{id:string;name:string}[]>([]), [customBrand,setCustomBrand]=useState(false), [brandError,setBrandError]=useState(''), [specsValid,setSpecsValid]=useState(true);
  const [uploading,setUploading]=useState(false), [imageKey,setImageKey]=useState(0);
  const [items,setItems]=useState<Product[]>([]), [total,setTotal]=useState(0), [page,setPage]=useState(0), [q,setQ]=useState('');
  const [draft,setDraft]=useState<Product|null>(null), [editing,setEditing]=useState(false);
  const [loading,setLoading]=useState(true), [busy,setBusy]=useState(false), [error,setError]=useState(''), [notice,setNotice]=useState(''), [retry,setRetry]=useState(0);
  useEffect(()=>{const c=new AbortController(); setLoading(true);setError('');
    const t=setTimeout(()=>{apiRequest<{items:Product[];total:number}>('/admin/products?'+new URLSearchParams({q,skip:String(page*20),limit:'20'}),{signal:c.signal})
      .then(r=>{if(!c.signal.aborted){setItems(r.items);setTotal(r.total);}}).catch(e=>{if(!c.signal.aborted)setError(e.message);}).finally(()=>{if(!c.signal.aborted)setLoading(false);});},250);
    return()=>{clearTimeout(t);c.abort();};},[q,page,retry]);
  useEffect(()=>{const c=new AbortController();apiRequest<{id:string;name:string}[]>('/products/brands/list',{signal:c.signal}).then(data=>{if(!c.signal.aborted){setBrands(data);setBrandError('');}}).catch(()=>{if(!c.signal.aborted)setBrandError('Không tải được thương hiệu. Bạn vẫn có thể nhập thương hiệu mới.');});return()=>c.abort();},[retry]);
  function changeCategory(id:string){if(!draft||id===draft.category.id)return;if(Object.keys(draft.specs).length&&!window.confirm('Đổi loại linh kiện sẽ xóa thông số đang nhập. Tiếp tục?'))return;const pair=categories.find(c=>c[0]===id)!;setDraft({...draft,category:{id:pair[0],name:pair[1]},specs:{}});setSpecsValid(true);}
  function open(p?:Product){setImageKey(x=>x+1);setDraft(p?{...p}:structuredClone(blank));setEditing(!!p);setSpecsValid(true);setCustomBrand(!!p&&!brands.some(b=>b.id===p.brand.id));setError('');}
  async function save(e:FormEvent){e.preventDefault(); if(!draft||busy||uploading||!specsValid)return;setBusy(true);setError('');
    try{const parsed=draft.specs;
      const {sku,name,category,brand,price,stock,min_stock_alert,images,description}=draft;
      await apiRequest('/admin/products'+(editing?'/'+encodeURIComponent(sku):''),{method:editing?'PUT':'POST',body:JSON.stringify({sku,name,category,brand,price,stock,min_stock_alert,images,description,specs:parsed})});setDraft(null);setNotice('Đã lưu linh kiện.');setRetry(x=>x+1);
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function remove(p:Product){if(!window.confirm('Xóa '+p.name+'? Snapshot đơn đã mua vẫn được giữ.'))return;setBusy(true);setError('');try{await apiRequest('/admin/products/'+encodeURIComponent(p.sku),{method:'DELETE'});setNotice('Đã xóa linh kiện.');setPage(0);setRetry(x=>x+1);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <div className="space-y-5"><div className="flex flex-wrap justify-between gap-3"><h1 className="text-3xl font-bold">Quản lý linh kiện</h1><button disabled={busy||uploading} onClick={()=>open()} className="rounded-lg bg-sky-600 px-4 py-2">Thêm linh kiện</button></div>
    <AdminFeedback error={error} notice={notice} clear={()=>setNotice('')}/>
    {draft && <form onSubmit={save} className="space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-5"><h2 className="text-xl font-semibold">{editing?'Sửa':'Thêm'} linh kiện</h2><fieldset disabled={busy||uploading} className="grid gap-4 sm:grid-cols-2">
      <label>SKU<input required disabled={editing} pattern="[a-zA-Z0-9_-]+" maxLength={64} value={draft.sku} onChange={e=>setDraft({...draft,sku:e.target.value})} className={field}/></label>
      <label>Tên linh kiện<input required maxLength={200} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} className={field}/></label>
      <label>Danh mục<select value={draft.category.id} onChange={e=>changeCategory(e.target.value)} className={field}>{!categories.some(c=>c[0]===draft.category.id)&&<option value={draft.category.id}>{draft.category.name}</option>}{categories.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
      <div className="space-y-3"><label className="block">Thương hiệu<select value={customBrand?'__new__':draft.brand.id} onChange={e=>{if(e.target.value==='__new__'){setCustomBrand(true);setDraft({...draft,brand:{id:'',name:''}});}else{setCustomBrand(false);const brand=brands.find(b=>b.id===e.target.value);setDraft({...draft,brand:brand?{id:brand.id,name:brand.name}:{id:'',name:''}});}}} className={field}><option value="">Chọn thương hiệu</option>{brands.map(b=><option key={b.id} value={b.id}>{b.name} ({b.id})</option>)}<option value="__new__">+ Thương hiệu mới</option></select></label>{brandError&&<p className="text-xs text-amber-300">{brandError}</p>}
      {customBrand&&<div className="grid gap-3 sm:grid-cols-2"><label>Mã thương hiệu<input required value={draft.brand.id} onChange={e=>setDraft({...draft,brand:{...draft.brand,id:e.target.value}})} className={field}/></label><label>Tên thương hiệu<input required value={draft.brand.name} onChange={e=>setDraft({...draft,brand:{...draft.brand,name:e.target.value}})} className={field}/></label></div>}</div>
      {(['price','stock','min_stock_alert'] as const).map((key,i)=><label key={key}>{['Giá bán (đ)','Tồn kho','Ngưỡng cảnh báo'][i]}<input type="number" min="0" step="1" required value={draft[key]} onChange={e=>setDraft({...draft,[key]:Number(e.target.value)})} className={field}/></label>)}
      <ProductImagesEditor key={imageKey} images={draft.images} onChange={images=>setDraft(current=>current ? {...current,images} : current)} onBusyChange={setUploading}/>
      <label className="sm:col-span-2">Mô tả<textarea value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})} className={field}/></label>
      <ProductSpecsEditor key={imageKey+'-'+draft.category.id} category={draft.category.id} value={draft.specs} onChange={specs=>setDraft(current=>current?{...current,specs}:current)} onValidityChange={setSpecsValid}/>
    </fieldset><div className="flex gap-3"><button disabled={busy||uploading||!specsValid||!draft.brand.id||!draft.brand.name} className="rounded bg-sky-600 px-5 py-2">{busy?'Đang lưu…':'Lưu'}</button><button type="button" disabled={busy||uploading} onClick={()=>setDraft(null)} className="px-4">Hủy</button></div></form>}
    <label className="block">Tìm theo tên hoặc SKU<input value={q} onChange={e=>{setQ(e.target.value);setPage(0);}} className={field}/></label>
    {loading?<div role="status" className="h-48 animate-pulse rounded-xl bg-slate-800" aria-label="Đang tải linh kiện"/>:<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['SKU / Tên','Danh mục','Giá','Kho','Thao tác'].map(v=><th className="p-3" key={v}>{v}</th>)}</tr></thead><tbody>{items.map(p=><tr key={p.sku} className="border-t border-slate-800"><td className="p-3">{p.name}<p className="text-xs text-slate-400">{p.sku}</p></td><td className="p-3">{p.category.name}</td><td className="whitespace-nowrap p-3">{p.price.toLocaleString('vi-VN')} đ</td><td className="p-3">{p.stock}</td><td className="whitespace-nowrap p-3"><button disabled={busy||uploading} onClick={()=>open(p)} className="mr-4 text-sky-300">Sửa</button><button disabled={busy||uploading} onClick={()=>remove(p)} className="text-rose-300">Xóa</button></td></tr>)}</tbody></table>{!items.length&&!error&&<p className="p-4">Không có linh kiện.</p>}</div>}
    <div className="flex justify-center gap-4"><button disabled={page===0||loading} onClick={()=>setPage(x=>x-1)}>Trước</button><span>{page+1} / {Math.max(1,Math.ceil(total/20))}</span><button disabled={(page+1)*20>=total||loading} onClick={()=>setPage(x=>x+1)}>Sau</button><button onClick={()=>setRetry(x=>x+1)} className="text-sky-300">Tải lại</button></div>
  </div>;
}
