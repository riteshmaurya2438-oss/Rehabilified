import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRight, Check, Lock, Play, Video } from 'lucide-react';
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
  const progress = useDB((s) => s.progress);
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
            <button className="btn btn-outline" onClick={() => { signOut(); toast.success('Signed out'); }}>Sign out</button>
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

          {tab === 'courses' && (myEnrolls.length === 0 ? <Empty text={'You haven\u2019t enrolled in a course yet.'} to="/" label="Explore courses" /> : myEnrolls.map((e) => {
            const c = courses.find((x) => x.id === e.courseId);
            if (!c) return null;
            const done = (progress[`${user.id}:${c.id}`] ?? []).length;
            const pct = c.lessons.length ? Math.round((done / c.lessons.length) * 100) : 0;
            return (
              <div key={e.id} className="card">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold">{c.title}</h3>
                    <p className="text-sm text-navy/60">{done} of {c.lessons.length} lessons completed</p>
                  </div>
                  <Link to={`/learn/${c.id}`} className="btn btn-primary">Open course <ArrowRight className="h-4 w-4" /></Link>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-sky"><div className="h-full rounded-full bg-royal transition-all" style={{ width: `${pct}%` }} /></div>
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

/* ---------------- Lesson player (locked until paid) ---------------- */
export function Learn() {
  const { courseId } = useParams();
  const user = useSession((s) => s.user);
  const course = useDB((s) => s.courses.find((c) => c.id === courseId));
  const enrollments = useDB((s) => s.enrollments);
  const progress = useDB((s) => s.progress);
  const toggleLesson = useDB((s) => s.toggleLesson);
  const openCheckout = useUI((s) => s.openCheckout);
  const openAuth = useUI((s) => s.openAuth);
  const [activeId, setActiveId] = useState('');
  useSEO(course ? `${course.title} | Rehabilified\u2122` : 'Course | Rehabilified\u2122', 'Course lessons from Rehabilified.');

  if (!course) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5 pt-24 text-center">
        <div><h1 className="text-2xl font-extrabold">Course not found</h1><Link to="/" className="btn btn-primary mt-5">Back home</Link></div>
      </main>
    );
  }

  const owned = !!user && enrollments.some((e) => e.courseId === course.id && e.userId === user.id);
  const key = user ? `${user.id}:${course.id}` : '';
  const doneIds = progress[key] ?? [];
  const lesson = course.lessons.find((l) => l.id === activeId) ?? course.lessons[0];
  const modules = groupByModule(course);

  return (
    <main className="min-h-screen bg-mist px-5 pb-20 pt-28 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link to="/dashboard" className="text-sm font-semibold text-royal hover:underline">\u2190 Dashboard</Link>
        <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{course.title}</h1>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div>
            {owned && lesson ? (
              <div className="overflow-hidden rounded-3xl bg-white shadow-xl shadow-royal/10">
                <video key={lesson.id} src={lesson.videoUrl} controls controlsList="nodownload" className="aspect-video w-full bg-navy" />
                <div className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-royal">{lesson.module}</p>
                    <h2 className="text-lg font-bold">{lesson.title}</h2>
                  </div>
                  <button className={cn('btn', doneIds.includes(lesson.id) ? 'btn-outline' : 'btn-primary')} onClick={() => toggleLesson(key, lesson.id)}>
                    <Check className="h-4 w-4" /> {doneIds.includes(lesson.id) ? 'Completed' : 'Mark as complete'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex aspect-video flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-navy to-royal-dark p-8 text-center text-white shadow-xl">
                <Lock className="h-12 w-12" />
                <h2 className="mt-4 text-2xl font-extrabold">This course is locked</h2>
                <p className="mt-2 max-w-sm text-sm text-white/75">Enroll to unlock all {course.lessons.length} video lessons instantly after payment.</p>
                <button className="btn mt-6 bg-white text-royal hover:bg-sky" onClick={() => (user ? openCheckout({ kind: 'course', refId: course.id }) : openAuth())}>
                  {user ? `Enroll \u00b7 ${inr(course.price)}` : 'Sign in to enroll'}
                </button>
              </div>
            )}
          </div>

          <aside className="rounded-3xl bg-white p-5 shadow-sm">
            <h3 className="font-bold">Course content</h3>
            <div className="mt-4 space-y-5">
              {modules.map(([mod, lessons]) => (
                <div key={mod}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-navy/50">{mod}</p>
                  <ul className="mt-2 space-y-1.5">
                    {lessons.map((l) => (
                      <li key={l.id}>
                        <button disabled={!owned} onClick={() => setActiveId(l.id)} className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition', lesson?.id === l.id && owned ? 'bg-sky font-semibold text-royal' : 'hover:bg-mist', !owned && 'cursor-not-allowed opacity-70')}>
                          <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white', owned ? (doneIds.includes(l.id) ? 'bg-emerald-500' : 'bg-royal') : 'bg-navy/30')}>
                            {!owned ? <Lock className="h-3 w-3" /> : doneIds.includes(l.id) ? <Check className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                          </span>
                          <span className="flex-1">{l.title}</span>
                          <span className="text-xs text-navy/45">{l.duration}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function groupByModule(course) {
  const map = new Map();
  course.lessons.forEach((l) => map.set(l.module, [...(map.get(l.module) ?? []), l]));
  return Array.from(map.entries());
}
