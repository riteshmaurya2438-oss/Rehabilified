import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { Check, ChevronDown, GraduationCap, Globe, Medal, Star, Stethoscope } from 'lucide-react';
import toast from 'react-hot-toast';
import { CountUp, FloatingShapes, FounderPhoto, IconInstagram, IconWhatsApp, Reveal, SectionHeading } from './ui';
import { useDB } from '../lib/store';
import { cn } from '../utils/cn';

/* ---------------- 2. Credibility strip ---------------- */
export function CredibilityStrip() {
  const items = [
    { icon: Medal, t: 'Double Gold Medalist', s: 'BPT & MPT Cardiopulmonary (JMI)' },
    { icon: GraduationCap, t: 'Visiting Faculty', s: 'Jamia Millia Islamia University' },
    { icon: Stethoscope, t: 'ICU & Cardio Rehab', s: '6 years of clinical experience' },
    { icon: Globe, t: 'IAP National Awardee', s: '@cardiopulmonaryrehab' },
  ];
  return (
    <section aria-label="Credentials" className="relative z-10 -mt-6 px-5 sm:px-8">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden rounded-3xl border border-royal/10 bg-royal/10 shadow-xl shadow-royal/10 lg:grid-cols-4">
        {items.map((it, i) => (
          <Reveal key={it.t} delay={i * 0.08} y={16} className="bg-white">
            <div className="flex h-full flex-col items-start gap-2.5 p-4 sm:flex-row sm:items-center sm:gap-3 sm:p-6">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky text-royal sm:h-11 sm:w-11">
                <it.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-navy sm:text-base">{it.t}</p>
                <p className="text-xs text-navy/55 sm:text-sm">{it.s}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------------- 3. About ---------------- */
export function About() {
  const stats = useDB((s) => s.stats);
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [400, 1600], [30, -30]);
  const roles = [
    'Founder, Rehabilified\u2122',
    'BPT & MPT (Cardiopulmonary), Jamia Millia Islamia \u2014 Double Gold Medalist',
    'Visiting Faculty, Jamia Millia Islamia University',
    'Consultant Physiotherapist, Xcell Physiocare',
    'IAP National Award winner for educational content \u00b7 @cardiopulmonaryrehab',
    'Keynote speaker & hands-on workshop lead in ICU and cardiopulmonary rehab',
  ];
  return (
    <section id="about" className="relative overflow-hidden py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-16 px-5 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Reveal>
          <motion.div style={reduce ? undefined : { y }} className="relative mx-auto max-w-md">
            <div className="absolute -left-4 -top-4 h-full w-full rounded-[2rem] border-2 border-royal/20" aria-hidden="true" />
            <FounderPhoto className="relative aspect-[4/5] w-full rounded-[2rem] shadow-2xl shadow-royal/20" />
            <div className="glass absolute -bottom-6 left-6 right-6 rounded-2xl px-5 py-4 shadow-xl shadow-royal/10">
              <p className="font-display text-base font-extrabold text-navy">Dr. Sayyeda Uneza Fatima</p>
              <p className="text-xs text-navy/60">BPT & MPT Cardiopulmonary (JMI) &middot; Double Gold Medalist</p>
            </div>
          </motion.div>
        </Reveal>

        <div>
          <SectionHeading center={false} eyebrow="About the founder" title="Meet Dr. Sayyeda Uneza Fatima" />
          <Reveal delay={0.1}>
            <p className="mt-6 text-lg leading-relaxed text-navy/70">
              Dr. Sayyeda Uneza Fatima completed both her BPT and her MPT in Cardiopulmonary from Jamia Millia Islamia as a double Gold Medalist. With 6 years of experience in ICU and cardiopulmonary rehabilitation, she founded Rehabilified&trade;, teaches as Visiting Faculty at Jamia Millia Islamia University, and practises as a Consultant Physiotherapist at Xcell Physiocare.
            </p>
            <p className="mt-4 text-base leading-relaxed text-navy/65">
              An IAP National Award winner for her educational content on Instagram (@cardiopulmonaryrehab), she is a keynote speaker at national and international conferences and has led multiple hands-on workshops in cardiopulmonary and ICU rehabilitation. Rehabilified was built on a simple belief: physiotherapy students and early-career clinicians learn best when theory is taught from the clinical point of view &mdash; the way decisions are actually made at the bedside and in the ICU.
            </p>
            <ul className="mt-6 space-y-3">
              {roles.map((r) => (
                <li key={r} className="flex items-start gap-3 text-sm font-medium text-navy sm:text-base">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-royal text-white">
                    <Check className="h-3 w-3" />
                  </span>
                  {r}
                </li>
              ))}
            </ul>
          </Reveal>

          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map((s, i) => (
              <Reveal key={s.id} delay={0.1 + i * 0.08} y={16}>
                <div className="rounded-2xl bg-sky p-4 text-center">
                  <p className="font-display text-2xl font-extrabold text-royal sm:text-3xl">
                    <CountUp value={s.value} suffix={s.suffix} />
                  </p>
                  <p className="mt-1 text-xs leading-tight text-navy/60">{s.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 8a. Testimonials ---------------- */
export function Testimonials() {
  const items = useDB((s) => s.testimonials).filter((t) => t.published);
  if (!items.length) return null;
  return (
    <section id="testimonials" className="relative overflow-hidden bg-mist py-24 sm:py-32">
      <FloatingShapes />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading eyebrow="Testimonials" title="What learners say" sub="Honest feedback from students and clinicians who learned with Rehabilified." />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {items.map((t, i) => (
            <Reveal key={t.id} delay={i * 0.1} className="h-full">
              <figure className="card flex h-full flex-col">
                <div className="flex gap-0.5 text-royal" aria-label={`${t.rating} out of 5 stars`}>
                  {Array.from({ length: 5 }).map((_, k) => (
                    <Star key={k} className={cn('h-4 w-4', k < t.rating ? 'fill-royal' : 'text-navy/20')} />
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 text-base leading-relaxed text-navy/75">&ldquo;{t.text}&rdquo;</blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-royal font-bold text-white">{t.name.charAt(0)}</span>
                  <span>
                    <span className="block text-sm font-bold text-navy">{t.name}</span>
                    <span className="block text-xs text-navy/55">{t.role}</span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- 8b. FAQ ---------------- */
export function FAQ() {
  const faqs = useDB((s) => s.faqs).filter((f) => f.published);
  const [openId, setOpenId] = useState(null);
  if (!faqs.length) return null;
  return (
    <section id="faq" className="py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <SectionHeading eyebrow="FAQ" title="Questions, answered" />
        <div className="mt-12 space-y-3">
          {faqs.map((f, i) => {
            const open = openId === f.id;
            return (
              <Reveal key={f.id} delay={i * 0.05} y={14}>
                <div className={cn('rounded-2xl border bg-white transition-colors', open ? 'border-royal/40 shadow-lg shadow-royal/10' : 'border-royal/10')}>
                  <button className="flex w-full items-center justify-between gap-4 p-5 text-left" onClick={() => setOpenId(open ? null : f.id)} aria-expanded={open}>
                    <span className="font-semibold text-navy">{f.q}</span>
                    <ChevronDown className={cn('h-5 w-5 shrink-0 text-royal transition-transform', open && 'rotate-180')} />
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <p className="px-5 pb-5 text-sm leading-relaxed text-navy/65 sm:text-base">{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------- 8c. Contact ---------------- */
export function Contact() {
  const settings = useDB((s) => s.settings);
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');

  function send(e) {
    e.preventDefault();
    if (name.trim().length < 2 || msg.trim().length < 5) {
      toast.error('Please add your name and a short message.');
      return;
    }
    const text = `Hi Rehabilified, I'm ${name.trim()}. ${msg.trim()}`;
    window.open(`https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  }

  return (
    <section id="contact" className="relative overflow-hidden bg-navy py-24 text-white sm:py-28">
      <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-royal/40 blur-3xl" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-5 sm:px-8 lg:grid-cols-2">
        <Reveal>
          <span className="inline-flex rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/80">Contact</span>
          <h2 className="mt-5 text-3xl font-extrabold sm:text-4xl lg:text-5xl">Let&rsquo;s talk about your learning goals</h2>
          <p className="mt-4 max-w-md text-white/65">Questions about a lecture, a course or the right path for you? Message us &mdash; we usually reply on WhatsApp.</p>
          <div className="mt-8 space-y-3">
            <a href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 rounded-2xl bg-white/10 p-4 transition hover:bg-white/15">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#25D366]">
                <IconWhatsApp className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm text-white/60">WhatsApp</span>
                <span className="block font-semibold">+91 73039 95608</span>
              </span>
            </a>
            <a href={`https://instagram.com/${settings.instagram}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 rounded-2xl bg-white/10 p-4 transition hover:bg-white/15">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-royal">
                <IconInstagram className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm text-white/60">Instagram</span>
                <span className="block font-semibold">instagram.com/{settings.instagram}</span>
              </span>
            </a>
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <form onSubmit={send} className="rounded-3xl bg-white p-6 text-navy shadow-2xl sm:p-8">
            <h3 className="text-xl font-bold">Send a message</h3>
            <div className="mt-5 space-y-4">
              <div>
                <label className="label" htmlFor="ct-name">Your name</label>
                <input id="ct-name" className="field" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="ct-msg">Message</label>
                <textarea id="ct-msg" rows={4} className="field" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="How can we help?" />
              </div>
              <button className="btn btn-primary w-full">
                <IconWhatsApp className="h-4 w-4" /> Continue on WhatsApp
              </button>
            </div>
          </form>
        </Reveal>
      </div>
    </section>
  );
}
