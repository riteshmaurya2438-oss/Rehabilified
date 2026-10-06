import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { bestAlgo, deriveHash, ITER, makeRecoveryCode, normalizeCode, randomHex, safeEqual, strength } from './security';

/* ---------------- Audit log ---------------- */
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

/* ---------------- Credentials, lockout ---------------- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const fmtWait = (ms) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

async function makeCred(password) {
  const algo = bestAlgo();
  const iter = ITER[algo];
  const salt = randomHex(16);
  const rSalt = randomHex(16);
  const code = makeRecoveryCode();
  const [hash, rHash] = await Promise.all([deriveHash(password, salt, algo, iter), deriveHash(normalizeCode(code), rSalt, algo, iter)]);
  return { cred: { algo, iter, salt, hash, rSalt, rHash, createdAt: new Date().toISOString() }, code };
}

export const useAuth = create()(
  persist(
    (set, get) => {
      const registerFail = () => {
        const fails = get().fails + 1;
        let lockedUntil = 0;
        if (fails % 5 === 0) lockedUntil = Date.now() + Math.min(60, 5 * 2 ** (fails / 5 - 1)) * 60000;
        set({ fails, lockedUntil });
        return { fails, lockedUntil };
      };
      return {
        cred: null,
        fails: 0,
        lockedUntil: 0,

        setup: async (password) => {
          if (get().cred) return { ok: false, error: 'Admin access is already set up.' };
          if (!strength(password).ok) return { ok: false, error: 'Please choose a stronger password.' };
          const { cred, code } = await makeCred(password);
          set({ cred, fails: 0, lockedUntil: 0 });
          audit('Admin access created');
          return { ok: true, code };
        },

        verify: async (password) => {
          const s = get();
          if (!s.cred) return { ok: false, error: 'Admin access has not been set up yet.' };
          const wait = s.lockedUntil - Date.now();
          if (wait > 0) return { ok: false, error: `Too many attempts. Try again in ${fmtWait(wait)}.` };
          const [hash] = await Promise.all([deriveHash(password, s.cred.salt, s.cred.algo, s.cred.iter), sleep(500)]);
          if (safeEqual(hash, s.cred.hash)) {
            set({ fails: 0, lockedUntil: 0 });
            return { ok: true };
          }
          const f = registerFail();
          audit('Failed sign-in attempt', `Attempt ${f.fails}`);
          if (f.lockedUntil) {
            audit('Sign-in locked', `Locked until ${new Date(f.lockedUntil).toLocaleTimeString()}`);
            return { ok: false, error: `Too many attempts. Locked for ${fmtWait(f.lockedUntil - Date.now())}.` };
          }
          return { ok: false, error: `Incorrect password. ${5 - (f.fails % 5)} attempt(s) left before a temporary lock.` };
        },

        recover: async (code, newPassword) => {
          const s = get();
          if (!s.cred) return { ok: false, error: 'Admin access has not been set up yet.' };
          const wait = s.lockedUntil - Date.now();
          if (wait > 0) return { ok: false, error: `Too many attempts. Try again in ${fmtWait(wait)}.` };
          if (!strength(newPassword).ok) return { ok: false, error: 'Please choose a stronger new password.' };
          const [rh] = await Promise.all([deriveHash(normalizeCode(code), s.cred.rSalt, s.cred.algo, s.cred.iter), sleep(500)]);
          if (!safeEqual(rh, s.cred.rHash)) {
            const f = registerFail();
            audit('Failed recovery attempt');
            return { ok: false, error: f.lockedUntil ? `Too many attempts. Locked for ${fmtWait(f.lockedUntil - Date.now())}.` : 'That recovery code is not correct.' };
          }
          const { cred, code: fresh } = await makeCred(newPassword);
          set({ cred, fails: 0, lockedUntil: 0 });
          audit('Password reset with recovery code');
          return { ok: true, code: fresh };
        },

        change: async (current, next) => {
          const s = get();
          if (!s.cred) return { ok: false, error: 'Admin access has not been set up yet.' };
          const hash = await deriveHash(current, s.cred.salt, s.cred.algo, s.cred.iter);
          if (!safeEqual(hash, s.cred.hash)) {
            audit('Failed password change', 'Wrong current password');
            return { ok: false, error: 'Your current password is not correct.' };
          }
          if (!strength(next).ok) return { ok: false, error: 'Please choose a stronger new password.' };
          const { cred, code } = await makeCred(next);
          set({ cred });
          audit('Password changed');
          return { ok: true, code };
        },
      };
    },
    { name: 'rb-admin-cred' },
  ),
);

/* ---------------- Session (tab-scoped, auto-expiring) ---------------- */
const KEY = 'rb-admin-session';
export const IDLE_MS = 15 * 60 * 1000;
const MAX_MS = 8 * 60 * 60 * 1000;

function read() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    const n = Date.now();
    if (n - v.start > MAX_MS || n - v.last > IDLE_MS) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return v;
  } catch {
    return null;
  }
}

export const useAdminSession = create()((set, get) => ({
  active: !!read(),
  start: () => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ id: randomHex(16), start: Date.now(), last: Date.now() }));
    } catch {
      /* ignore */
    }
    set({ active: true });
  },
  touch: () => {
    const s = read();
    if (s) {
      s.last = Date.now();
      try {
        sessionStorage.setItem(KEY, JSON.stringify(s));
      } catch {
        /* ignore */
      }
    }
  },
  end: () => {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    set({ active: false });
  },
  check: () => {
    const ok = !!read();
    if (!ok && get().active) set({ active: false });
    return ok;
  },
}));
