'use client';

import Link from 'next/link';
import { useSession } from '@/components/SessionProvider';

export default function AccountGate({ children }: { children: React.ReactNode }) {
  const { user, pending } = useSession();
  if (pending) return <p role="status" className="p-8 text-center">Đang kiểm tra phiên đăng nhập…</p>;
  if (!user) return <div className="p-8 text-center"><p className="mb-4">Vui lòng đăng nhập để tiếp tục.</p><Link href="/login" className="text-sky-300 underline">Đăng nhập</Link></div>;
  return <>{children}</>;
}
