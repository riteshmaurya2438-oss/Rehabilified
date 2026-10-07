import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Info, ShieldCheck } from 'lucide-react';
import { Modal } from './ui';
import { useDB, useSession } from '../lib/store';
import { useUI } from '../lib/ui';
import { LIVE, makePayment, requestPayment } from '../lib/payments';
import { fmtDate, fmtTime, inr } from '../lib/format';

const validEmail = (e) => /^\S+@\S+\.\S+$/.test(e.trim());
const validPhone = (p) => p.replace(/\D/g, '').length >= 10;

/* ---------------- Sign in ---------------- */
export function AuthModal() {
  const open = useUI((s) => s.authOpen);
  const close = useUI((s) => s.closeAuth);
  const signIn = useSession((s) => s.signIn);
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  function submit(e) {
    e.preventDefault();
    if (name.trim().length < 2 || !validEmail(email)) {
      toast.error('Please enter your name and a valid email address.');
      return;
    }
    signIn(name, email);
    toast.success(`Welcome, ${name.trim().split(' ')[0]}!`);
    close();
    navigate('/dashboard');
  }

  function google() {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  }

  return (
    <Modal open={open} onClose={close} title="Sign in to your student account">
      <p className="mt-2 text-sm text-navy/60">Access your registrations, courses and bookings in one place.</p>
      <button onClick={google} className="btn btn-outline mt-6 w-full">
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 01-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
          <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.5 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0012 24z" />
          <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 010-4.8V6.5H1.4a12 12 0 000 11z" />
          <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 001.4 6.5l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
        </svg>
        Continue with Google
      </button>
      <div className="my-5 flex items-center gap-3 text-xs text-navy/40">
        <span className="h-px flex-1 bg-navy/10" />
        or use email
        <span className="h-px flex-1 bg-navy/10" />
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="auth-name">Full name</label>
          <input id="auth-name" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="auth-email">Email</label>
          <input id="auth-email" type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
        </div>
        <button className="btn btn-primary w-full">Continue</button>
      </form>
      {!LIVE && (
        <p className="mt-4 flex gap-2 rounded-xl bg-sky p-3 text-xs text-navy/70">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-royal" />
          Demo mode: accounts are stored in this browser only. Connect a backend for real email/Google authentication.
        </p>
      )}
    </Modal>
  );
}

