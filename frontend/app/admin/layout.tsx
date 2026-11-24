'use client';
import Link from 'next/link';
import { useSession } from '@/components/SessionProvider';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, pending } = useSession();
  if (pending) return <div role="status" className="m-8 h-32 animate-pulse rounded-xl bg-slate-800" aria-label="Đang kiểm tra quyền" />;
  if (!user) return <p className="p-8">Vui lòng <Link href="/login" className="text-sky-300 underline">đăng nhập</Link> để tiếp tục.</p>;
  if (user.role !== 'admin') return <p role="alert" className="p-8 text-rose-300">Bạn không có quyền quản trị.</p>;
  return <div className="mx-auto max-w-7xl px-4 py-8"><nav aria-label="Quản trị" className="mb-6 flex flex-wrap gap-3">{[['/admin','Tổng quan'],['/admin/products','Linh kiện'],['/admin/orders','Đơn hàng']].map(([href,label]) => <Link key={href} href={href} className="rounded-lg border border-slate-700 px-4 py-2 hover:bg-slate-800">{label}</Link>)}</nav>{children}</div>;
}
