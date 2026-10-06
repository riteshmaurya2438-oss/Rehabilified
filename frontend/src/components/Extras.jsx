import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CalendarCheck, CreditCard, PlayCircle } from 'lucide-react';
import { BrandMark, EASE, Reveal, SectionHeading } from './ui';

/* ---------- Animated welcome splash (once per session) ---------- */
export function Splash() {
  const reduce = useReducedMotion();
  const [show, setShow] = useState(() => {
    try {
      return sessionStorage.getItem('rb-splash') !== '1';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (!show) return undefined;
    const t = window.setTimeout(() => {
      try {
        sessionStorage.setItem('rb-splash', '1');
      } catch {
        /* ignore */
      }
      setShow(false);
    }, reduce ? 300 : 1900);
    return () => window.clearTimeout(t);
  }, [show, reduce]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div key="splash" className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-royal text-white" exit={{ y: '-100%' }} transition={{ duration: 0.75, ease: EASE }}>
          <motion.div initial={{ scale: 0.6, opacity: 0, rotate: -6 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ duration: 0.9, ease: EASE }} className="h-44 w-44 sm:h-56 sm:w-56">
            <BrandMark className="h-full w-full" />
          </motion.div>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.7 }} className="mt-4 font-display text-3xl font-extrabold tracking-tight">
            Rehabilified<sup className="text-sm">&trade;</sup>
          </motion.p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-1 text-sm text-white/75">
            Educating physios from clinical point of view
          </motion.p>
          <div className="mt-8 h-1 w-48 overflow-hidden rounded-full bg-white/25">
            <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1.5, ease: 'easeInOut' }} className="h-full rounded-full bg-white" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Topics marquee ---------- */
const topics = ['ICU Rehabilitation', 'Clinical Reasoning', 'Early Mobilisation', 'Respiratory Physio', 'Neuro Rehab', 'Musculoskeletal Care', 'Cardio-Respiratory', 'Career Guidance', 'Evidence-Based Practice'];

export function TopicsMarquee() {
  const row = [...topics, ...topics];
  return (
    <div className="overflow-hidden border-y border-royal/10 bg-white py-5" aria-label="Topics we teach">
      <div className="flex w-max animate-marquee gap-12">
        {row.map((t, i) => (
          <span key={i} className="flex items-center gap-12 whitespace-nowrap font-display text-sm font-bold uppercase tracking-[0.2em] text-navy/45">
            {t}
            <span className="h-1.5 w-1.5 rounded-full bg-royal" aria-hidden="true" />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- How it works ---------- */
export function HowItWorks() {
  const steps = [
    { icon: CalendarCheck, t: 'Choose', d: 'Pick a live lecture, a course or a 1:1 consultation slot that fits your goal.' },
    { icon: CreditCard, t: 'Register', d: 'Free sessions confirm instantly. Paid ones use secure Razorpay checkout in INR.' },
    { icon: PlayCircle, t: 'Learn', d: 'Get your join link or unlock lessons straight away in your student dashboard.' },
  ];
  return (
    <section className="bg-mist py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionHeading eyebrow="Simple by design" title="From curious to confident in three steps" />
        <div className="relative mt-14 grid gap-6 md:grid-cols-3">
          <motion.div
            aria-hidden="true"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.3, ease: EASE }}
            className="absolute left-[16%] right-[16%] top-14 hidden h-0.5 origin-left bg-gradient-to-r from-royal/10 via-royal/50 to-royal/10 md:block"
          />
          {steps.map((s, i) => (
            <Reveal key={s.t} delay={i * 0.12} className="h-full">
              <div className="card relative h-full text-center">
                <span className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-royal text-white shadow-lg shadow-royal/30">
                  <s.icon className="h-7 w-7" />
                  <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white font-display text-sm font-extrabold text-royal shadow">{i + 1}</span>
                </span>
                <h3 className="mt-5 text-xl font-bold">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy/65">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
