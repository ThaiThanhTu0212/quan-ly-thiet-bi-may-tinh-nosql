'use client';
import Link from 'next/link';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { addToComparison, type CompareEntry } from '@/lib/comparison';
import type { Product } from '@/lib/api';
interface CompareContext { items:CompareEntry[]; ready:boolean; toggle:(p:Product)=>void; remove:(sku:string)=>void; clear:()=>void }
const Context=createContext<CompareContext|null>(null);
export function ComparisonProvider({children}:{children:ReactNode}) {
  const [items,setItems]=useState<CompareEntry[]>([]),[ready,setReady]=useState(false),[message,setMessage]=useState('');
  const current=useRef(items);
  function update(next:CompareEntry[]){current.current=next;setItems(next);}
  useEffect(()=>{try{const stored=JSON.parse(localStorage.getItem('pc-compare-skus')||'[]');if(Array.isArray(stored)&&stored.length<=4){let clean:CompareEntry[]=[];for(const entry of stored){if(typeof entry?.sku!=='string'||!entry.sku||entry.sku.length>64||typeof entry.category_id!=='string')throw new Error();const result=addToComparison(clean,entry);if(result.error)throw new Error();clean=result.items;}update(clean);}}catch{}setReady(true);},[]);
  useEffect(()=>{if(ready)try{localStorage.setItem('pc-compare-skus',JSON.stringify(items));}catch{}},[items,ready]);
  useEffect(()=>{if(!message)return;const timer=setTimeout(()=>setMessage(''),5000);return()=>clearTimeout(timer);},[message]);
  function toggle(product:Product){const result=addToComparison(current.current,{sku:product.sku,category_id:product.category.id});if(result.error){setMessage(result.error);return;}update(result.items);setMessage('Đã cập nhật danh sách so sánh.');}
  return <Context.Provider value={{items,ready,toggle,remove:sku=>update(current.current.filter(item=>item.sku!==sku)),clear:()=>update([])}}>{children}
    {message&&<p role="status" className="fixed bottom-24 left-4 z-50 max-w-sm rounded-xl border border-sky-800 bg-slate-900 p-4 text-sm text-sky-200 shadow-xl">{message}</p>}
    {ready&&items.length>0&&<aside aria-label="Danh sách so sánh" className="fixed bottom-4 left-4 z-40 flex flex-wrap items-center gap-3 rounded-xl border border-sky-800 bg-slate-900 p-3 text-sm shadow-xl"><span>Đã chọn {items.length}/4</span><Link href={'/compare?skus='+encodeURIComponent(items.map(i=>i.sku).join(','))} className="rounded bg-sky-600 px-3 py-2">So sánh</Link><button type="button" onClick={()=>update([])} className="text-slate-300">Bỏ tất cả</button></aside>}
  </Context.Provider>;
}
export function useComparison(){const context=useContext(Context);if(!context)throw new Error('So sánh chưa được khởi tạo.');return context;}
export function CompareToggle({product}:{product:Product}){const {items,ready,toggle}=useComparison();const selected=items.some(i=>i.sku===product.sku);return <button type="button" disabled={!ready} aria-pressed={selected} onClick={()=>toggle(product)} className={'rounded-lg border px-3 py-2 text-sm '+(selected?'border-sky-500 text-sky-300':'border-slate-700 text-slate-300')}>{selected?'✓ Đã chọn so sánh':'+ So sánh'}</button>;}
