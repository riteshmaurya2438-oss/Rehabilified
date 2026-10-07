import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { randomHex } from './security';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/admin`;

// Older builds kept the admin password hash in this browser; it is no longer used.
try {
  localStorage.removeItem('rb-admin-cred');
} catch {
  /* ignore */
}

/* ---------------- Audit log (this browser) ---------------- */
export const useAudit = create()(
  persist(
    (set) => ({
      entries: [],
      add: (action, detail) => set((s) => ({ entries: [{ id: randomHex(6), at: new Date().toISOString(), action, detail }, ...s.entries].slice(0, 300) })),
      clear: () => set({ entries: [] }),
    }),
    { name: 'rb-admin-audit' },
  ),
);
export const audit = (action, detail) => useAudit.getState().add(action, detail);

export const fmtWait = (ms) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/* ---------------- Session (tab-scoped, auto-expiring, validated by the server) ---------------- */
const KEY = 'rb-admin-session';
export const IDLE_MS = 15 * 60 * 1000;
const MAX_MS = 8 * 60 * 60 * 1000;
const PING_MS = 60 * 1000;

function read() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    const n = Date.now();
    if (!v.token || n - v.start > MAX_MS || n - v.last > IDLE_MS) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return v;
  } catch {
    return null;
  }
}

function write(v) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

function clearStored() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export const adminToken = () => read()?.token ?? null;

async function call(path, { method = 'POST', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const t = adminToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  try {
    const res = await fetch(`${API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, error: typeof data.detail === 'string' ? data.detail : 'Something went wrong. Please try again.' };
    return { ok: true, ...data };
  } catch {
    return { ok: false, status: 0, error: 'Could not reach the server. Please check your connection and try again.' };
  }
}

export const useAdminSession = create()((set, get) => ({
  active: !!read(),
  start: (token) => {
    const n = Date.now();
    write({ token, start: n, last: n, ping: n });
    set({ active: true });
  },
  touch: () => {
    const s = read();
    if (!s) return;
    const n = Date.now();
    s.last = n;
    if (n - (s.ping || 0) > PING_MS) {
      s.ping = n;
      call('/session', { method: 'GET', auth: true }).then((r) => {
        if (!r.ok && r.status === 401) get().expire();
      });
    }
    write(s);
  },
  end: () => {
    if (adminToken()) call('/logout', { auth: true });
    clearStored();
    set({ active: false });
  },
  expire: () => {
    clearStored();
    set({ active: false });
  },
  check: () => {
    const ok = !!read();
    if (!ok && get().active) set({ active: false });
    return ok;
  },
  validate: async () => {
    if (!read()) {
      if (get().active) set({ active: false });
      return false;
    }
    const r = await call('/session', { method: 'GET', auth: true });
    if (!r.ok && r.status === 401) {
      get().expire();
      return false;
    }
    if (r.ok) useAuth.setState({ createdAt: r.createdAt });
    return true;
  },
}));

/* ---------------- Credentials (stored and checked on the server) ---------------- */
export const useAuth = create()((set, get) => ({
  configured: null,
  setupAvailable: false,
  createdAt: null,
  lockedUntil: 0,

  refresh: async () => {
    const r = await call('/status', { method: 'GET' });
    if (r.ok) set({ configured: r.configured, setupAvailable: r.setupAvailable, lockedUntil: r.lockedSeconds ? Date.now() + r.lockedSeconds * 1000 : 0 });
    return r;
  },

  setup: async (password, setupCode) => {
    const r = await call('/setup', { body: { password, setupCode } });
    if (!r.ok) {
      if (r.status === 409) await get().refresh();
      return r;
    }
    set({ configured: true, setupAvailable: false, createdAt: r.createdAt });
    audit('Admin access created');
    return { ok: true, code: r.recoveryCode, token: r.token };
  },

  verify: async (password) => {
    const r = await call('/login', { body: { password } });
    if (!r.ok) {
      if (r.status === 401 || r.status === 429) audit('Failed sign-in attempt');
      await get().refresh();
      return r;
    }
    set({ lockedUntil: 0, createdAt: r.createdAt });
    return { ok: true, token: r.token };
  },

  recover: async (code, newPassword) => {
    const r = await call('/recover', { body: { recoveryCode: code, newPassword } });
    if (!r.ok) {
      if (r.status === 401 || r.status === 429) audit('Failed recovery attempt');
      await get().refresh();
      return r;
    }
    set({ lockedUntil: 0, createdAt: r.createdAt });
    audit('Password reset with recovery code');
    return { ok: true, code: r.recoveryCode, token: r.token };
  },

  change: async (currentPassword, newPassword) => {
    const r = await call('/change-password', { auth: true, body: { currentPassword, newPassword } });
    if (!r.ok) {
      if (r.status === 401) useAdminSession.getState().expire();
      else if (r.status === 400) audit('Failed password change', r.error);
      return r;
    }
    audit('Password changed');
    return { ok: true, code: r.recoveryCode };
  },
}));
