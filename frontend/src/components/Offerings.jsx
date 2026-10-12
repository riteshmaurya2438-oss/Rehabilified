import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertTriangle, ArrowRight, Award, BookOpen, Check, CheckCircle2, Clock, Copy, ExternalLink, GraduationCap, Play, ShieldAlert, ShieldCheck, Users, Video } from 'lucide-react';
import { Modal, Reveal, SectionHeading } from './ui';
import { useDB, useSession } from '../lib/store';
import { useUI } from '../lib/ui';
import { requestPayment } from '../lib/payments';
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
                    <Link to={`/lecture/${l.id}`} className="mt-2 block text-center text-xs font-semibold text-royal/60 hover:text-royal" data-testid={`lecture-deeplink-${l.id}`}>View details &amp; shareable link</Link>
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
        <SectionHeading eyebrow="Courses" title="Learn at your own pace" sub="Self-paced courses by Dr. Sayyeda. Buy once and get instant access to the course link \u2014 no login hassle." />
        {courses.length === 0 ? (
          <p className="mt-14 text-center text-navy/60">Courses are coming soon.</p>
        ) : (
          <div className="mt-14 grid gap-8 md:grid-cols-2">
            {courses.map((c, i) => {
              const owned = !!user && enrollments.some((e) => e.courseId === c.id && e.userId === user.id);
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
                      {c.parts?.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {c.parts.slice(0, 3).map((p, j) => (
                            <p key={j} className="flex items-center gap-2 text-xs text-navy/60">
                              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-royal/10 text-[10px] font-bold text-royal">{j + 1}</span>
                              {p.title}
                            </p>
                          ))}
                          {c.parts.length > 3 && <p className="text-xs font-semibold text-royal/60">+{c.parts.length - 3} more parts</p>}
                        </div>
                      )}
                      <p className="mt-4 flex items-center gap-2 text-xs font-medium text-navy/60">
                        <ShieldCheck className="h-3.5 w-3.5 text-royal" /> Instant access link after payment
                      </p>
                      {owned ? (
                        <a href={c.link} target="_blank" rel="noopener noreferrer" className="btn btn-outline mt-5 w-full">Open course <ExternalLink className="h-4 w-4" /></a>
                      ) : (
                        <button className="btn btn-primary mt-5 w-full" onClick={() => openCheckout({ kind: 'course', refId: c.id })}>
                          Buy &middot; {inr(c.price)} <ArrowRight className="h-4 w-4" />
                        </button>
                      )}
                      <Link to={`/course/${c.id}`} className="mt-2 block text-center text-xs font-semibold text-royal/60 hover:text-royal" data-testid={`course-deeplink-${c.id}`}>View details &amp; shareable link</Link>
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

/* ---------------- 6. Career Clarity Consultation (paid, gated) ---------------- */

function useConsultOptions() {
  const settings = useDB((s) => s.settings);
  return useMemo(() => [
    { id: 'cc-30', short: '30-Minute Consultation', label: '30-Minute Career Clarity Consultation', duration: '30 minutes', price: settings.consultation30Price || 799, blurb: 'A focused session to get clear, honest answers on your most pressing career question.' },
    { id: 'cc-60', short: '60-Minute Consultation', label: '60-Minute Career Clarity Consultation', duration: '60 minutes', price: settings.consultation60Price || 999, blurb: 'A deeper session to map your options, specialisation and a step-by-step plan.', popular: true },
  ], [settings.consultation30Price, settings.consultation60Price]);
}

function useFormUrl() {
  const url = useDB((s) => s.settings.consultationFormUrl);
  return url || 'https://forms.gle/SdUuf9npWgMxzNpj8';
}

const CONSULT_TOPICS = [
  'Career options after BPT',
  'MPT & specialisation choices',
  'Internship / hospital selection',
  'Clinical skill gaps',
  'Clinical confidence',
  'Career planning',
  'Teaching / academic opportunities',
  'Long-term professional direction',
];

const ccEmailOk = (e) => /^\S+@\S+\.\S+$/.test(e.trim());
const ccPhoneOk = (p) => p.replace(/\D/g, '').length >= 10;

export function ConsultationSection() {
  const addPayment = useDB((s) => s.addPayment);
  const consultOptions = useConsultOptions();
  const regFormUrl = useFormUrl();
  const [chosen, setChosen] = useState(null);
  const [step, setStep] = useState('form'); // form | success | failed
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  function book(option) {
    setChosen(option);
    setStep('form');
    setBusy(false);
  }
  function closeModal() {
    if (busy) return;
    setChosen(null);
  }

  async function pay(e) {
    e.preventDefault();
    if (!chosen) return;
    if (name.trim().length < 2) return void toast.error('Please enter your full name.');
    if (!ccEmailOk(email)) return void toast.error('Please enter a valid email address.');
    if (!ccPhoneOk(phone)) return void toast.error('Please enter a valid phone number.');
    setBusy(true);
    try {
      const p = await requestPayment({ kind: 'consultation', refId: chosen.id, label: chosen.label, amount: chosen.price, name: name.trim(), email: email.trim(), phone: phone.trim() });
      if (!p) { setBusy(false); return; } // user closed the payment window — not successful
      if (p.status === 'paid' && p.verified) {
        addPayment({ ...p, name: name.trim(), phone: phone.trim() });
        setStep('success');
      } else {
        setStep('failed');
      }
    } catch (err) {
      setStep('failed');
    } finally {
      setBusy(false);
    }
  }

  function copyLink() {
    navigator.clipboard?.writeText(regFormUrl).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <section id="consultation" className="relative overflow-hidden bg-gradient-to-b from-white to-sky/60 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-sky px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-royal">
            <span className="h-1.5 w-1.5 rounded-full bg-royal" /> Career Clarity &middot; 1:1
          </span>
          <h2 className="mt-5 font-display text-4xl font-extrabold leading-tight text-navy sm:text-5xl">BPT done. What next?</h2>
          <p className="mt-4 text-base leading-relaxed text-navy/65 sm:text-lg">
            Get personalised career clarity from an experienced physiotherapist and educator &mdash; a private 1:1 video consultation with Dr. Sayyeda Uneza Fatima.
          </p>
          <p className="mt-3 text-sm font-semibold text-royal sm:text-base">
            Slots are available only on Monday to Thursday from 2-5 pm.
          </p>
          <p className="mx-auto mt-5 max-w-2xl rounded-2xl bg-white/70 p-4 text-sm leading-relaxed text-navy/65 shadow-sm">
            <strong className="text-navy">BPT</strong> is a Bachelor of Physiotherapy and <strong className="text-navy">MPT</strong> is a Master of Physiotherapy. MPT is a postgraduate option &mdash; it is <em>not</em> automatically compulsory for every physiotherapist. This session helps you decide what genuinely fits your goals.
          </p>
        </Reveal>

        <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
          {consultOptions.map((o, i) => (
            <Reveal key={o.id} delay={i * 0.1} className="h-full">
              <article className={cn('card flex h-full flex-col', o.popular && 'ring-2 ring-royal')}>
                {o.popular && <span className="absolute right-5 top-5 rounded-full bg-royal px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">Most popular</span>}
                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-sky px-3 py-1.5 text-xs font-semibold text-royal"><Clock className="h-3.5 w-3.5" /> {o.duration}</span>
                <h3 className="mt-4 text-xl font-bold text-navy">{o.short}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-navy/65">{o.blurb}</p>
                <p className="mt-5 font-display text-4xl font-extrabold text-royal">{inr(o.price)}<span className="ml-2 text-sm font-medium text-navy/50">one session</span></p>
                <button className="btn btn-primary mt-5 w-full py-3.5" onClick={() => book(o)}>Book Now <ArrowRight className="h-4 w-4" /></button>
              </article>
            </Reveal>
          ))}
        </div>
        <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-navy/55"><ShieldCheck className="h-4 w-4 text-royal" /> Secure online payment via Razorpay &middot; registration link shared only after payment</p>

        <div className="mt-16 grid gap-10 lg:grid-cols-2">
          <Reveal>
            <div className="rounded-3xl border border-royal/10 bg-white p-6 shadow-sm sm:p-8">
              <h3 className="text-lg font-bold text-navy">What we can cover</h3>
              <ul className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {CONSULT_TOPICS.map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-sm text-navy/75"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-royal text-white"><Check className="h-3 w-3" /></span>{t}</li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="rounded-3xl border border-royal/10 bg-navy p-6 text-white shadow-sm sm:p-8">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/80"><Award className="h-3.5 w-3.5" /> Your mentor</span>
              <h3 className="mt-4 font-display text-2xl font-extrabold">Dr. Sayyeda Uneza Fatima (PT)</h3>
              <ul className="mt-4 space-y-2 text-sm text-white/80">
                <li className="flex items-center gap-2"><GraduationCap className="h-4 w-4 text-sky" /> MPT &ndash; Cardiopulmonary &middot; Gold Medalist</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-sky" /> Consultant Physiotherapist</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-sky" /> Visiting Faculty at JMI</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-sky" /> Founder of Rehabilified</li>
              </ul>
              <p className="mt-4 text-sm leading-relaxed text-white/70">9+ years of experience across clinical practice, ICU rehabilitation, teaching, entrepreneurship and digital education.</p>
            </div>
          </Reveal>
        </div>
      </div>

      <Modal open={!!chosen} onClose={closeModal} title={step === 'success' ? 'Payment successful' : step === 'failed' ? 'Payment not confirmed' : 'Career Clarity Consultation'} wide>
        {chosen && step === 'form' && (
          <form onSubmit={pay} className="mt-5 space-y-4">
            <div className="rounded-2xl bg-sky p-4">
              <p className="font-semibold text-navy">{chosen.label}</p>
              <p className="mt-1 flex items-center gap-2 text-sm text-navy/65"><Clock className="h-4 w-4 text-royal" /> {chosen.duration} &middot; 1:1 video call</p>
              <p className="mt-3 font-display text-3xl font-extrabold text-royal">{inr(chosen.price)}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label" htmlFor="cc-name">Full name</label><input id="cc-name" className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>
              <div><label className="label" htmlFor="cc-phone">Phone / WhatsApp</label><input id="cc-phone" type="tel" className="field" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" autoComplete="tel" /></div>
              <div className="sm:col-span-2"><label className="label" htmlFor="cc-email">Email</label><input id="cc-email" type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></div>
            </div>
            <button className="btn btn-primary w-full py-3.5" disabled={busy}>{busy ? 'Opening secure checkout\u2026' : `Pay ${inr(chosen.price)} securely`}</button>
            <p className="flex items-center justify-center gap-2 text-center text-xs text-navy/50"><ShieldCheck className="h-4 w-4 text-royal" /> Secure payment via Razorpay (INR). The registration link is shown only after your payment is confirmed.</p>
          </form>
        )}

        {chosen && step === 'success' && (
          <div className="mt-5">
            <div className="flex flex-col items-center text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white"><CheckCircle2 className="h-9 w-9" /></span>
              <h4 className="mt-4 font-display text-2xl font-extrabold text-navy">Payment Successful &#10003;</h4>
              <p className="mt-2 text-sm text-navy/65">Your consultation payment has been received for the <strong>{chosen.short}</strong> ({inr(chosen.price)}).</p>
            </div>
            <div className="mt-5 rounded-2xl border border-royal/15 bg-sky p-4 text-sm text-navy/75">
              <p className="font-semibold text-navy">Next step: complete the registration form</p>
              <p className="mt-1">Please complete the registration form so Dr. Fatima can receive your details and prepare for your consultation. Your payment is confirmed; the consultation time is arranged after you submit this form.</p>
            </div>
            <a href={regFormUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-5 w-full py-3.5">Complete Registration <ExternalLink className="h-4 w-4" /></a>
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-navy/10 bg-white p-2 pl-3">
              <span className="min-w-0 flex-1 truncate text-xs text-navy/60">{regFormUrl}</span>
              <button type="button" onClick={copyLink} className="btn btn-outline !px-3 !py-2 text-xs">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy'}</button>
            </div>
            <p className="mt-3 text-center text-xs text-navy/45">Keep this link safe &mdash; it is your consultation registration form.</p>
          </div>
        )}

        {chosen && step === 'failed' && (
          <div className="mt-5 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600"><AlertTriangle className="h-9 w-9" /></span>
            <h4 className="mt-4 font-display text-xl font-extrabold text-navy">Payment could not be confirmed. Please try again.</h4>
            <p className="mt-2 text-sm text-navy/65">You have not received the registration link because the payment was not confirmed. If any amount was deducted for a failed attempt, your bank auto-refunds it.</p>
            <button className="btn btn-primary mt-5 w-full py-3.5" onClick={() => setStep('form')}>Try Payment Again</button>
          </div>
        )}
      </Modal>
    </section>
  );
}

/* ---------------- 7. Patient appointment ---------------- */
export function AppointmentSection() {
  const whatsapp = useDB((s) => s.settings.whatsapp);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [concern, setConcern] = useState('');
  const [prefDate, setPrefDate] = useState('');
  const [prefTime, setPrefTime] = useState('');

  function submit(e) {
    e.preventDefault();
    if (name.trim().length < 2) return void toast.error('Please enter your name.');
    if (phone.replace(/\D/g, '').length < 10) return void toast.error('Please enter a valid phone number.');
    if (concern.trim().length < 10) return void toast.error('Please describe your concern in a few words.');
    const lines = [
      'Hello Dr. Sayyeda, I would like to book a physiotherapy appointment.',
      '',
      `Name: ${name.trim()}`,
      `Phone: ${phone.trim()}`,
      `Concern: ${concern.trim()}`,
    ];
    if (prefDate) lines.push(`Preferred date: ${fmtDate(prefDate)}`);
    if (prefTime.trim()) lines.push(`Preferred time: ${prefTime.trim()}`);
    const text = encodeURIComponent(lines.join('\n'));
    window.open(`https://wa.me/${whatsapp}?text=${text}`, '_blank', 'noopener');
    toast.success('Opening WhatsApp with your details\u2026');
  }

  return (
    <section id="appointment" className="py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <SectionHeading eyebrow="Patient appointment" title="Book a physiotherapy appointment" sub="For non-urgent physiotherapy concerns. Fill your details and continue on WhatsApp \u2014 Dr. Sayyeda's team will confirm your appointment directly with you." />
        <Reveal delay={0.1} className="mt-10">
          <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <p><strong>Not for emergencies.</strong> If you have chest pain, difficulty breathing, severe injury, sudden weakness or any urgent symptoms, call your local emergency number (112 in India) or go to the nearest hospital immediately.</p>
          </div>
        </Reveal>

        <Reveal delay={0.15} className="mt-8">
          <form onSubmit={submit} className="grid gap-6 rounded-3xl border border-royal/10 bg-white p-6 shadow-xl shadow-royal/10 sm:p-8 lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="ap-name">Full name</label>
                <input id="ap-name" className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </div>
              <div>
                <label className="label" htmlFor="ap-phone">Phone number</label>
                <input id="ap-phone" type="tel" className="field" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" autoComplete="tel" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="ap-date">Preferred date</label>
                  <input id="ap-date" type="date" className="field" value={prefDate} min={todayISO()} onChange={(e) => setPrefDate(e.target.value)} />
                </div>
                <div>
                  <label className="label" htmlFor="ap-time">Preferred time</label>
                  <input id="ap-time" className="field" value={prefTime} onChange={(e) => setPrefTime(e.target.value)} placeholder="e.g. 5 PM" />
                </div>
              </div>
            </div>
            <div className="flex flex-col">
              <label className="label" htmlFor="ap-concern">Your concern</label>
              <textarea id="ap-concern" rows={6} className="field flex-1" value={concern} onChange={(e) => setConcern(e.target.value)} placeholder={'e.g. knee pain for 3 weeks after a fall, stiffness in the morning\u2026'} />
              <button className="btn btn-primary mt-4 w-full py-3.5">Continue on WhatsApp</button>
              <p className="mt-2 text-center text-xs text-navy/50">You\u2019ll be taken to WhatsApp with your details ready to send.</p>
            </div>
          </form>
        </Reveal>
      </div>
    </section>
  );
}
