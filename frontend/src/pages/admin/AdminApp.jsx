import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { BarChart3, BookOpen, CalendarClock, Check, Copy, CreditCard, ImageIcon, LayoutDashboard, Lock, LogOut, MessageSquareQuote, ShieldCheck, ShieldAlert, Stethoscope, Users, Video } from 'lucide-react';
import { audit, fmtWait, useAdminSession, useAuth } from '../../lib/adminAuth';
import { strength } from '../../lib/security';
import { useSEO } from '../../lib/seo';
import { syncAfterLogin } from '../../lib/store';
import { BrandMark, EASE, Logo } from '../../components/ui';
import { PasswordInput, StrengthMeter } from './parts';
import { AppointmentsTab, BrandTab, ContentTab, Courses, HomepageTab, Lectures, Overview, PaymentsTab, Registrations, SecurityTab, SlotsTab } from './tabs';
import { cn } from '../../utils/cn';

function useNoIndex() {
  useEffect(() => {
    const m = document.createElement('meta');
    m.name = 'robots';
    m.content = 'noindex,nofollow';
    document.head.appendChild(m);
    return () => m.remove();
  }, []);
}

/* ====================== Gate: setup / sign in / recover ====================== */
function Gate() {
  const configured = useAuth((s) => s.configured);
  const setupAvailable = useAuth((s) => s.setupAvailable);
  const lockedUntil = useAuth((s) => s.lockedUntil);
  const { setup, verify, recover, refresh } = useAuth.getState();
  const start = useAdminSession((s) => s.start);

  const [mode, setMode] = useState('loading');
  const [loadError, setLoadError] = useState('');
  const [setupCode, setSetupCode] = useState('');
  const [pendingToken, setPendingToken] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [rc, setRc] = useState('');
  const [busy, setBusy] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const i = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(i);
  }, []);
  useEffect(() => {
    let alive = true;
    refresh().then((r) => {
      if (!alive) return;
      if (!r.ok) return setLoadError(r.error);
      setMode(r.configured ? 'login' : 'setup');
    });
    return () => {
      alive = false;
    };
  }, [refresh]);

  useEffect(() => {
    if (configured && mode === 'setup') setMode('login');
  }, [configured, mode]);

  function enter(token, note) {
    start(token);
    syncAfterLogin();
    audit('Signed in', note);
  }

  const wait = Math.max(0, lockedUntil - now);
  const st = strength(pw);

  async function onLogin(e) {
    e.preventDefault();
    if (busy || wait > 0) return;
    setBusy(true);
    const r = await verify(pw);
    setBusy(false);
    if (r.ok) {
      enter(r.token);
      toast.success('Welcome back.');
    } else {
      toast.error(r.error);
      setPw('');
    }
  }

  async function onSetup(e) {
    e.preventDefault();
    if (!st.ok) return void toast.error('Please choose a stronger password.');
    if (pw !== pw2) return void toast.error('The passwords do not match.');
    setBusy(true);
    const r = await setup(pw, setupCode);
    setBusy(false);
    if (!r.ok) return void toast.error(r.error);
    setPendingToken(r.token);
    setSetupCode('');
    setNewCode(r.code ?? '');
    setPw('');
    setPw2('');
    setMode('code');
  }

  async function onRecover(e) {
    e.preventDefault();
    if (!st.ok) return void toast.error('Please choose a stronger new password.');
    if (pw !== pw2) return void toast.error('The passwords do not match.');
    setBusy(true);
    const r = await recover(rc, pw);
    setBusy(false);
    if (!r.ok) return void toast.error(r.error);
    setPendingToken(r.token);
    setNewCode(r.code ?? '');
    setPw('');
    setPw2('');
    setRc('');
    setMode('code');
  }

  const heading = { loading: 'Admin', login: 'Admin sign in', setup: 'Create your admin password', recover: 'Reset your password', code: 'Save your recovery code' }[mode];

  return (
    <main className="grid min-h-screen bg-mist lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="relative hidden overflow-hidden bg-royal p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-20 -top-20 h-96 w-96 animate-float rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-24 right-0 h-96 w-96 animate-float-slow rounded-full bg-navy/40 blur-3xl" aria-hidden="true" />
        <div className="relative flex items-center gap-3">
          <Logo size={44} />
          <span className="font-display text-xl font-extrabold">Rehabilified&trade; Admin</span>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }} className="relative">
          <BrandMark className="h-40 w-40 opacity-95" />
          <h2 className="mt-8 text-4xl font-extrabold leading-tight">Your website, under your control.</h2>
          <ul className="mt-6 space-y-3 text-white/85">
            {['Salted & hashed password, never stored in plain text', 'Automatic lockout after failed attempts', 'Auto-lock when you step away', 'Full activity log of every change'].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </motion.div>
        <p className="relative text-xs text-white/60">Authorised use only. Sign-in attempts are logged.</p>
      </div>

      <div className="flex items-center justify-center px-5 py-16">
        <motion.div key={mode} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo size={44} />
            <span className="font-display text-lg font-extrabold">Rehabilified&trade; Admin</span>
          </div>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-royal text-white shadow-lg shadow-royal/30">
            <Lock className="h-5 w-5" />
          </span>
          <h1 className="mt-5 text-3xl font-extrabold">{heading}</h1>

          {mode === 'loading' && (
            <p className="mt-6 text-sm text-navy/60">{loadError ? `${loadError}` : 'Checking admin access\u2026'}</p>
          )}

          {mode === 'login' && (
            <form onSubmit={onLogin} className="mt-6 space-y-4">
              <div>
                <label className="label" htmlFor="ad-pw">Admin password</label>
                <PasswordInput id="ad-pw" value={pw} onChange={setPw} autoFocus />
              </div>
              {wait > 0 && (
                <p className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                  <ShieldAlert className="h-4 w-4" /> Locked. Try again in {fmtWait(wait)}.
                </p>
              )}
              <button className="btn btn-primary w-full py-3.5" disabled={busy || wait > 0 || !pw}>
                {busy ? 'Checking\u2026' : 'Sign in'}
              </button>
              <button type="button" className="w-full text-center text-sm font-semibold text-royal hover:underline" onClick={() => { setPw(''); setMode('recover'); }}>
                Forgot password? Use recovery code
              </button>
            </form>
          )}

          {mode === 'setup' && (
            <form onSubmit={onSetup} className="mt-6 space-y-4">
              <p className="text-sm text-navy/60">First-time setup. Enter the setup code you received from support, then choose a strong password that only you know. There is no default password.</p>
              {!setupAvailable && (
                <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">Admin setup is not enabled on this server yet. Please contact support for your setup code.</p>
              )}
              <div>
                <label className="label" htmlFor="ad-setup">Setup code</label>
                <input id="ad-setup" className="field font-mono tracking-wider" value={setupCode} onChange={(e) => setSetupCode(e.target.value)} placeholder="RB-XXXXXXXXXXXX" autoFocus spellCheck={false} autoComplete="off" />
              </div>
              <div>
                <label className="label" htmlFor="ad-new">New password</label>
                <PasswordInput id="ad-new" value={pw} onChange={setPw} autoComplete="new-password" />
                <StrengthMeter password={pw} />
              </div>
              <div>
                <label className="label" htmlFor="ad-new2">Confirm password</label>
                <PasswordInput id="ad-new2" value={pw2} onChange={setPw2} autoComplete="new-password" />
              </div>
              <button className="btn btn-primary w-full py-3.5" disabled={busy || !setupAvailable || !setupCode.trim() || !st.ok || pw !== pw2}>
                {busy ? 'Securing\u2026' : 'Create admin access'}
              </button>
            </form>
          )}

          {mode === 'recover' && (
            <form onSubmit={onRecover} className="mt-6 space-y-4">
              <div>
                <label className="label" htmlFor="ad-rc">Recovery code</label>
                <input id="ad-rc" className="field font-mono uppercase tracking-wider" value={rc} onChange={(e) => setRc(e.target.value)} placeholder="XXXX-XXXX-XXXX-XXXX" autoFocus spellCheck={false} />
              </div>
              <div>
                <label className="label" htmlFor="ad-rn">New password</label>
                <PasswordInput id="ad-rn" value={pw} onChange={setPw} autoComplete="new-password" />
                <StrengthMeter password={pw} />
              </div>
              <div>
                <label className="label" htmlFor="ad-rn2">Confirm new password</label>
                <PasswordInput id="ad-rn2" value={pw2} onChange={setPw2} autoComplete="new-password" />
              </div>
              {wait > 0 && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">Locked. Try again in {fmtWait(wait)}.</p>}
              <button className="btn btn-primary w-full py-3.5" disabled={busy || wait > 0 || !rc || !st.ok || pw !== pw2}>
                {busy ? 'Resetting\u2026' : 'Reset password'}
              </button>
              <button type="button" className="w-full text-center text-sm font-semibold text-royal hover:underline" onClick={() => setMode('login')}>
                Back to sign in
              </button>
            </form>
          )}

          {mode === 'code' && (
            <div className="mt-6 space-y-5">
              <p className="text-sm text-navy/65">This is the <strong>only</strong> way to reset your password if you forget it. It is shown once. Store it somewhere safe (password manager or paper).</p>
              <div className="rounded-2xl border-2 border-dashed border-royal/40 bg-white p-5 text-center">
                <p className="select-all break-all font-mono text-lg font-bold tracking-wider text-navy sm:text-2xl">{newCode}</p>
                <button
                  type="button"
                  className="btn btn-outline mt-4 !py-2"
                  onClick={() => {
                    navigator.clipboard?.writeText(newCode).then(() => {
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 2000);
                    });
                  }}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy code'}
                </button>
              </div>
              <label className="flex cursor-pointer items-start gap-3 text-sm font-medium">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#0B6EDC]" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
                I have saved my recovery code in a safe place.
              </label>
              <button
                className="btn btn-primary w-full py-3.5"
                disabled={!saved}
                onClick={() => {
                  enter(pendingToken, 'After setup / reset');
                  toast.success('Admin access is ready.');
                }}
              >
                Enter dashboard
              </button>
            </div>
          )}

          <Link to="/" className="mt-8 inline-block text-sm font-semibold text-navy/55 hover:text-royal">
            &larr; Back to website
          </Link>
        </motion.div>
      </div>
    </main>
  );
}

