import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FullLogo, IconInstagram, IconWhatsApp } from './ui';
import { scrollToId } from '../lib/format';
import { useDB } from '../lib/store';

export function Footer() {
  const settings = useDB((s) => s.settings);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const go = (id) => {
    if (pathname !== '/') {
      navigate('/');
      window.setTimeout(() => scrollToId(id), 500);
    } else scrollToId(id);
  };
  const cols = [
    ['about', 'About'],
    ['lectures', 'Upcoming lectures'],
    ['courses', 'Courses'],
    ['consultation', '1:1 Consultation'],
    ['appointment', 'Patient appointment'],
    ['faq', 'FAQ'],
  ];
  return (
    <footer className="bg-navy text-white">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <FullLogo className="h-28 w-28" />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/65">
            Educating physios from the clinical point of view. Lectures, courses and career guidance by Dr. Sayyeda Uneza Fatima.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-white/50">Explore</h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            {cols.map(([id, l]) => (
              <li key={id}>
                <button onClick={() => go(id)} className="text-white/75 transition hover:text-white">
                  {l}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-white/50">Connect</h4>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <a href={settings.instagramUrl || `https://instagram.com/${settings.instagram}`} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-2 text-white/75 hover:text-white">
                <IconInstagram className="h-4 w-4 shrink-0" /> <span className="truncate">@{settings.instagram}</span>
              </a>
            </li>
            <li>
              <a href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-2 text-white/75 hover:text-white">
                <IconWhatsApp className="h-4 w-4 shrink-0" /> <span className="truncate">+{settings.whatsapp.replace(/^(\d{2})(\d{5})(\d+)$/, '$1 $2 $3')}</span>
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>&copy; {new Date().getFullYear()} Rehabilified&trade;. All rights reserved. Educational content only &mdash; not a substitute for medical advice.</p>
          <Link to="/admin" className="hover:text-white">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}

export function WhatsAppFloat() {
  const number = useDB((s) => s.settings.whatsapp);
  return (
    <motion.a
      href={`https://wa.me/${number}?text=${encodeURIComponent('Hi Rehabilified, I have a question.')}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1.2, type: 'spring', stiffness: 260, damping: 18 }}
      whileHover={{ scale: 1.08 }}
      className="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl shadow-black/20 sm:bottom-5 sm:right-5"
    >
      <span className="absolute -inset-1 animate-pulse rounded-full bg-[#25D366]/30" aria-hidden="true" />
      <IconWhatsApp className="relative h-7 w-7" />
    </motion.a>
  );
}
