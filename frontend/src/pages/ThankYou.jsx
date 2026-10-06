import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Video } from 'lucide-react';
import { useDB } from '../lib/store';
import { LIVE } from '../lib/payments';
import { fmtDate, fmtTime, inr } from '../lib/format';
import { useSEO } from '../lib/seo';
import { EASE, FloatingShapes } from '../components/ui';

export function ThankYou() {
  useSEO('Thank you | Rehabilified\u2122', 'Your booking with Rehabilified is confirmed.');
  const { type, id } = useParams();
  const lectures = useDB((s) => s.lectures);
  const registrations = useDB((s) => s.registrations);
  const courses = useDB((s) => s.courses);
  const enrollments = useDB((s) => s.enrollments);
  const bookings = useDB((s) => s.bookings);
  const slots = useDB((s) => s.slots);

  let email = '';
  let title = '';
  let detail = '';
  let amount = 0;
  let joinLink = '';
  let next = { to: '/dashboard', label: 'Go to my dashboard' };
  let found = false;

  if (type === 'lecture') {
    const r = registrations.find((x) => x.id === id);
    const l = r && lectures.find((x) => x.id === r.lectureId);
    if (r && l) {
      found = true;
      email = r.email; title = l.title; amount = r.amount; joinLink = l.joinLink;
      detail = `${fmtDate(l.date)} \u00b7 ${fmtTime(l.time)} IST \u00b7 ${l.mode}`;
    }
  } else if (type === 'course') {
    const e = enrollments.find((x) => x.id === id);
    const c = e && courses.find((x) => x.id === e.courseId);
    if (e && c) {
      found = true;
      email = e.email; title = c.title; amount = e.amount;
      detail = `${c.lessons.length} lessons unlocked`;
      next = { to: `/learn/${c.id}`, label: 'Start learning' };
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
              <p className="mt-1 text-sm text-navy/60">{detail}</p>
              <p className="mt-3 text-sm font-semibold text-navy">Amount: {inr(amount)}</p>
              {joinLink && (
                <a href={joinLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-5 w-full">
                  <Video className="h-4 w-4" /> Join link
                </a>
              )}
              <p className="mt-5 rounded-xl bg-sky p-3 text-xs text-navy/70">
                {LIVE ? 'A confirmation email has been sent to ' : 'Demo mode \u2014 in live mode a confirmation email is sent to '}
                <strong>{email}</strong>.
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
