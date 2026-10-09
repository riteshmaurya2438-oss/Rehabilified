import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Images, X } from 'lucide-react';
import { EASE, Reveal } from './ui';

const gallery = [
  { src: 'images/gallery/5-group-photo.webp', alt: 'Group photo with physiotherapy students after a successful workshop', caption: 'Workshop Batch — All Smiles', focus: 'center 40%' },
  { src: 'images/gallery/1-award-iap.webp', alt: 'Dr. Sayyeda Uneza Fatima receiving award at 3rd National Conference of IAP Women Cell, New Delhi', caption: 'IAP Women Cell National Conference — New Delhi', focus: '35% 20%' },
  { src: 'images/gallery/2-training.webp', alt: 'Hands-on clinical training session with physiotherapy students', caption: 'Hands-on Clinical Training Session', focus: 'center 30%' },
  { src: 'images/gallery/3-seminar.webp', alt: 'Students attending an intensive physiotherapy seminar', caption: 'Intensive Physiotherapy Seminar', focus: 'center center' },
  { src: 'images/gallery/4-awp-conference.webp', alt: 'Award at World Physiotherapy AWP Regional Conference 2026', caption: 'World Physiotherapy AWP Regional Conference 2026', focus: 'center 25%' },
];

function Lightbox({ index, onClose, onPrev, onNext }) {
  const item = gallery[index];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-navy/90 backdrop-blur-md"
      onClick={onClose}
      data-testid="gallery-lightbox"
    >
      <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/20" data-testid="lightbox-close"><X size={22} /></button>
      {gallery.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/20 sm:left-6" data-testid="lightbox-prev"><ChevronLeft size={26} /></button>
          <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/20 sm:right-6" data-testid="lightbox-next"><ChevronRight size={26} /></button>
        </>
      )}
      <motion.div
        key={index}
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="flex max-h-[85vh] max-w-[90vw] flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img src={item.src} alt={item.alt} className="max-h-[78vh] max-w-full rounded-xl object-contain shadow-2xl" />
        <p className="mt-3 text-center text-sm font-medium text-white/80">{item.caption} <span className="ml-2 text-white/40">{index + 1}/{gallery.length}</span></p>
      </motion.div>
    </motion.div>
  );
}

function GalleryCard({ item, index, onClick, className = '' }) {
  return (
    <button
      onClick={() => onClick(index)}
      className={`group relative block w-full cursor-pointer overflow-hidden rounded-2xl ${className}`}
      data-testid={`gallery-img-${index}`}
    >
      <img src={item.src} alt={item.alt} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" style={{ objectPosition: item.focus || 'center center' }} loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-navy/70 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="absolute bottom-0 left-0 right-0 translate-y-4 p-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 sm:p-4">
        <p className="text-xs font-semibold text-white drop-shadow-lg sm:text-sm">{item.caption}</p>
      </div>
    </button>
  );
}

export function GallerySection() {
  const [lightboxIdx, setLightboxIdx] = useState(null);

  const open = useCallback((i) => setLightboxIdx(i), []);
  const close = useCallback(() => setLightboxIdx(null), []);
  const prev = useCallback(() => setLightboxIdx((i) => (i - 1 + gallery.length) % gallery.length), []);
  const next = useCallback(() => setLightboxIdx((i) => (i + 1) % gallery.length), []);

  return (
    <>
      <section className="relative overflow-hidden bg-navy py-24 sm:py-28" data-testid="gallery-section">
        <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-royal/20 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-royal/15 blur-[100px]" />

        <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
          <Reveal>
            <div className="mb-14 flex flex-col items-center text-center">
              <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-royal/20 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-sky">
                <Images size={14} /> Gallery
              </span>
              <h2 className="font-display text-3xl font-extrabold text-white sm:text-4xl">
                Moments That Define Us
              </h2>
              <p className="mt-3 max-w-lg text-base text-white/50">
                Awards, workshops, conferences and the incredible community of physios learning and growing together.
              </p>
            </div>
          </Reveal>

          {/*
            Layout: 
            Row 1: Group photo (landscape, wide) + Award (portrait)
            Row 2: Training (portrait) + Seminar (landscape) + AWP Conference (portrait)
          */}
          <div className="grid gap-3 sm:gap-4" style={{ gridTemplateColumns: '1fr', gridAutoRows: 'auto' }}>
            {/* Row 1: Hero row — landscape wide + portrait */}
            <div className="grid grid-cols-5 gap-3 sm:gap-4" style={{ height: 'clamp(260px, 32vw, 420px)' }}>
              <Reveal className="col-span-5 sm:col-span-3">
                <GalleryCard item={gallery[0]} index={0} onClick={open} className="h-full" />
              </Reveal>
              <Reveal delay={0.1} className="col-span-5 sm:col-span-2">
                <GalleryCard item={gallery[1]} index={1} onClick={open} className="h-full" />
              </Reveal>
            </div>

            {/* Row 2: portrait + landscape + portrait (last photo wider) */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4" style={{ height: 'clamp(200px, 26vw, 340px)' }}>
              <Reveal delay={0.12} className="col-span-1 md:col-span-1">
                <GalleryCard item={gallery[2]} index={2} onClick={open} className="h-full" />
              </Reveal>
              <Reveal delay={0.18} className="col-span-1 md:col-span-1">
                <GalleryCard item={gallery[3]} index={3} onClick={open} className="h-full" />
              </Reveal>
              <Reveal delay={0.24} className="col-span-2 md:col-span-2">
                <GalleryCard item={gallery[4]} index={4} onClick={open} className="h-full" />
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {lightboxIdx !== null && <Lightbox index={lightboxIdx} onClose={close} onPrev={prev} onNext={next} />}
      </AnimatePresence>
    </>
  );
}
