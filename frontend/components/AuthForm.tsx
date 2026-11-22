'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useSession } from '@/components/SessionProvider';
import { authRequest, type User } from '@/lib/api';

const inputStyle = 'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white focus:border-sky-400 focus:outline-none';

export default function AuthForm({ register = false, registered = false }: { register?: boolean; registered?: boolean }) {
  const router = useRouter();
  const session = useSession();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const username = String(data.get('username')).trim();
    const password = String(data.get('password'));
    setError('');

    if (register && password !== data.get('confirmation')) {
      setError('Mật khẩu xác nhận chưa khớp.');
      return;
    }
    if (new TextEncoder().encode(password).length > 72) {
      setError('Mật khẩu tối đa 72 byte.');
      return;
    }
    setSubmitting(true);
    try {
      if (register) {
        await authRequest<User>('register', {
          username, password,
          full_name: String(data.get('full_name')).trim(),
          email: String(data.get('email')).trim(),
        });
        router.push('/login?registered=1');
      } else {
        const user = await session.login(username, password);
        router.replace(user.role === 'admin' ? '/admin' : '/products');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể gửi yêu cầu.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto my-12 max-w-md px-4">
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-white">{register ? 'Tạo tài khoản' : 'Đăng nhập'}</h1>
        {registered && (
          <p role="status" className="text-sm text-emerald-300">Đăng ký thành công. Bạn có thể đăng nhập.</p>
        )}
        {register && (
          <>
            <label className="block space-y-1 text-sm"><span>Họ và tên</span>
              <input className={inputStyle} name="full_name" autoComplete="name" maxLength={100} required />
            </label>
            <label className="block space-y-1 text-sm"><span>Email</span>
              <input className={inputStyle} name="email" type="email" autoComplete="email" maxLength={254} required />
            </label>
          </>
        )}
        <label className="block space-y-1 text-sm"><span>{register ? 'Tên đăng nhập' : 'Tên đăng nhập hoặc email'}</span>
          <input className={inputStyle} name="username" autoComplete="username" required
            minLength={register ? 3 : 1} maxLength={register ? 32 : 254}
            pattern={register ? '[a-zA-Z0-9_.\\-]+' : undefined}
            title={register ? 'Dùng chữ cái không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang' : undefined} />
        </label>
        <label className="block space-y-1 text-sm"><span>Mật khẩu</span>
          <input className={inputStyle} name="password" type="password"
            autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 8 : 1} maxLength={72} required />
        </label>
        {register && (
          <label className="block space-y-1 text-sm"><span>Nhập lại mật khẩu</span>
            <input className={inputStyle} name="confirmation" type="password" autoComplete="new-password" required />
          </label>
        )}
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        <button disabled={submitting || (!register && session.pending)}
          className="w-full rounded-lg bg-sky-600 py-2.5 font-semibold text-white hover:bg-sky-500 disabled:opacity-60">
          {submitting ? 'Đang gửi…' : register ? 'Đăng ký' : 'Đăng nhập'}
        </button>
        <p className="text-sm text-slate-400">
          {register ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? '}
          <Link href={register ? '/login' : '/register'} className="font-semibold text-sky-300 hover:underline">
            {register ? 'Đăng nhập' : 'Đăng ký'}
          </Link>
        </p>
      </form>
    </section>
  );
}