/* ====================== Dashboard shell ====================== */
const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'lectures', label: 'Lectures', icon: Video },
  { id: 'courses', label: 'Courses', icon: BookOpen },
  { id: 'slots', label: 'Slots', icon: CalendarClock },
  { id: 'registrations', label: 'Registrations', icon: Users },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'appointments', label: 'Appointments', icon: Stethoscope },
  { id: 'content', label: 'Testimonials & FAQs', icon: MessageSquareQuote },
  { id: 'homepage', label: 'Homepage numbers', icon: BarChart3 },
  { id: 'brand', label: 'Logo & photo', icon: ImageIcon },
  { id: 'security', label: 'Security', icon: ShieldCheck },
];

function Shell() {
  const end = useAdminSession((s) => s.end);
  const touch = useAdminSession((s) => s.touch);
  const check = useAdminSession((s) => s.check);
  const validate = useAdminSession((s) => s.validate);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    validate();
  }, [validate]);

  useEffect(() => {
    let last = 0;
    const bump = () => {
      const n = Date.now();
      if (n - last > 5000) {
        last = n;
        touch();
      }
    };
    const evs = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    evs.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const iv = window.setInterval(() => {
      if (!check()) {
        audit('Auto-locked', 'Session expired');
        toast('Locked after inactivity. Please sign in again.', { icon: '\ud83d\udd12' });
      }
    }, 10000);
    return () => {
      evs.forEach((e) => window.removeEventListener(e, bump));
      window.clearInterval(iv);
    };
  }, [touch, check]);

  function lock() {
    audit('Signed out');
    end();
    toast.success('Admin locked.');
  }

  const content = {
    overview: <Overview go={setTab} />,
    lectures: <Lectures />,
    courses: <Courses />,
    slots: <SlotsTab />,
    registrations: <Registrations />,
    payments: <PaymentsTab />,
    appointments: <AppointmentsTab />,
    content: <ContentTab />,
    homepage: <HomepageTab />,
    brand: <BrandTab />,
    security: <SecurityTab onLock={lock} />,
  }[tab];

  return (
    <div className="min-h-screen bg-mist lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen flex-col bg-navy p-5 text-white lg:flex">
        <div className="flex items-center gap-3 px-2 py-2">
          <Logo size={40} />
          <div className="leading-tight">
            <p className="font-display font-extrabold">Rehabilified&trade;</p>
            <p className="text-xs text-white/50">Admin dashboard</p>
          </div>
        </div>
        <nav className="mt-6 flex-1 space-y-1 overflow-y-auto">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => setTab(n.id)} className={cn('flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition', tab === n.id ? 'bg-royal text-white shadow-lg shadow-royal/30' : 'text-white/65 hover:bg-white/10 hover:text-white')}>
              <n.icon className="h-4 w-4" /> {n.label}
            </button>
          ))}
        </nav>
        <div className="space-y-2 border-t border-white/10 pt-4">
          <Link to="/" onClick={end} className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white/65 hover:bg-white/10 hover:text-white">
            View website
          </Link>
          <button onClick={lock} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white/65 hover:bg-white/10 hover:text-white">
            <LogOut className="h-4 w-4" /> Lock & sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-royal/10 bg-white/90 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-3">
              <Logo size={36} />
              <span className="font-display font-extrabold">Admin</span>
            </div>
            <div className="flex gap-2">
              <Link to="/" onClick={end} className="btn btn-outline !px-4 !py-2">Site</Link>
              <button className="btn btn-ghost !px-3 !py-2" onClick={lock} aria-label="Lock admin"><LogOut className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto px-4 pb-2">
            {NAV.map((n) => (
              <button key={n.id} onClick={() => setTab(n.id)} className={cn('whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition', tab === n.id ? 'bg-royal text-white' : 'text-navy/60 hover:bg-sky')}>
                {n.label}
              </button>
            ))}
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-10">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3 text-xs text-navy/55 shadow-sm">
            <span className="flex items-center gap-2 font-semibold text-emerald-700"><ShieldCheck className="h-4 w-4" /> Secure session active &middot; auto-locks after 15 min idle</span>
            <span>Changes save to the server and show on every device</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28, ease: EASE }}>
              {content}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export function Admin() {
  useNoIndex();
  useSEO('Admin | Rehabilified\u2122', 'Rehabilified admin dashboard');
  const active = useAdminSession((s) => s.active);
  return active ? <Shell /> : <Gate />;
}
