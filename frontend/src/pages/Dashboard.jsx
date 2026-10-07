import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRight, Video } from 'lucide-react';
import { useDB, useSession } from '../lib/store';
import { useUI } from '../lib/ui';
import { fmtDate, fmtTime, inr } from '../lib/format';
import { useSEO } from '../lib/seo';
import { Reveal } from '../components/ui';
import { cn } from '../utils/cn';

function Empty({ text, to, label }) {
  return (
    <div className="rounded-3xl border border-dashed border-royal/25 bg-white p-12 text-center">
      <p className="text-navy/60">{text}</p>
      <Link to={to} className="btn btn-primary mt-5">{label}</Link>
    </div>
  );
}

/* ---------------- Student dashboard ---------------- */
export function Dashboard() {
  useSEO('My dashboard | Rehabilified\u2122', 'Your lecture registrations, courses and bookings.');
  const user = useSession((s) => s.user);
  const signOut = useSession((s) => s.signOut);
  const openAuth = useUI((s) => s.openAuth);
  const lectures = useDB((s) => s.lectures);
  const registrations = useDB((s) => s.registrations);
  const courses = useDB((s) => s.courses);
  const enrollments = useDB((s) => s.enrollments);
  const bookings = useDB((s) => s.bookings);
  const slots = useDB((s) => s.slots);
  const cancelBooking = useDB((s) => s.cancelBooking);
  const [tab, setTab] = useState('reg');

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-mist px-5 pt-24">
        <div className="max-w-md rounded-3xl bg-white p-10 text-center shadow-xl shadow-royal/10">
          <h1 className="text-2xl font-extrabold">Sign in to see your dashboard</h1>
          <p className="mt-3 text-navy/60">Your registrations, courses and bookings live here.</p>
          <button className="btn btn-primary mt-6" onClick={openAuth}>Sign in</button>
        </div>
      </main>
    );
  }

  const myRegs = registrations.filter((r) => r.userId === user.id);
  const myEnrolls = enrollments.filter((e) => e.userId === user.id);
  const myBookings = bookings.filter((b) => b.userId === user.id);
  const tabs = [
    { id: 'reg', label: 'My Registrations', n: myRegs.length },
    { id: 'courses', label: 'My Courses', n: myEnrolls.length },
    { id: 'book', label: 'My Bookings', n: myBookings.length },
  ];

  return (
    <main className="min-h-screen bg-mist px-5 pb-24 pt-32 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-royal">Student dashboard</p>
              <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">Hello, {user.name.split(' ')[0]} 👋</h1>
              <p className="text-sm text-navy/55">{user.email}</p>
            </div>
            <button className="btn btn-outline" onClick={async () => { try { await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' }); } catch (e) { /* ignore */ } signOut(); toast.success('Signed out'); }}>Sign out</button>
          </div>
        </Reveal>

        <div className="mt-8 flex gap-2 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-sm">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={cn('flex-1 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition', tab === t.id ? 'bg-royal text-white shadow-lg shadow-royal/25' : 'text-navy/60 hover:bg-sky')}>
              {t.label} <span className={cn('ml-1 rounded-full px-2 py-0.5 text-xs', tab === t.id ? 'bg-white/20' : 'bg-sky text-royal')}>{t.n}</span>
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-4">
          {tab === 'reg' && (myRegs.length === 0 ? <Empty text={'You haven\u2019t registered for any lectures yet.'} to="/" label="Browse lectures" /> : myRegs.map((r) => {
            const l = lectures.find((x) => x.id === r.lectureId);
            if (!l) return null;
            return (
              <div key={r.id} className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-bold">{l.title}</h3>
                  <p className="mt-1 text-sm text-navy/60">{fmtDate(l.date)} &middot; {fmtTime(l.time)} IST &middot; {l.mode} &middot; {inr(r.amount)}</p>
                </div>
                <a href={l.joinLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary shrink-0"><Video className="h-4 w-4" /> Join link</a>
              </div>
            );
          }))}

          {tab === 'courses' && (myEnrolls.length === 0 ? <Empty text={'You haven\u2019t purchased a course yet.'} to="/" label="Explore courses" /> : myEnrolls.map((e) => {
            const c = courses.find((x) => x.id === e.courseId);
            if (!c) return null;
            return (
              <div key={e.id} className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-bold">{c.title}</h3>
                  <p className="text-sm text-navy/60">Purchased &middot; {inr(e.amount)} &middot; instant access</p>
                </div>
                <a href={c.link} target="_blank" rel="noopener noreferrer" className="btn btn-primary shrink-0">Open course <ArrowRight className="h-4 w-4" /></a>
              </div>
            );
          }))}

          {tab === 'book' && (myBookings.length === 0 ? <Empty text={'You haven\u2019t booked a consultation yet.'} to="/" label="Book a 1:1 consultation" /> : myBookings.map((b) => {
            const s = slots.find((x) => x.id === b.slotId);
            return (
              <div key={b.id} className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-bold">1:1 Career Clarity Consultation</h3>
                  <p className="mt-1 text-sm text-navy/60">{s ? `${fmtDate(s.date)} \u00b7 ${fmtTime(s.time)} IST` : 'Slot removed'} &middot; {inr(b.amount)}</p>
                  <span className={cn('mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold', b.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>{b.status}</span>
                </div>
                {b.status === 'confirmed' && (
                  <button className="btn btn-outline shrink-0" onClick={() => { if (window.confirm('Cancel this booking? The slot will be released.')) { cancelBooking(b.id); toast.success('Booking cancelled. Contact us on WhatsApp for any refund.'); } }}>Cancel</button>
                )}
              </div>
            );
          }))}
        </div>
      </div>
    </main>
  );
}
