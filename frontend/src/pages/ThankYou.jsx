import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Loader2, Video } from 'lucide-react';
import { useDB } from '../lib/store';
import { fmtDate, fmtTime, inr } from '../lib/format';
import { useSEO } from '../lib/seo';
import { EASE, FloatingShapes } from '../components/ui';

const API = process.env.REACT_APP_BACKEND_URL;

export function ThankYou() {
  useSEO('Thank you | Rehabilified\u2122', 'Your booking with Rehabilified is confirmed.');
  const { type, id } = useParams();
  const lectures = useDB((s) => s.lectures);
  const registrations = useDB((s) => s.registrations);
  const courses = useDB((s) => s.courses);
  const enrollments = useDB((s) => s.enrollments);
  const bookings = useDB((s) => s.bookings);
  const slots = useDB((s) => s.slots);

  const [serverPurchase, setServerPurchase] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch server purchase if id looks like a purchase_id (pur_xxx)
  useEffect(() => {
    if (!id?.startsWith('pur_')) return;
    setLoading(true);
    fetch(`${API}/api/purchases`, { credentials: 'include' })
      .then((r) => r.ok ? r.json() : [])
      .then((all) => {
        const match = all.find((p) => p.purchase_id === id);
        if (match) setServerPurchase(match);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  let email = '';
  let title = '';
  let detail = '';
  let amount = 0;
  let accessLink = '';
  let next = { to: '/dashboard', label: 'Go to my dashboard' };
  let found = false;

  if (serverPurchase) {
    // Server-backed purchase record
    found = true;
    email = serverPurchase.email || '';
    title = serverPurchase.item_title || '';
    amount = serverPurchase.amount || 0;
    accessLink = serverPurchase.access_link || '';

    if (serverPurchase.type === 'registration') {
      const l = lectures.find((x) => x.id === serverPurchase.item_id);
      if (l) {
        detail = `${fmtDate(l.date)} \u00b7 ${fmtTime(l.time)} IST \u00b7 ${l.mode}`;
        accessLink = accessLink || l.joinLink || '';
      }
    } else if (serverPurchase.type === 'enrollment') {
      detail = 'Instant access \u2014 open your course from the dashboard';
      next = { to: '/dashboard', label: 'Open my dashboard' };
      if (!accessLink) {
        const c = courses.find((x) => x.id === serverPurchase.item_id);
        accessLink = c?.link || '';
      }
    } else if (serverPurchase.type === 'booking') {
      title = title || '1:1 Career Clarity Consultation';
      if (serverPurchase.slot_date) {
        detail = `${fmtDate(serverPurchase.slot_date)} \u00b7 ${fmtTime(serverPurchase.slot_time)} IST \u00b7 Video call`;
      }
    }
  } else if (!loading) {
    // Fallback to local Zustand state (for free items or legacy IDs)
    if (type === 'lecture') {
      const r = registrations.find((x) => x.id === id);
      const l = r && lectures.find((x) => x.id === r.lectureId);
      if (r && l) {
        found = true;
        email = r.email; title = l.title; amount = r.amount; accessLink = l.joinLink || '';
        detail = `${fmtDate(l.date)} \u00b7 ${fmtTime(l.time)} IST \u00b7 ${l.mode}`;
      }
    } else if (type === 'course') {
      const e = enrollments.find((x) => x.id === id);
      const c = e && courses.find((x) => x.id === e.courseId);
      if (e && c) {
        found = true;
        email = e.email; title = c.title; amount = e.amount; accessLink = c.link || '';
        detail = 'Instant access \u2014 open your course from the dashboard';
        next = { to: '/dashboard', label: 'Open my dashboard' };
      }
    } else if (type === 'consultation') {
      const b = bookings.find((x) => x.id === id);
      const s = b && slots.find((x) => x.id === b.slotId);
      if (b && s) {
        found = true;
        email = b.email; title = '1:1 Career Clarity Consultation'; amount = b.amount;
        detail = `${fmtDate(s.date)} \u00b7 ${fmtTime(s.time)} IST \u00b7 Video call`;
      }
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-mist px-5 pt-36">
        <div className="flex items-center gap-2 text-navy/50"><Loader2 className="h-5 w-5 animate-spin" /> Loading your booking...</div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-mist px-5 pb-20 pt-36">
      <FloatingShapes />
      <div className="relative mx-auto max-w-xl text-center">
        {!found ? (
          <>
            <h1 className="text-3xl font-extrabold">We couldn&rsquo;t find that booking</h1>
            <p className="mt-3 text-navy/60">It may have been opened on a different browser. Check your dashboard instead.</p>
            <Link to="/dashboard" className="btn btn-primary mt-8">Open dashboard</Link>
          </>
        ) : (
          <>
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 14 }} className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-royal text-white shadow-xl shadow-royal/30">
              <Check className="h-10 w-10" />
            </motion.span>
            <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, ease: EASE }} className="mt-8 text-3xl font-extrabold sm:text-4xl">
              Thank you &mdash; you&rsquo;re all set!
            </motion.h1>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, ease: EASE }} className="mt-8 rounded-3xl bg-white p-6 text-left shadow-xl shadow-royal/10">
              <p className="text-xs font-semibold uppercase tracking-widest text-royal">Your booking</p>
              <p className="mt-2 text-xl font-bold">{title}</p>
              {detail && <p className="mt-1 text-sm text-navy/60">{detail}</p>}
              <p className="mt-3 text-sm font-semibold text-navy">Amount: {inr(amount)}</p>
              {accessLink && (
                <a href={accessLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-5 w-full" data-testid="thankyou-access-link">
                  {type === 'lecture' || serverPurchase?.type === 'registration' ? <><Video className="h-4 w-4" /> Join link</> : <>Open course <ArrowRight className="h-4 w-4" /></>}
                </a>
              )}
              <p className="mt-5 rounded-xl bg-sky p-3 text-xs text-navy/70">
                Your booking is confirmed{email ? <> for <strong>{email}</strong></> : ''}. You can view these details anytime in your dashboard.
              </p>
            </motion.div>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to={next.to} className="btn btn-primary">{next.label} <ArrowRight className="h-4 w-4" /></Link>
              <Link to="/" className="btn btn-outline">Back to home</Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
