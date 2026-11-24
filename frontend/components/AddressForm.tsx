'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { getLocations, type AddressWrite, type Province, type SavedAddress } from '@/lib/api';
const field='w-full rounded-lg border border-slate-700 bg-slate-950 p-2';
export default function AddressForm({ initial, defaultId, fullName, phone, busy, onSave, onCancel }: {
  initial?: SavedAddress; defaultId: string | null; fullName: string; phone: string; busy: boolean;
  onSave: (address: AddressWrite) => Promise<void>; onCancel: () => void;
}) {
  const [locations,setLocations]=useState<Province[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  const [province,setProvince]=useState(initial?.province??''),[district,setDistrict]=useState(initial?.district??''),[ward,setWard]=useState(initial?.ward??'');
  useEffect(()=>{const c=new AbortController();setLoading(true);setError('');getLocations(c.signal).then(rows=>{if(!c.signal.aborted)setLocations(rows);}).catch(e=>{if(!c.signal.aborted)setError(e.message);}).finally(()=>{if(!c.signal.aborted)setLoading(false);});return()=>c.abort();},[retry]);
  const selectedProvince=locations.find(p=>p.province_name===province),selectedDistrict=selectedProvince?.districts.find(d=>d.district_name===district);
  const validWard=selectedDistrict?.wards.some(w=>w.ward_name===ward);
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!validWard||busy)return;const data=new FormData(e.currentTarget);await onSave({label:String(data.get('label')).trim(),full_name:String(data.get('full_name')).trim(),phone:String(data.get('phone')).trim(),street:String(data.get('street')).trim(),province,district,ward,set_default:data.has('set_default')});}
  return <form onSubmit={submit} className="space-y-4 rounded-xl border border-sky-900 bg-slate-900 p-5"><h2 className="text-lg font-semibold">{initial?'Sửa địa chỉ':'Thêm địa chỉ'}</h2><fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
    <label>Tên địa chỉ<input name="label" defaultValue={initial?.label??'Nhà riêng'} required maxLength={50} className={field}/></label>
    <label>Người nhận<input name="full_name" defaultValue={initial?.full_name??fullName} required maxLength={100} className={field}/></label>
    <label>Số điện thoại<input name="phone" type="tel" defaultValue={initial?.phone??phone} required minLength={9} maxLength={20} className={field}/></label>
    <label>Tỉnh / Thành phố<select required value={province} disabled={loading||!!error} onChange={e=>{setProvince(e.target.value);setDistrict('');setWard('');}} className={field}><option value="">Chọn tỉnh/thành</option>{locations.map(p=><option key={p.province_id}>{p.province_name}</option>)}</select></label>
    <label>Quận / Huyện<select required value={district} disabled={!selectedProvince} onChange={e=>{setDistrict(e.target.value);setWard('');}} className={field}><option value="">Chọn quận/huyện</option>{selectedProvince?.districts.map(d=><option key={d.district_id}>{d.district_name}</option>)}</select></label>
    <label>Phường / Xã<select required value={ward} disabled={!selectedDistrict} onChange={e=>setWard(e.target.value)} className={field}><option value="">Chọn phường/xã</option>{selectedDistrict?.wards.map(w=><option key={w.ward_id}>{w.ward_name}</option>)}</select></label>
    <label className="sm:col-span-2">Số nhà, tên đường<input name="street" defaultValue={initial?.street??''} required maxLength={250} className={field}/></label>
    <label className="flex items-center gap-2 sm:col-span-2"><input name="set_default" type="checkbox" disabled={defaultId===initial?.id} defaultChecked={!defaultId||defaultId===initial?.id}/>Dùng làm địa chỉ mặc định</label>
  </fieldset>{loading&&<p role="status">Đang tải địa chỉ…</p>}{error&&<p role="alert" className="text-sm text-rose-300">{error} <button type="button" onClick={()=>setRetry(x=>x+1)} className="underline">Thử lại</button></p>}{initial&&!loading&&!error&&!validWard&&<p className="text-sm text-amber-300">Địa chỉ cũ không còn khớp danh mục. Vui lòng chọn lại tỉnh, huyện, xã.</p>}
    <div className="flex gap-3"><button disabled={busy||loading||!!error||!validWard} className="rounded-lg bg-sky-600 px-4 py-2 disabled:opacity-40">{busy?'Đang lưu…':'Lưu địa chỉ'}</button><button type="button" disabled={busy} onClick={onCancel}>Hủy</button></div>
  </form>;
}
