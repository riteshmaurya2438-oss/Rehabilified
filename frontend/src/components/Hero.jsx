import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, GraduationCap, Medal, Stethoscope } from 'lucide-react';
import { EASE, FloatingShapes, FounderPhoto, Magnetic, SplitText } from './ui';
import { scrollToId } from '../lib/format';
import { cn } from '../utils/cn';

/* On phones the badges sit INSIDE the photo frame; from `sm` up they float outside. */
const badges = [
  { icon: Medal, title: 'BPT \u00b7 Gold Medalist', pos: 'left-1 top-[36%] sm:-left-12 sm:top-10', delay: '0s' },
  { icon: Medal, title: 'MPT Cardiopulmonary', sub: 'Gold Medalist \u00b7 JMI', pos: 'right-1 top-[52%] sm:-right-10 sm:top-1/3', delay: '1.5s' },
  { icon: GraduationCap, title: 'Visiting Faculty', sub: 'Jamia Millia Islamia', pos: 'bottom-24 left-1 sm:-left-16 sm:bottom-28', delay: '3s' },
  { icon: Stethoscope, title: 'ICU & Cardio Rehab', sub: '6 years of experience', pos: 'bottom-4 right-1 sm:-right-8 sm:bottom-8', delay: '4.5s' },
];

export function Hero() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const photoY = useTransform(scrollY, [0, 700], [0, 70]);
  const textY = useTransform(scrollY, [0, 700], [0, -36]);
  const fade = useTransform(scrollY, [0, 500], [1, 0]);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-mist via-white to-white pb-20 pt-28 sm:pb-24 sm:pt-40 lg:pb-32">
      <div className="dotgrid absolute inset-0" aria-hidden="true" />
      <FloatingShapes />
      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-5 sm:gap-14 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16">
        <motion.div style={reduce ? undefined : { y: textY }} className="min-w-0">
          <motion.span
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 2.0, ease: EASE }}
            className="inline-flex max-w-full items-center gap-2 rounded-full border border-royal/15 bg-white px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-royal shadow-sm sm:px-4 sm:text-xs sm:tracking-widest"
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-royal/50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-royal" />
            </span>
            <span className="min-w-0">Educating physios from clinical point of view</span>
          </motion.span>

          <h1 className="mt-5 text-[2.1rem] font-extrabold leading-[1.1] text-navy sm:mt-6 sm:text-5xl lg:text-[3.75rem]">
            <SplitText text="Learn physiotherapy the way it is practised." delay={2.1} highlight={['practised']} />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 2.6, ease: EASE }}
            className="mt-5 max-w-xl text-base leading-relaxed text-navy/65 sm:mt-6 sm:text-lg"
          >
            Live lectures, structured courses and 1:1 career guidance from Dr. Sayyeda Uneza Fatima &mdash; a double Gold Medalist, MPT in Cardiopulmonary and ICU rehab specialist who turns textbook theory into confident clinical practice.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 2.75, ease: EASE }} className="mt-8 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:flex-wrap sm:gap-4">
            <Magnetic className="block sm:inline-block">
              <button onClick={() => scrollToId('appointment')} className="btn btn-primary w-full px-8 py-4 text-base sm:w-auto">
                Book Patient Appointment <ArrowRight className="h-4 w-4" />
              </button>
            </Magnetic>
          </motion.div>

          <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.1, duration: 0.8 }} className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-navy/55 sm:mt-10 sm:gap-x-8">
            {['Live lectures', 'Video courses', '1:1 guidance'].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-royal" />
                {t}
              </li>
            ))}
          </motion.ul>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: 1.9, ease: EASE }} className="relative mx-auto w-full max-w-[22rem] min-w-0 sm:max-w-md">
          <svg viewBox="0 0 200 200" className="pointer-events-none absolute -inset-10 hidden h-[calc(100%+5rem)] w-[calc(100%+5rem)] animate-spin-slow text-royal/30 sm:block" aria-hidden="true">
            <circle cx="100" cy="100" r="96" fill="none" stroke="currentColor" strokeWidth="0.6" strokeDasharray="2 6" />
          </svg>
          <motion.div style={reduce ? undefined : { y: photoY }} className="relative">
            <div className="absolute -bottom-3 -right-3 h-full w-full rounded-t-[999px] rounded-b-[2rem] bg-gradient-to-br from-royal to-royal-dark opacity-90 sm:-bottom-5 sm:-right-5" aria-hidden="true" />
            <FounderPhoto editable className="relative aspect-[4/5] w-full rounded-t-[999px] rounded-b-[2rem] shadow-2xl shadow-royal/25" />
            {badges.map((b, i) => (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 2.8 + i * 0.15, type: 'spring', stiffness: 220, damping: 16 }}
                className={cn('absolute z-10', b.pos)}
              >
                <div className="glass flex animate-float items-center gap-2 rounded-2xl px-2.5 py-1.5 shadow-xl shadow-royal/15 sm:gap-2.5 sm:px-3 sm:py-2" style={{ animationDelay: b.delay }}>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-royal text-white sm:h-9 sm:w-9">
                    <b.icon className="h-4 w-4" />
                  </span>
                  <span className="leading-tight">
                    <span className="block text-[11px] font-bold text-navy sm:text-sm">{b.title}</span>
                    {b.sub && <span className="block text-[10px] text-navy/60 sm:text-[11px]">{b.sub}</span>}
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      <motion.div style={reduce ? undefined : { opacity: fade }} className="pointer-events-none absolute inset-x-0 bottom-6 hidden justify-center lg:flex" aria-hidden="true">
        <div className="flex h-10 w-6 items-start justify-center rounded-full border-2 border-royal/30 p-1.5">
          <motion.span animate={{ y: [0, 14, 0] }} transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }} className="h-2 w-1 rounded-full bg-royal" />
        </div>
      </motion.div>
    </section>
  );
}
