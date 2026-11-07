import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { DemoBackend } from './demo';
import { SupabaseBackend } from './supabase';
import type { Backend } from './types';

export * from './types';

/** Supabase when EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set, demo mode otherwise. */
export function createBackend(): Backend {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? new SupabaseBackend(url, key) : new DemoBackend();
}

const Ctx = createContext<Backend | null>(null);
export function BackendProvider({ children }: { children: ReactNode }) {
  const backend = useMemo(createBackend, []);
  return <Ctx.Provider value={backend}>{children}</Ctx.Provider>;
}
export function useBackend(): Backend {
  const b = useContext(Ctx);
  if (!b) throw new Error('useBackend outside BackendProvider');
  return b;
}

/** Random v4 UUID for idempotency keys (crypto.randomUUID where available). */
export function newId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
