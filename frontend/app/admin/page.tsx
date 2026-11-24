'use client';
import { useEffect, useState } from 'react';
import { apiRequest, type Product } from '@/lib/api';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';

type Overview = { total_revenue: number; new_orders: number; total_orders: number; total_products: number; total_users: number; low_stock_count: number };
type Month = { month: string; revenue: number };
type CategoryRevenue = { name: string; revenue: number };
type Top = { sku: string; name: string; total_quantity_sold: number; total_revenue: number };
const money = (n: number) => n.toLocaleString('vi-VN') + ' đ';
const colors = ['#38bdf8','#34d399','#a78bfa','#fbbf24','#fb7185','#2dd4bf','#f97316','#818cf8'];
export default function Dashboard() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [overview, setOverview] = useState<Overview | null>(null);
  const [months, setMonths] = useState<Month[]>([]);
  const [categories, setCategories] = useState<CategoryRevenue[]>([]);
  const [top, setTop] = useState<Top[]>([]);
  const [low, setLow] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const c = new AbortController(); setLoading(true); setError('');
    const request = <T,>(p: string) => apiRequest<T>('/admin/analytics/' + p, { signal: c.signal });
    Promise.all([request<Overview>('overview'), request<Month[]>('monthly-revenue?year=' + year), request<CategoryRevenue[]>('category-revenue'), request<Top[]>('top-selling-products?limit=10'), request<Product[]>('low-stock-alert')])
      .then(([a,b,cats,d,e]) => { if (!c.signal.aborted) { setOverview(a); setMonths(b); setCategories(cats); setTop(d); setLow(e); } })
      .catch(e => { if (!c.signal.aborted) setError(e.message); }).finally(() => { if (!c.signal.aborted) setLoading(false); });
    return () => c.abort();
  }, [year, retry]);
  return <div className="space-y-6"><h1 className="text-3xl font-bold">Tổng quan cửa hàng</h1>
    <p className="text-sm text-slate-400">Doanh thu và lượt bán chỉ tính đơn đã giao. Biểu đồ theo tháng dùng năm đã chọn; các thống kê còn lại tính toàn thời gian.</p>
    <label className="block">Năm thống kê <select value={year} onChange={e => setYear(Number(e.target.value))} className="ml-3 rounded bg-slate-800 p-2">{Array.from({length: 8}, (_,i) => new Date().getFullYear() + 1 - i).map(y => <option key={y}>{y}</option>)}</select></label>
    {error && <p role="alert" className="text-rose-300">{error} <button onClick={() => setRetry(x=>x+1)} className="underline">Thử lại</button></p>}
    {loading ? <div role="status" aria-label="Đang tải thống kê" className="grid gap-4 sm:grid-cols-4">{[1,2,3,4].map(i=><div key={i} className="h-28 animate-pulse rounded-xl bg-slate-800" />)}</div> : !error && overview && <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[['Doanh thu',money(overview.total_revenue)],['Đơn chờ xác nhận',overview.new_orders],['Linh kiện',overview.total_products],['Người dùng',overview.total_users]].map(([label,value])=><div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-5"><p className="text-sm text-slate-400">{label}</p><p className="mt-3 text-2xl font-bold">{value}</p></div>)}</div>
      <p className="text-sm text-slate-400">Tổng đơn: {overview.total_orders} · Linh kiện cần nhập kho: {overview.low_stock_count}</p>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="min-w-0 rounded-xl border border-slate-800 bg-slate-900 p-4"><h2 className="mb-4 font-semibold">Doanh thu theo tháng</h2>
          {!months.some(m=>m.revenue) && <p className="text-sm text-slate-400">Chưa có doanh thu trong năm này.</p>}
          <div className="h-72" aria-label="Biểu đồ doanh thu tháng"><ResponsiveContainer width="100%" height="100%"><BarChart data={months}><CartesianGrid stroke="#334155" strokeDasharray="3 3"/><XAxis dataKey="month" tickFormatter={v=>String(v).slice(-2)} stroke="#94a3b8"/><YAxis stroke="#94a3b8" tickFormatter={v=>(v/1000000)+'tr'}/><Tooltip formatter={(v: number)=>money(v)} contentStyle={{background:'#0f172a',borderColor:'#334155'}}/><Bar dataKey="revenue" name="Doanh thu" fill="#38bdf8" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>
        </section>
        <section className="min-w-0 rounded-xl border border-slate-800 bg-slate-900 p-4"><h2 className="font-semibold">Tỷ trọng doanh thu theo danh mục</h2>
          {!categories.length ? <p className="py-20 text-center text-slate-400">Chưa có dữ liệu.</p> : <div className="h-80"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categories} dataKey="revenue" nameKey="name" innerRadius={45} outerRadius={85}>{categories.map((c,i)=><Cell key={c.name} fill={colors[i%colors.length]}/>)}</Pie><Tooltip formatter={(v:number)=>money(v)} contentStyle={{background:'#0f172a',borderColor:'#334155'}}/><Legend/></PieChart></ResponsiveContainer></div>}
        </section>
      </div>
      <section className="rounded-xl border border-slate-800 p-4"><h2 className="mb-4 text-xl font-semibold">Top 10 linh kiện bán chạy</h2><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-3">Linh kiện</th><th>Đã bán</th><th>Doanh thu</th></tr></thead><tbody>{top.map(p=><tr key={p.sku} className="border-t border-slate-800"><td className="p-3">{p.name}<p className="text-xs text-slate-400">{p.sku}</p></td><td>{p.total_quantity_sold}</td><td>{money(p.total_revenue)}</td></tr>)}</tbody></table>{!top.length && <p>Chưa có lượt bán.</p>}</div></section>
      <section className="rounded-xl border border-slate-800 p-4"><h2 className="mb-4 text-xl font-semibold">Cảnh báo tồn kho</h2>{low.map(p=><p key={p.sku} className="border-t border-slate-800 py-3 text-sm">{p.name} — Còn <strong className="text-amber-300">{p.stock}</strong>, ngưỡng {p.min_stock_alert}</p>)}{!low.length && <p>Không có linh kiện dưới ngưỡng cảnh báo.</p>}</section>
    </>}
  </div>;
}
