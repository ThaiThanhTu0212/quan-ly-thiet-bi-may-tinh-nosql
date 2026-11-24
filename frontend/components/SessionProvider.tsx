'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authRequest, type User } from '@/lib/api';

interface Session {
  user: User | null;
  pending: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let active = true;
    authRequest<User>('me')
      .then(current => { if (active) setUser(current); })
      .catch(() => {})
      .finally(() => { if (active) setPending(false); });
    return () => { active = false; };
  }, []);

  async function login(username: string, password: string) {
    const { user: current } = await authRequest<{ user: User }>('login?cookie_only=true', { username, password });
    setUser(current);
    return current;
  }

  async function logout() {
    await authRequest<void>('logout', {});
    setUser(null);
  }

  return <SessionContext.Provider value={{ user, pending, login, logout }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('Phiên đăng nhập chưa được khởi tạo.');
  return session;
}