/* ---------------- Checkout (lecture / course / consultation) ---------------- */
export function CheckoutModal() {
  const target = useUI((s) => s.checkout);
  const close = useUI((s) => s.closeCheckout);
  const lectures = useDB((s) => s.lectures);
  const courses = useDB((s) => s.courses);
  const slots = useDB((s) => s.slots);
  const consultPrice = useDB((s) => s.settings.consultationPrice);
  const user = useSession((s) => s.user);
  const signIn = useSession((s) => s.signIn);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Physiotherapy student');
  const [goal, setGoal] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (target) {
      setName(user?.name ?? '');
      setEmail(user?.email ?? '');
      setPhone('');
      setGoal('');
      setBusy(false);
    }
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  let info = null;
  if (target?.kind === 'lecture') {
    const l = lectures.find((x) => x.id === target.refId);
    if (l) info = { title: l.title, subtitle: `${fmtDate(l.date)} \u00b7 ${fmtTime(l.time)} IST \u00b7 ${l.mode}`, amount: l.price };
  } else if (target?.kind === 'course') {
    const c = courses.find((x) => x.id === target.refId);
    if (c) info = { title: c.title, subtitle: `${c.lessons.length} video lessons \u00b7 lifetime access`, amount: c.price };
  } else if (target?.kind === 'consultation') {
    const s = slots.find((x) => x.id === target.refId);
    if (s) info = { title: '1:1 Career Clarity Consultation', subtitle: `${fmtDate(s.date)} \u00b7 ${fmtTime(s.time)} IST \u00b7 Video call`, amount: consultPrice };
  }

  async function submit(e) {
    e.preventDefault();
    if (!target || !info) return;
    if (name.trim().length < 2) {
      toast.error('Please enter your full name.');
      return;
    }
    if (!validEmail(email)) {
      toast.error('Please enter a valid email address.');
      return;
    }
    if (!validPhone(phone)) {
      toast.error('Please enter a valid phone number.');
      return;
    }
    if (target.kind === 'consultation' && goal.trim().length < 5) {
      toast.error('Please tell us briefly what you would like clarity on.');
      return;
    }

    setBusy(true);
    try {
      const store = useDB.getState();
      // Check availability BEFORE taking payment.
      const pre = target.kind === 'lecture' ? store.checkLecture(target.refId, email) : target.kind === 'consultation' ? store.checkSlot(target.refId) : null;
      if (pre) {
        toast.error(pre);
        return;
      }

      const u = signIn(name, email);
      let paymentId;
      if (info.amount > 0) {
        const p = await requestPayment({ kind: target.kind, refId: target.refId, label: info.title, amount: info.amount, name: u.name, email: u.email, phone });
        if (!p) return; // payment window closed
        store.addPayment(p);
        if (p.status !== 'paid') {
          toast.error('The payment was not completed. You have not been charged.');
          return;
        }
        paymentId = p.paymentId;
      }

      if (target.kind === 'lecture') {
        const r = store.registerLecture({ lectureId: target.refId, user: u, phone, amount: info.amount, paymentId });
        if (!r.ok) {
          toast.error(r.error);
          return;
        }
        close();
        toast.success('You are registered!');
        navigate(`/thank-you/lecture/${r.data.id}`);
      } else if (target.kind === 'course') {
        const r = store.enroll({ courseId: target.refId, user: u, phone, amount: info.amount, paymentId });
        if (!r.ok) {
          toast.error(r.error);
          return;
        }
        close();
        toast.success('Course unlocked!');
        navigate(`/thank-you/course/${r.data.id}`);
      } else {
        const r = store.bookConsultation({ slotId: target.refId, user: u, phone, goal: `${role} \u2014 ${goal.trim()}`, amount: info.amount, paymentId });
        if (!r.ok) {
          toast.error(r.error);
          return;
        }
        close();
        toast.success('Consultation booked!');
        navigate(`/thank-you/consultation/${r.data.id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const free = !!info && info.amount === 0;
  return (
    <Modal open={!!target} onClose={close} title={target?.kind === 'consultation' ? 'Confirm your consultation' : target?.kind === 'course' ? 'Enroll in this course' : 'Register for this lecture'} wide>
      {!info ? (
        <p className="mt-4 text-sm text-navy/60">This item is no longer available.</p>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div className="rounded-2xl bg-sky p-4">
            <p className="font-semibold text-navy">{info.title}</p>
            <p className="mt-1 text-sm text-navy/65">{info.subtitle}</p>
            <p className="mt-3 font-display text-2xl font-extrabold text-royal">{inr(info.amount)}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="co-name">Full name</label>
              <input id="co-name" className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </div>
            <div>
              <label className="label" htmlFor="co-email">Email</label>
              <input id="co-email" type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="co-phone">Phone / WhatsApp</label>
              <input id="co-phone" type="tel" className="field" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" autoComplete="tel" />
            </div>
            {target?.kind === 'consultation' && (
              <>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="co-role">I am a</label>
                  <select id="co-role" className="field" value={role} onChange={(e) => setRole(e.target.value)}>
                    <option>Physiotherapy student</option>
                    <option>Intern</option>
                    <option>Practising physiotherapist</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="co-goal">What would you like clarity on?</label>
                  <textarea id="co-goal" rows={3} className="field" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder={'e.g. choosing a specialisation, ICU career path, MPT planning\u2026'} />
                </div>
              </>
            )}
          </div>
          <button className="btn btn-primary w-full py-3.5" disabled={busy}>
            {busy ? 'Please wait\u2026' : free ? 'Register for free' : `Pay ${inr(info.amount)} securely`}
          </button>
          {!free && (
            <p className="flex items-center justify-center gap-2 text-xs text-navy/50">
              <ShieldCheck className="h-4 w-4 text-royal" /> Secure payment via Razorpay (INR)
            </p>
          )}
        </form>
      )}
    </Modal>
  );
}

/* ---------------- Demo payment window ---------------- */
export function PayModal() {
  const pay = useUI((s) => s.pay);
  const [busy, setBusy] = useState(false);

  function dismiss() {
    pay?.resolve(null);
    useUI.setState({ pay: null });
  }

  function finish(status) {
    if (!pay) return;
    setBusy(true);
    window.setTimeout(() => {
      pay.resolve(makePayment(pay.req, { status, mode: 'demo', verified: false }));
      useUI.setState({ pay: null });
      setBusy(false);
    }, 900);
  }

  return (
    <Modal open={!!pay} onClose={dismiss} title="Razorpay checkout (demo)" z="z-[80]">
      {pay && (
        <div className="mt-4 space-y-4">
          <div className="rounded-2xl border border-royal/15 p-4">
            <p className="text-sm text-navy/60">Paying Rehabilified&trade;</p>
            <p className="font-semibold text-navy">{pay.req.label}</p>
            <p className="mt-2 font-display text-3xl font-extrabold text-royal">{inr(pay.req.amount)}</p>
          </div>
          <p className="flex gap-2 rounded-xl bg-sky p-3 text-xs text-navy/70">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-royal" />
            No real money moves in demo mode. Connect a backend to switch to live Razorpay checkout.
          </p>
          <button className="btn btn-primary w-full" disabled={busy} onClick={() => finish('paid')}>
            {busy ? 'Processing\u2026' : `Pay ${inr(pay.req.amount)}`}
          </button>
          <button className="btn btn-ghost w-full" disabled={busy} onClick={() => finish('failed')}>
            Simulate a failed payment
          </button>
        </div>
      )}
    </Modal>
  );
}
