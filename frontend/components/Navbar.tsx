'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Cpu, Menu, X } from 'lucide-react';
import { useSession } from '@/components/SessionProvider';
import CategorySidebar from '@/components/CategorySidebar';

const links = [
  { href: '/products', label: 'Linh kiện PC' },
  { href: '/pc-builder', label: 'Build PC' },
  { href: '/cart', label: 'Giỏ hàng' },
  { href: '/orders', label: 'Đơn hàng' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user, pending, logout } = useSession();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const items = user?.role === 'admin' ? [...links, { href: '/admin', label: 'Quản trị' }] : links;

  async function handleLogout() {
    setError('');
    try {
      await logout();
      setOpen(false);
    } catch {
      setError('Không thể đăng xuất. Vui lòng thử lại.');
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-5 px-4 sm:px-6 lg:px-8">
        <Link href="/" onClick={() => setOpen(false)} className="my-3 inline-flex items-center gap-2 font-bold text-white">
          <Cpu className="rounded-lg bg-sky-600 p-1.5 text-white" size={34} />
          PC Builder
        </Link>
        <button type="button" aria-expanded={open} aria-controls="store-navigation" aria-label={open ? 'Đóng menu' : 'Mở menu'}
          onClick={() => setOpen(!open)} className="rounded-lg p-2 hover:bg-slate-800 lg:hidden">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
        <nav id="store-navigation" aria-label="Điều hướng chính"
          className={`${open ? 'flex' : 'hidden'} w-full flex-col gap-1 pb-3 text-sm lg:flex lg:w-auto lg:flex-row lg:items-center lg:pb-0`}>
          <CategorySidebar onNavigate={() => setOpen(false)} />
          {items.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}
              aria-current={pathname === href ? 'page' : undefined}
              className={`rounded-lg px-3 py-2 hover:bg-slate-800 ${pathname === href ? 'bg-slate-800 text-sky-300' : 'text-slate-200'}`}>
              {label}
            </Link>
          ))}
          {!pending && (user ? (
            <div className="flex flex-wrap items-center gap-2 px-3 py-2 lg:ml-2">
              <span className="max-w-[10rem] truncate text-slate-300">{user.full_name || user.username}</span>
              <button type="button" onClick={handleLogout} className="font-medium text-sky-300 hover:underline">Đăng xuất</button>
            </div>
          ) : (
            <div className="flex gap-4 px-3 py-2 text-sky-300 lg:ml-2">
              <Link onClick={() => setOpen(false)} href="/login" className="hover:underline">Đăng nhập</Link>
              <Link onClick={() => setOpen(false)} href="/register" className="hover:underline">Đăng ký</Link>
            </div>
          ))}
        </nav>
        {error && <p role="alert" className="w-full pb-2 text-sm text-rose-300">{error}</p>}
      </div>
    </header>
  );
}
