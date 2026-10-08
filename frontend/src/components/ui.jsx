import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useInView, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import { Camera, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../utils/cn';
import { useDB } from '../lib/store';
import { useAdminSession } from '../lib/adminAuth';
import { fileToDataUrl } from '../lib/image';

export const EASE = [0.22, 1, 0.36, 1];

/* ---------- Scroll reveal ---------- */
export function Reveal({ children, delay = 0, y = 28, className }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/* ---------- Word-by-word headline reveal ---------- */
export function SplitText({ text, className, delay = 0, highlight = [] }) {
  const reduce = useReducedMotion();
  const words = text.split(' ');
  return (
    <span className={className} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.14em] align-bottom" aria-hidden="true">
          <motion.span
            className={cn('inline-block', highlight.includes(w.replace(/[.,]/g, '')) && 'shimmer')}
            initial={reduce ? false : { y: '115%' }}
            animate={{ y: 0 }}
            transition={{ duration: 0.85, delay: delay + i * 0.07, ease: EASE }}
          >
            {w}
          </motion.span>
          {i < words.length - 1 ? '\u00A0' : ''}
        </span>
      ))}
    </span>
  );
}

/* ---------- Magnetic hover ---------- */
export function Magnetic({ children, strength = 0.28, className }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 16 });
  const sy = useSpring(y, { stiffness: 220, damping: 16 });
  return (
    <motion.div
      ref={ref}
      style={{ x: sx, y: sy }}
      className={cn('inline-block', className)}
      onMouseMove={(e) => {
        if (reduce || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/* ---------- Count-up numbers ---------- */
export function CountUp({ value, suffix = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);
  const decimals = Number.isInteger(value) ? 0 : 1;
  useEffect(() => {
    if (!inView) return undefined;
    if (reduce) {
      setN(value);
      return undefined;
    }
    const c = animate(0, value, { duration: 1.8, ease: 'easeOut', onUpdate: (v) => setN(v) });
    return () => c.stop();
  }, [inView, value, reduce]);
  return (
    <span ref={ref}>
      {n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

/* ---------- Floating gradient shapes with subtle parallax ---------- */
export function FloatingShapes({ className }) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 1200], [0, -140]);
  const y2 = useTransform(scrollY, [0, 1200], [0, 90]);
  return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <motion.div style={reduce ? undefined : { y: y1 }} className="absolute -right-24 -top-24">
        <div className="h-[26rem] w-[26rem] animate-float rounded-full bg-gradient-to-br from-royal/25 to-sky blur-3xl" />
      </motion.div>
      <motion.div style={reduce ? undefined : { y: y2 }} className="absolute -left-32 top-1/3">
        <div className="h-80 w-80 animate-float-slow rounded-full bg-gradient-to-tr from-sky to-royal/20 blur-3xl" />
      </motion.div>
      <motion.div style={reduce ? undefined : { y: y1 }} className="absolute bottom-0 right-1/4">
        <div className="h-56 w-56 animate-float rounded-[40%_60%_60%_40%] bg-royal/10 blur-2xl" />
      </motion.div>
    </div>
  );
}

/* ---------- Section heading ---------- */
export function SectionHeading({ eyebrow, title, sub, center = true }) {
  return (
    <Reveal className={cn('max-w-2xl', center && 'mx-auto text-center')}>
      <span className="inline-flex items-center gap-2 rounded-full bg-sky px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-royal">
        <span className="h-1.5 w-1.5 rounded-full bg-royal" />
        {eyebrow}
      </span>
      <h2 className="mt-5 text-3xl font-extrabold leading-tight text-navy sm:text-4xl lg:text-5xl">{title}</h2>
      {sub && <p className="mt-4 text-base leading-relaxed text-navy/65 sm:text-lg">{sub}</p>}
    </Reveal>
  );
}

/* =====================================================================
   BRAND — vector recreation of the Rehabilified logo (always available).
   ===================================================================== */
function Wreath() {
  const cx = 607, cy = 640, rx = 312, ry = 288;
  const leaves = [];
  for (let a = 38, i = 0; a <= 322; a += 11.5, i++) {
    const t = (a * Math.PI) / 180;
    const x = cx + rx * Math.sin(t);
    const y = cy - ry * Math.cos(t);
    const cw = (Math.atan2(ry * Math.sin(t), rx * Math.cos(t)) * 180) / Math.PI;
    const dir = a < 180 ? cw + 180 : cw;
    leaves.push(
      <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${dir.toFixed(1)})`}>
        <ellipse cx="24" cy="-15" rx="31" ry="12" transform="rotate(-24)" />
        <ellipse cx="24" cy="15" rx="31" ry="12" transform="rotate(24)" />
      </g>,
    );
  }
  const p = (a) => {
    const t = (a * Math.PI) / 180;
    return `${(cx + rx * Math.sin(t)).toFixed(1)} ${(cy - ry * Math.cos(t)).toFixed(1)}`;
  };
  return (
    <g>
      <path d={`M ${p(38)} A ${rx} ${ry} 0 1 1 ${p(322)}`} fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
      {leaves}
    </g>
  );
}

function MarkShapes({ bg = '#0B6EDC' }) {
  return (
    <>
      <polygon points="480,145 780,107 999,299 893,319 588,188 563,218" />
      <path d="M548 306 L578 194 C590 172 620 168 650 168 C790 172 868 262 888 292 L850 405 C740 318 640 300 548 306 Z" />
      <path d="M594 200 C700 166 820 196 878 284" fill="none" stroke={bg} strokeWidth="9" strokeLinecap="round" />
      <line x1="970" y1="312" x2="960" y2="372" stroke="#fff" strokeWidth="7" />
      <circle cx="965" cy="372" r="13" />
      <polygon points="950,386 976,386 984,442 944,438" />
      <path d="M425 398 C500 318 710 292 806 398" fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" />
      <Wreath />
      <g stroke="#fff" strokeLinecap="round">
        <path d="M530 455 L742 515" strokeWidth="64" />
        <path d="M575 600 L500 765" strokeWidth="72" />
        <path d="M742 515 L668 712" strokeWidth="62" />
      </g>
      <circle cx="530" cy="455" r="52" />
      <circle cx="742" cy="515" r="52" />
      <circle cx="575" cy="600" r="78" />
      <circle cx="500" cy="765" r="46" />
      <circle cx="668" cy="712" r="46" />
    </>
  );
}

export function BrandMark({ className }) {
  return (
    <svg viewBox="270 95 750 860" className={className} fill="#fff" aria-hidden="true">
      <MarkShapes />
    </svg>
  );
}

export function BrandLogoFull({ className }) {
  return (
    <svg viewBox="0 0 1254 1254" className={className} fill="#fff" role="img" aria-label="Rehabilified — Educating Physios from clinical point of view">
      <rect width="1254" height="1254" fill="#0B6EDC" />
      <MarkShapes />
      <text x="165" y="1075" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="700" fontSize="150" textLength="925" lengthAdjust="spacingAndGlyphs">
        REHABILIFIED
      </text>
      <text x="1068" y="985" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="600" fontSize="58">
        TM
      </text>
      <text x="165" y="1140" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="500" fontSize="52" textLength="927" lengthAdjust="spacingAndGlyphs">
        Educating Physios from clinical point of view
      </text>
    </svg>
  );
}

function useImgChain(sources) {
  const list = sources.filter(Boolean);
  const sig = list.map((s) => s.length + s.slice(0, 40)).join('|');
  const [i, setI] = useState(0);
  useEffect(() => setI(0), [sig]);
  return { src: list[i], failed: i >= list.length, onError: () => setI((n) => n + 1) };
}

export function Logo({ size = 44 }) {
  const logoData = useDB((s) => s.settings.logoData);
  const img = useImgChain([logoData, 'images/logo.png', 'images/logo.jpg', 'images/logo.jpeg']);
  return (
    <span className="relative inline-block shrink-0 overflow-hidden rounded-xl bg-royal" style={{ width: size, height: size }}>
      {img.failed ? (
        <BrandMark className="h-full w-full p-1.5" />
      ) : (
        <img src={img.src} onError={img.onError} alt="Rehabilified logo" className="h-full w-full object-cover" />
      )}
    </span>
  );
}

export function FullLogo({ className }) {
  const logoData = useDB((s) => s.settings.logoData);
  const img = useImgChain([logoData, 'images/logo-full.png', 'images/logo.png', 'images/logo.jpg']);
  return img.failed ? (
    <BrandLogoFull className={cn('rounded-2xl', className)} />
  ) : (
    <img src={img.src} onError={img.onError} alt="Rehabilified — Educating Physios from clinical point of view" className={cn('rounded-2xl object-cover', className)} />
  );
}

export function FounderPhoto({ className, editable = false }) {
  const founderData = useDB((s) => s.settings.founderData);
  const setSettings = useDB((s) => s.setSettings);
  const isAdmin = useAdminSession((s) => s.active);
  const img = useImgChain([founderData, 'images/founder.jpg', 'images/founder.png', 'images/founder.jpeg']);

  async function onFile(f) {
    if (!f) return;
    try {
      const data = await fileToDataUrl(f, 1100, 'image/jpeg');
      setSettings({ ...useDB.getState().settings, founderData: data });
      toast.success('Photo updated.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not use that image.');
    }
  }

  return (
    <div className={cn('relative overflow-hidden bg-gradient-to-br from-royal to-navy', className)}>
      {img.failed ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-white">
          <span className="font-display text-6xl font-extrabold tracking-tight text-white/95">SUF</span>
          <span className="text-xs font-semibold uppercase tracking-widest text-white/70">Dr. Sayyeda Uneza Fatima</span>
        </div>
      ) : (
        <img src={img.src} onError={img.onError} alt="Dr. Sayyeda Uneza Fatima, Founder of Rehabilified" className="h-full w-full object-cover object-top" />
      )}
      {editable && isAdmin && (
        <label className="absolute bottom-3 left-3 z-20 inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-royal shadow-lg transition hover:bg-sky">
          <Camera className="h-4 w-4" /> Change photo
          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
      )}
    </div>
  );
}

/* ---------- Brand icons (inline so they never break) ---------- */
export function IconInstagram({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}

export function IconWhatsApp({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, children, z = 'z-[60]', wide = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className={cn('fixed inset-0 flex items-end justify-center sm:items-center sm:p-6', z)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-navy/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className={cn('relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-8', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}
          >
            <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 rounded-full p-2 text-navy/50 transition hover:bg-sky hover:text-royal">
              <X className="h-5 w-5" />
            </button>
            <h3 className="pr-8 text-xl font-bold text-navy">{title}</h3>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
