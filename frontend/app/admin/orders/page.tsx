'use client';
import { useEffect, useState } from 'react';
import { apiRequest, type Order } from '@/lib/api';
import AdminFeedback from '@/components/AdminFeedback';
const transitions: Record<string,string[]> = {'Chờ xác nhận':['Đang giao','Đã hủy'],'Đang giao':['Đã giao','Đã hủy']};
export default function OrdersAdmin() {
  const [items,setItems]=useState<Order[]>([]),[total,setTotal]=useState(0),[page,setPage]=useState(0),[status,setStatus]=useState('');
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{const c=new AbortController();setLoading(true);setError('');apiRequest<{items:Order[];total:number}>('/admin/orders?'+new URLSearchParams({status,skip:String(page*20),limit:'20'}),{signal:c.signal})
    .then(r=>{if(!c.signal.aborted){setItems(r.items);setTotal(r.total);}}).catch(e=>{if(!c.signal.aborted)setError(e.message);}).finally(()=>{if(!c.signal.aborted)setLoading(false);});return()=>c.abort();},[status,page,retry]);
  async function update(code:string,next:string){if(!window.confirm('Chuyển đơn sang '+next+'?'))return;setBusy(true);setError('');try{await apiRequest('/admin/orders/'+encodeURIComponent(code)+'/status',{method:'PATCH',body:JSON.stringify({status:next})});setNotice('Đã cập nhật trạng thái đơn.');setRetry(x=>x+1);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <div className="space-y-5"><h1 className="text-3xl font-bold">Quản lý đơn hàng</h1><AdminFeedback error={error} notice={notice} clear={()=>setNotice('')}/>
    <div className="flex flex-wrap items-center gap-4"><label>Trạng thái <select value={status} onChange={e=>{setStatus(e.target.value);setPage(0);}} className="ml-2 rounded bg-slate-800 p-2"><option value="">Tất cả</option>{['Chờ xác nhận','Đang giao','Đã giao','Đã hủy'].map(s=><option key={s}>{s}</option>)}</select></label><button onClick={()=>setRetry(x=>x+1)} className="text-sky-300">Tải lại</button></div>
    {loading?<div role="status" aria-label="Đang tải đơn hàng" className="h-60 animate-pulse rounded-xl bg-slate-800"/>:items.map(order=><article key={order.order_code} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="break-all font-semibold">{order.order_code}</h2><p className="text-sm text-slate-400">{new Date(order.dates.created_at).toLocaleString('vi-VN')} · {order.customer_email}</p></div><p className="text-sky-300">{order.status}</p></div>
      <details><summary className="cursor-pointer text-sm text-sky-300">Chi tiết sản phẩm và giao hàng</summary><ul className="my-3 space-y-2">{order.items.map(i=><li key={i.sku} className="text-sm">{i.name} × {i.quantity} — {i.unit_price.toLocaleString('vi-VN')} đ / sản phẩm</li>)}</ul><p className="text-sm">{order.shipping_address.full_name} · {order.shipping_address.phone}</p><p className="text-sm text-slate-400">{[order.shipping_address.street,order.shipping_address.ward,order.shipping_address.district,order.shipping_address.province].join(', ')}</p></details>
      <div className="flex flex-wrap justify-between gap-4"><p className="font-semibold">{order.total_amount.toLocaleString('vi-VN')} đ <span className="text-xs text-slate-400">· {order.payment_method} · {order.payment_status}</span></p><div className="flex gap-3">{(transitions[order.status]??[]).map(next=><button disabled={busy} key={next} onClick={()=>update(order.order_code,next)} className="rounded border border-slate-600 px-3 py-2 text-sm disabled:opacity-40">{next}</button>)}</div></div>
    </article>)}
    {!loading&&!error&&!items.length&&<p>Không có đơn hàng phù hợp.</p>}
    <nav className="flex justify-center gap-4"><button disabled={page===0||loading} onClick={()=>setPage(x=>x-1)}>Trước</button><span>{page+1} / {Math.max(1,Math.ceil(total/20))}</span><button disabled={(page+1)*20>=total||loading} onClick={()=>setPage(x=>x+1)}>Sau</button></nav>
  </div>;
}
