'use client';
import { useState } from 'react';
import { SPEC_FIELDS } from '@/lib/product-specs';

function ListInput({ value, onChange }: { value: unknown; onChange: (items: string[] | undefined) => void }) {
  const [text,setText] = useState(Array.isArray(value) ? value.join(', ') : String(value ?? ''));
  return <input value={text} placeholder="Ví dụ: AM4, AM5, LGA1700" onChange={e=>{setText(e.target.value);onChange(e.target.value.trim()?e.target.value.split(',').map(v=>v.trim()).filter(Boolean):undefined);}} className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2" />;
}

export default function ProductSpecsEditor({ category, value, onChange, onValidityChange }: {
  category: string; value: Record<string, unknown>; onChange: (specs: Record<string, unknown>) => void; onValidityChange: (valid: boolean) => void;
}) {
  const [json, setJson] = useState(JSON.stringify(value, null, 2));
  const [error, setError] = useState('');
  const [revision,setRevision] = useState(0);
  function update(key: string, next: unknown) {
    const specs = { ...value };
    if (next === '' || next === undefined) delete specs[key]; else specs[key] = next;
    onChange(specs); setJson(JSON.stringify(specs, null, 2)); setError(''); onValidityChange(true);
  }
  return <div className="sm:col-span-2 space-y-4 rounded-xl border border-slate-700 p-4">
    <h3 className="font-semibold">Thông số kỹ thuật</h3>
    <p className="text-xs text-slate-400">Nhập các thông số đã biết. Bỏ trống nếu chưa có dữ liệu; hệ thống không tự điền thông số sản phẩm.</p>
    <div key={revision} className="grid gap-4 sm:grid-cols-2">{(SPEC_FIELDS[category] ?? []).map(field => <label key={field.key} className="block space-y-1 text-sm">
      <span>{field.label}{field.unit ? ` (${field.unit})` : ''}</span>
      {field.type === 'list' ? <ListInput value={value[field.key]} onChange={items=>update(field.key,items)}/> : field.type === 'boolean' ? <select value={value[field.key] === undefined ? '' : String(value[field.key])} onChange={e => update(field.key, e.target.value === '' ? undefined : e.target.value === 'true')} className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2"><option value="">Chưa có thông tin</option><option value="true">Có</option><option value="false">Không</option></select>
        : <><input type={field.type === 'number' ? 'number' : 'text'} min={field.type === 'number' ? 0 : undefined} step={field.type === 'number' ? 'any' : undefined}
          list={field.options ? `spec-${category}-${field.key}` : undefined}
          value={Array.isArray(value[field.key]) ? (value[field.key] as unknown[]).join(', ') : String(value[field.key] ?? '')}
          onChange={e => update(field.key, e.target.value === '' ? undefined : field.type === 'number' ? Number(e.target.value) : e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2" />
          {field.options && <datalist id={`spec-${category}-${field.key}`}>{field.options.map(option=><option key={option} value={option}/>)}</datalist>}</>}
    </label>)}</div>
    <details><summary className="cursor-pointer text-sm text-sky-300">Nâng cao: thêm hoặc sửa JSON thông số</summary>
      <label className="mt-3 block text-sm">JSON specs<textarea rows={7} value={json} onChange={e => {
        setJson(e.target.value);
        try { const specs = JSON.parse(e.target.value); if (!specs || typeof specs !== 'object' || Array.isArray(specs)) throw new Error(); onChange(specs); setRevision(x=>x+1); setError(''); onValidityChange(true); }
        catch { setError('JSON chưa hợp lệ. Vui lòng sửa trước khi lưu.'); onValidityChange(false); }
      }} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 font-mono" /></label>
      <p className="text-xs text-slate-400">Các trường bổ sung được giữ nguyên. Số và true/false không đặt trong dấu nháy.</p>
    </details>
    {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
  </div>;
}
