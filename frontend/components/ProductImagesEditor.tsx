'use client';
import { useState, type ChangeEvent } from 'react';
import { apiRequest } from '@/lib/api';

function Preview({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  return <div className="flex h-28 items-center justify-center rounded bg-white">
    {failed ? <span className="p-2 text-center text-xs text-rose-700">Không tải được ảnh. Kiểm tra URL hoặc tải file lên.</span>
      : <img src={url} alt="Xem trước ảnh sản phẩm" className="h-full w-full object-contain" onError={() => setFailed(true)} />}
  </div>;
}

export default function ProductImagesEditor({ images, onChange, onBusyChange }: {
  images: string[]; onChange: (images: string[]) => void; onBusyChange: (busy: boolean) => void;
}) {
  const [text, setText] = useState(images.join('\n'));
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  function change(value: string) {
    setText(value);
    onChange(Array.from(new Set(value.split('\n').map(v => v.trim()).filter(Boolean))));
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    if (!files.length) return;
    setError('');
    if (images.length + files.length > 20) { setError('Mỗi sản phẩm tối đa 20 ảnh.'); input.value = ''; return; }
    if (files.some(f => f.size > 5 * 1024 * 1024)) { setError('Mỗi ảnh tối đa 5 MB.'); input.value = ''; return; }
    setUploading(true); onBusyChange(true);
    const urls = [...images];
    try {
      for (let i = 0; i < files.length; i++) {
        setProgress(`Đang tải ảnh ${i + 1}/${files.length}…`);
        const form = new FormData(); form.append('file', files[i]);
        const result = await apiRequest<{ url: string }>('/admin/uploads/images', { method: 'POST', body: form });
        urls.push(result.url);
        setText(urls.join('\n')); onChange([...urls]);
      }
      setProgress('Đã tải ảnh. Nhấn Lưu để cập nhật sản phẩm.');
    } catch (e) { setError((e as Error).message); setProgress(''); }
    finally { setUploading(false); onBusyChange(false); input.value = ''; }
  }
  return <div className="sm:col-span-2 space-y-3 rounded-xl border border-slate-700 p-4">
    <h3 className="font-semibold">Ảnh sản phẩm</h3>
    <label className="block space-y-2 text-sm"><span>Nhập URL ảnh (mỗi dòng một URL hoặc đường dẫn /images/...)</span>
      <textarea rows={3} value={text} disabled={uploading} onChange={e => { setError(''); change(e.target.value); }} placeholder="https://website.com/anh-san-pham.jpg"
        className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2" />
    </label>
    <label className="block space-y-2 text-sm"><span>Hoặc tải ảnh từ máy tính</span>
      <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploading}
        onChange={upload} className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-sky-600 file:px-4 file:py-2 file:text-white" />
    </label>
    <p className="text-xs text-slate-400">JPG, PNG, WebP, GIF · Tối đa 5 MB/ảnh, 20 ảnh/sản phẩm. Ảnh đầu tiên là ảnh đại diện. URL phải trỏ trực tiếp đến file ảnh.</p>
    {progress && <p role="status" className="text-sm text-sky-300">{progress}</p>}
    {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{images.map((url, index) => <div key={url} className="min-w-0 space-y-2">
      <Preview url={url} /><p className="truncate text-xs text-slate-400" title={url}>{index === 0 ? 'Ảnh đại diện' : `Ảnh ${index + 1}`}</p>
      <button type="button" disabled={uploading} onClick={() => change(images.filter((_, i) => i !== index).join('\n'))} className="text-sm text-rose-300">Bỏ ảnh</button>
    </div>)}</div>
  </div>;
}
