'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { getAccount, saveProfile, saveAddress, deleteAddress, setDefaultAddress, type AccountProfile, type AddressWrite, type SavedAddress } from '@/lib/api';
import { useSession } from '@/components/SessionProvider';
import AddressForm from '@/components/AddressForm';
export default function AccountPage() {
  const { user, refresh }=useSession();
  const [profile,setProfile]=useState<AccountProfile|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[retry,setRetry]=useState(0);
  const [editing,setEditing]=useState<SavedAddress|'new'|null>(null),[name,setName]=useState(''),[phone,setPhone]=useState('');
  const locked=useRef(false);
  useEffect(()=>{const c=new AbortController();setLoading(true);setError('');getAccount(c.signal).then(p=>{if(!c.signal.aborted){setProfile(p);setName(p.full_name);setPhone(p.phone);}}).catch(e=>{if(!c.signal.aborted)setError(e.message);}).finally(()=>{if(!c.signal.aborted)setLoading(false);});return()=>c.abort();},[user?.id,retry]);
  async function mutate(action:()=>Promise<AccountProfile>,message:string,close=false){if(locked.current)return;locked.current=true;setBusy(true);setError('');setNotice('');try{const result=await action();setProfile(result);setNotice(message);if(close)setEditing(null);}catch(e){setError((e as Error).message);}finally{locked.current=false;setBusy(false);}}
  async function submit(e:FormEvent){e.preventDefault();await mutate(()=>saveProfile(name.trim(),phone.trim()),'Đã cập nhật thông tin.');await refresh().catch(()=>{});}
  async function addressSubmit(address:AddressWrite){await mutate(()=>saveAddress(address,editing&&editing!=='new'?editing.id:undefined),'Đã lưu địa chỉ.',true);}
  async function remove(address:SavedAddress){if(!window.confirm('Xóa địa chỉ '+address.label+'? Địa chỉ trong đơn cũ vẫn được giữ.'))return;await mutate(()=>deleteAddress(address.id),'Đã xóa địa chỉ.');}
  return <div className="mx-auto max-w-5xl space-y-6 px-4 py-8"><h1 className="text-3xl font-bold">Tài khoản của tôi</h1>
    {error&&<p role="alert" className="rounded-lg border border-rose-900 p-4 text-rose-300">{error} <button disabled={busy} onClick={()=>setRetry(x=>x+1)} className="underline">Tải lại</button></p>}{notice&&<p role="status" className="rounded-lg border border-emerald-900 p-4 text-emerald-300">{notice}</p>}
    {loading?<div role="status" aria-label="Đang tải tài khoản" className="h-48 animate-pulse rounded-xl bg-slate-800"/>:profile&&<>
      <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5"><h2 className="text-xl font-semibold">Thông tin cá nhân</h2><p className="text-sm text-slate-400">{profile.username} · {profile.email}</p><fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2"><label>Họ và tên<input required maxLength={100} value={name} onChange={e=>setName(e.target.value)} autoComplete="name" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2"/></label><label>Số điện thoại<input type="tel" minLength={9} maxLength={20} value={phone} onChange={e=>setPhone(e.target.value)} autoComplete="tel" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2"/></label></fieldset><button disabled={busy||!name.trim()} className="rounded-lg bg-sky-600 px-4 py-2 disabled:opacity-40">Lưu thông tin</button></form>
      <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Sổ địa chỉ ({profile.addresses.length}/10)</h2><button disabled={busy||profile.addresses.length>=10} onClick={()=>setEditing('new')} className="rounded-lg border border-sky-700 px-4 py-2 text-sky-300 disabled:opacity-40">Thêm địa chỉ</button></div>
        {editing&&<AddressForm key={editing==='new'?'new':editing.id} initial={editing==='new'?undefined:editing} defaultId={profile.default_address_id} fullName={profile.full_name} phone={profile.phone} busy={busy} onSave={addressSubmit} onCancel={()=>setEditing(null)}/>}
        {!profile.addresses.length&&<p className="text-sm text-slate-400">Chưa có địa chỉ. Thêm địa chỉ để điền nhanh khi thanh toán.</p>}
        {profile.addresses.map(a=><article key={a.id} className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-5"><h3 className="font-semibold">{a.label} {profile.default_address_id===a.id&&<span className="ml-2 text-xs text-emerald-300">Mặc định</span>}</h3><p className="text-sm">{a.full_name} · {a.phone}</p><p className="text-sm text-slate-400">{[a.street,a.ward,a.district,a.province].join(', ')}</p><div className="flex flex-wrap gap-4 text-sm"><button disabled={busy} onClick={()=>setEditing(a)} className="text-sky-300">Sửa</button>{profile.default_address_id!==a.id&&<button disabled={busy} onClick={()=>mutate(()=>setDefaultAddress(a.id),'Đã đổi địa chỉ mặc định.')} className="text-sky-300">Đặt mặc định</button>}<button disabled={busy} onClick={()=>remove(a)} className="text-rose-300">Xóa</button></div></article>)}
      </section>
    </>}
  </div>;
}
