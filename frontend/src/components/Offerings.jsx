import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRight, BookOpen, Check, Clock, Play, ShieldAlert, Users, Video } from 'lucide-react';
import { Reveal, SectionHeading } from './ui';
import { useDB, useSession } from '../lib/store';
import { useUI } from '../lib/ui';
import { dayNum, fmtDate, fmtTime, inr, monthShort, todayISO, weekdayShort } from '../lib/format';
import { cn } from '../utils/cn';

/* ---------------- 4. Upcoming lectures (dynamic) ---------------- */
export function LecturesSection() {
  const lectures = useDB((s) => s.lectures);
  const regs = useDB((s) => s.registrations);
  const user = useSession((s) => s.user);
  const openCheckout = useUI((s) => s.openCheckout);

  const list = useMemo(
    () => lectures.filter((l) => l.published && l.date >= todayISO()).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
    [lectures],
  );

  return (
    <section id="lectures" className="relative bg-mist py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading eyebrow="Upcoming lectures" title="Live, clinically-led sessions" sub="Short, focused lectures that connect theory to real clinical decisions. Free and paid sessions, all taught live by Dr. Sayyeda." />
        {list.length === 0 ? (
          <Reveal className="mt-14 rounded-3xl border border-dashed border-royal/25 bg-white p-12 text-center">
            <p className="font-display text-xl font-bold">New lectures are being scheduled</p>
            <p className="mt-2 text-navy/60">Follow us on Instagram or WhatsApp to hear first.</p>
          </Reveal>
        ) : (
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {list.map((l, i) => {
              const taken = regs.filter((r) => r.lectureId === l.id).length;
              const left = Math.max(0, l.seats - taken);
              const mine = !!user && regs.some((r) => r.lectureId === l.id && r.userId === user.id);
              return (
                <Reveal key={l.id} delay={i * 0.08} className="h-full">
                  <article className="card flex h-full flex-col">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-royal text-white">
                        <span className="font-display text-2xl font-extrabold leading-none">{dayNum(l.date)}</span>
                        <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider">{monthShort(l.date)}</span>
                      </div>
                      <span className={cn('rounded-full px-3 py-1 text-sm font-bold', l.price === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-sky text-royal')}>{inr(l.price)}</span>
                    </div>
                    <h3 className="mt-5 text-xl font-bold leading-snug text-navy">{l.title}</h3>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-navy/65">{l.description}</p>
                    <ul className="mt-5 flex flex-wrap gap-2 text-xs font-medium text-navy/70">
                      <li className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1.5"><Clock className="h-3.5 w-3.5 text-royal" />{weekdayShort(l.date)} &middot; {fmtTime(l.time)} IST</li>
                      <li className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1.5"><Video className="h-3.5 w-3.5 text-royal" />{l.mode}</li>
                      <li className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5', left <= 10 ? 'bg-amber-50 text-amber-700' : 'bg-mist')}><Users className="h-3.5 w-3.5 text-royal" />{left > 0 ? `${left} seats left` : 'Full'}</li>
                    </ul>
                    {mine ? (
                      <Link to="/dashboard" className="btn btn-outline mt-6 w-full"><Check className="h-4 w-4" /> Registered &mdash; view details</Link>
                    ) : (
                      <button className="btn btn-primary mt-6 w-full" disabled={left === 0} onClick={() => openCheckout({ kind: 'lecture', refId: l.id })}>
                        {left === 0 ? 'Sold out' : l.price === 0 ? '\u0052egister \u2014 it\u2019s free' : `Register \u00b7 ${inr(l.price)}`}
                        {left > 0 && <ArrowRight className="h-4 w-4" />}
                      </button>
                    )}
                  </article>
                </Reveal>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------------- 5. Courses (dynamic) ---------------- */
export function CoursesSection() {
  const courses = useDB((s) => s.courses).filter((c) => c.published);
  const enrollments = useDB((s) => s.enrollments);
  const user = useSession((s) => s.user);
  const openCheckout = useUI((s) => s.openCheckout);

  return (
    <section id="courses" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading eyebrow="Courses" title="Learn at your own pace" sub="Structured video courses with modules you can revisit anytime. Lessons unlock the moment your payment is confirmed." />
        {courses.length === 0 ? (
          <p className="mt-14 text-center text-navy/60">Courses are coming soon.</p>
        ) : (
          <div className="mt-14 grid gap-8 md:grid-cols-2">
            {courses.map((c, i) => {
              const owned = !!user && enrollments.some((e) => e.courseId === c.id && e.userId === user.id);
              const modules = new Set(c.lessons.map((l) => l.module)).size;
              return (
                <Reveal key={c.id} delay={i * 0.1} className="h-full">
                  <article className="card flex h-full flex-col overflow-hidden !p-0">
                    <div className="relative aspect-[16/8] overflow-hidden bg-gradient-to-br from-royal via-royal-dark to-navy">
                      {c.thumbnail ? (
                        <img src={c.thumbnail} alt={c.title} loading="lazy" className="h-full w-full object-cover transition duration-700 hover:scale-105" />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <BookOpen className="h-14 w-14 text-white/80" />
                        </div>
                      )}
                      <span className="absolute right-4 top-4 rounded-full bg-white px-4 py-1.5 text-sm font-bold text-royal shadow-lg">{inr(c.price)}</span>
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <h3 className="text-xl font-bold text-navy">{c.title}</h3>
                      <p className="mt-3 flex-1 text-sm leading-relaxed text-navy/65">{c.description}</p>
                      <p className="mt-4 flex items-center gap-4 text-xs font-medium text-navy/60">
                        <span className="inline-flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5 text-royal" />{modules} modules</span>
                        <span className="inline-flex items-center gap-1.5"><Play className="h-3.5 w-3.5 text-royal" />{c.lessons.length} lessons</span>
                      </p>
                      {owned ? (
                        <Link to={`/learn/${c.id}`} className="btn btn-outline mt-5 w-full">Continue learning <ArrowRight className="h-4 w-4" /></Link>
                      ) : (
                        <button className="btn btn-primary mt-5 w-full" onClick={() => openCheckout({ kind: 'course', refId: c.id })}>
                          Enroll &middot; {inr(c.price)} <ArrowRight className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------------- Shared slot picker ---------------- */
function SlotPicker({ kind, selected, onSelect }) {
  const slots = useDB((s) => s.slots);
  const [date, setDate] = useState('');
  const all = useMemo(() => slots.filter((s) => s.kind === kind && s.date >= todayISO()), [slots, kind]);
  const dates = useMemo(() => Array.from(new Set(all.filter((s) => !s.booked).map((s) => s.date))).sort().slice(0, 7), [all]);
  const active = dates.includes(date) ? date : (dates[0] ?? '');
  const day = all.filter((s) => s.date === active).sort((a, b) => a.time.localeCompare(b.time));

  if (dates.length === 0) {
    return <p className="rounded-2xl bg-mist p-5 text-sm text-navy/60">No slots are open right now. Please check back soon or message us on WhatsApp.</p>;
  }
  return (
    <div>
      <p className="label">Choose a date</p>
      <div className="flex w-full max-w-full min-w-0 gap-2 overflow-x-auto pb-2">
        {dates.map((d) => (
          <button
            type="button"
            key={d}
            onClick={() => setDate(d)}
            className={cn('flex min-w-[64px] shrink-0 flex-col items-center rounded-2xl border px-3 py-2.5 transition', d === active ? 'border-royal bg-royal text-white shadow-lg shadow-royal/25' : 'border-royal/15 bg-white hover:border-royal')}
          >
            <span className="text-[11px] font-semibold uppercase">{weekdayShort(d)}</span>
            <span className="font-display text-lg font-extrabold leading-tight">{dayNum(d)}</span>
            <span className="text-[11px]">{monthShort(d)}</span>
          </button>
        ))}
      </div>
      <p className="label mt-4">Choose a time (IST)</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {day.map((s) => (
          <button
            type="button"
            key={s.id}
            disabled={s.booked}
            onClick={() => onSelect(s.id)}
            className={cn(
              'rounded-xl border px-3 py-2.5 text-sm font-semibold transition',
              s.booked ? 'cursor-not-allowed border-navy/10 bg-navy/5 text-navy/30 line-through' : s.id === selected ? 'border-royal bg-royal text-white shadow-lg shadow-royal/25' : 'border-royal/15 bg-white hover:border-royal hover:bg-sky',
            )}
          >
            {fmtTime(s.time)}
            {s.booked && <span className="block text-[10px] font-medium no-underline">Booked</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- 6. Career Clarity 1:1 consultation ---------------- */
export function ConsultationSection() {
  const price = useDB((s) => s.settings.consultationPrice);
  const openCheckout = useUI((s) => s.openCheckout);
  const [slotId, setSlotId] = useState('');
  const points = [
    'Clarity on specialisations: ICU, neuro, musculoskeletal, cardio-respiratory and more',
    'A realistic roadmap for internship, MPT, clinical practice or teaching',
    'Guidance on building clinical confidence and a strong profile',
    'Honest answers to your questions from someone who has walked the path',
  ];
  return (
    <section id="consultation" className="relative overflow-hidden bg-gradient-to-b from-white to-sky/60 py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-2">
        <div>
          <SectionHeading center={false} eyebrow="Career Clarity · 1:1" title="Unsure what comes next in your physio career?" sub="A private video session with Dr. Sayyeda for physiotherapy students and professionals who want direction, not generic advice." />
          <Reveal delay={0.1}>
            <ul className="mt-8 space-y-4">
              {points.map((p) => (
                <li key={p} className="flex items-start gap-3 text-navy/75">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-royal text-white"><Check className="h-3 w-3" /></span>
                  {p}
                </li>
              ))}
            </ul>
            <p className="mt-8 font-display text-4xl font-extrabold text-royal">{inr(price)}<span className="ml-2 text-base font-medium text-navy/50">per session</span></p>
          </Reveal>
        </div>

        <Reveal delay={0.15}>
          <div className="rounded-3xl border border-royal/10 bg-white p-6 shadow-2xl shadow-royal/10 sm:p-8">
            <h3 className="text-xl font-bold">Pick your slot</h3>
            <div className="mt-5"><SlotPicker kind="consultation" selected={slotId} onSelect={setSlotId} /></div>
            <button className="btn btn-primary mt-6 w-full py-3.5" disabled={!slotId} onClick={() => openCheckout({ kind: 'consultation', refId: slotId })}>
              {slotId ? `Book this slot \u00b7 ${inr(price)}` : 'Select a slot to continue'}
            </button>
            <p className="mt-3 text-center text-xs text-navy/50">Each slot can be booked by one person only.</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- 7. Patient appointment ---------------- */
export function AppointmentSection() {
  const request = useDB((s) => s.requestAppointment);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [concern, setConcern] = useState('');
  const [slotId, setSlotId] = useState('');
  const [done, setDone] = useState(null);

  function submit(e) {
    e.preventDefault();
    if (name.trim().length < 2) return void toast.error('Please enter your name.');
    if (phone.replace(/\D/g, '').length < 10) return void toast.error('Please enter a valid phone number.');
    if (concern.trim().length < 10) return void toast.error('Please describe your concern in a few words.');
    if (!slotId) return void toast.error('Please choose a date and time slot.');
    const r = request({ slotId, name: name.trim(), phone: phone.trim(), concern: concern.trim() });
    if (!r.ok) {
      toast.error(r.error);
      setSlotId('');
      return;
    }
    setDone(r.data);
    setName('');
    setPhone('');
    setConcern('');
    setSlotId('');
    toast.success('Appointment request sent!');
  }

  return (
    <section id="appointment" className="py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <SectionHeading eyebrow="Patient appointment" title="Request a physiotherapy appointment" sub="For non-urgent physiotherapy concerns. Choose a convenient slot and our team will confirm with you." />
        <Reveal delay={0.1} className="mt-10">
          <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <p><strong>Not for emergencies.</strong> If you have chest pain, difficulty breathing, severe injury, sudden weakness or any urgent symptoms, call your local emergency number (112 in India) or go to the nearest hospital immediately.</p>
          </div>
        </Reveal>

        <Reveal delay={0.15} className="mt-8">
          {done ? (
            <div className="rounded-3xl border border-royal/10 bg-sky p-10 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-royal text-white"><Check className="h-7 w-7" /></span>
              <h3 className="mt-5 text-2xl font-bold">Request received</h3>
              <p className="mt-2 text-navy/65">{fmtDate(done.date)} at {fmtTime(done.time)} IST is held for you. Our team will confirm shortly on the number you provided.</p>
              <button className="btn btn-outline mt-6" onClick={() => setDone(null)}>Make another request</button>
            </div>
          ) : (
            <form onSubmit={submit} className="grid gap-8 rounded-3xl border border-royal/10 bg-white p-6 shadow-xl shadow-royal/10 sm:p-8 lg:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label className="label" htmlFor="ap-name">Full name</label>
                  <input id="ap-name" className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                </div>
                <div>
                  <label className="label" htmlFor="ap-phone">Phone number</label>
                  <input id="ap-phone" type="tel" className="field" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" autoComplete="tel" />
                </div>
                <div>
                  <label className="label" htmlFor="ap-concern">Your concern</label>
                  <textarea id="ap-concern" rows={5} className="field" value={concern} onChange={(e) => setConcern(e.target.value)} placeholder={'e.g. knee pain for 3 weeks after a fall, stiffness in the morning\u2026'} />
                </div>
              </div>
              <div className="flex flex-col">
                <SlotPicker kind="patient" selected={slotId} onSelect={setSlotId} />
                <button className="btn btn-primary mt-auto w-full py-3.5 lg:mt-6">Request appointment</button>
              </div>
            </form>
          )}
        </Reveal>
      </div>
    </section>
  );
}
