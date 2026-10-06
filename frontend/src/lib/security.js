/**
 * Security helpers for the admin gate.
 * - Passwords are NEVER stored. Only a salted, slow hash (PBKDF2-SHA256, 310k rounds) is kept.
 * - If the browser blocks WebCrypto (non-HTTPS), a slower salted iterated SHA-256 fallback is used.
 */
const enc = new TextEncoder();

export const hex = (b) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
export const unhex = (s) => Uint8Array.from(s.match(/.{2}/g) ?? [], (h) => parseInt(h, 16));

export function randomHex(bytes) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return hex(a);
}

export function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export const ITER = { pbkdf2: 310000, iter: 20000 };
export const bestAlgo = () => (typeof crypto !== 'undefined' && crypto.subtle ? 'pbkdf2' : 'iter');

/* ---- compact SHA-256 (fallback only) ---- */
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function sha256(msg) {
  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const l = msg.length;
  const padded = new Uint8Array(((l + 9 + 63) >> 6) << 6);
  padded.set(msg);
  padded[l] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 4, (l * 8) >>> 0);
  dv.setUint32(padded.length - 8, Math.floor((l * 8) / 4294967296));
  const w = new Uint32Array(64);
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const a = w[i - 15];
      const b = w[i - 2];
      const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
      const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[i] + w[i]) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const mj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + mj) | 0;
      hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    h[0] += a; h[1] += b; h[2] += c; h[3] += d; h[4] += e; h[5] += f; h[6] += g; h[7] += hh;
  }
  const out = new Uint8Array(32);
  const odv = new DataView(out.buffer);
  h.forEach((v, i) => odv.setUint32(i * 4, v));
  return out;
}

const concat = (a, b) => {
  const o = new Uint8Array(a.length + b.length);
  o.set(a);
  o.set(b, a.length);
  return o;
};

export async function deriveHash(secret, saltHex, algo, iter) {
  const salt = unhex(saltHex);
  if (algo === 'pbkdf2' && typeof crypto !== 'undefined' && crypto.subtle) {
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256);
    return hex(new Uint8Array(bits));
  }
  await new Promise((r) => setTimeout(r, 0));
  let cur = sha256(concat(salt, enc.encode(secret)));
  for (let i = 0; i < iter; i++) cur = sha256(concat(cur, salt));
  return hex(cur);
}

/* ---- password strength ---- */
const COMMON = ['password', '12345678', '123456789', 'qwerty', 'admin', 'letmein', 'welcome', 'rehabilified', 'iloveyou', 'abc123'];
export const STRENGTH_LABELS = ['Very weak', 'Weak', 'Fair', 'Strong', 'Excellent'];

export function strength(pw) {
  const checks = [pw.length >= 10, /[a-z]/.test(pw) && /[A-Z]/.test(pw), /\d/.test(pw), /[^A-Za-z0-9]/.test(pw)];
  const passed = checks.filter(Boolean).length;
  const common = COMMON.some((c) => pw.toLowerCase().includes(c));
  const ok = passed === 4 && !common;
  const level = common || pw.length === 0 ? 0 : passed === 4 ? (pw.length >= 14 ? 4 : 3) : Math.min(2, passed);
  const tips = [];
  if (common) tips.push('Avoid common words such as \u201cpassword\u201d or the brand name');
  if (!checks[0]) tips.push('At least 10 characters');
  if (!checks[1]) tips.push('Mix UPPER and lower case');
  if (!checks[2]) tips.push('Include a number');
  if (!checks[3]) tips.push('Include a symbol (e.g. ! @ # $)');
  return { level, ok, tips, label: STRENGTH_LABELS[level] };
}

/** Recovery code, e.g. K7M2-9QXA-W4TD-H8PN. */
export function makeRecoveryCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  const chars = Array.from(a, (b) => alphabet[b % 32]).join('');
  return chars.match(/.{4}/g).join('-');
}
export const normalizeCode = (c) => c.toUpperCase().replace(/[^A-Z0-9]/g, '');
