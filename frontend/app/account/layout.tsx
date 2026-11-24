'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AccountGate from '@/components/AccountGate';
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const path=usePathname();
  return <AccountGate><div className="mx-auto max-w-6xl px-4 pt-6"><nav aria-label="Tài khoản" className="flex flex-wrap gap-3">{[['/account','Thông tin & địa chỉ'],['/account/orders','Đơn hàng của tôi']].map(([href,title])=><Link key={href} href={href} aria-current={path===href?'page':undefined} className={'rounded-lg border px-4 py-2 text-sm '+(path===href?'border-sky-600 text-sky-300':'border-slate-700')}>{title}</Link>)}</nav></div>{children}</AccountGate>;
}
