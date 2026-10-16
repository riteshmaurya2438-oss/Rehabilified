import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Logo, Magnetic } from './ui';
import { scrollToId } from '../lib/format';
import { useSession } from '../lib/store';
import { useUI } from '../lib/ui';
import { cn } from '../utils/cn';

const links = [
  ['about', 'About'],
  ['lectures', 'Lectures'],
  ['courses', 'Courses'],
  ['consultation', '1:1 Consultation'],
  ['contact', 'Contact'],
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const user = useSession((s) => s.user);
  const openAuth = useUI((s) => s.openAuth);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function go(id) {
    setOpen(false);
    // Navigate to standalone page for consultation
    if (id === 'consultation') {
      navigate('/consultation');
      return;
    }
    if (pathname !== '/') {
      navigate('/');
      window.setTimeout(() => scrollToId(id), 500);
    } else {
      window.setTimeout(() => scrollToId(id), 80);
    }
  }

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, delay: 1.7, ease: [0.22, 1, 0.36, 1] }}
      className={cn('fixed inset-x-0 top-0 z-50 transition-all duration-300', scrolled || open ? 'glass shadow-lg shadow-royal/5' : 'bg-transparent')}
    >
      <motion.div style={{ scaleX }} className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-royal" />
      <nav className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8" aria-label="Main">
        <Link to="/" className="flex items-center gap-3" aria-label="Rehabilified home">
          <Logo size={44} />
          <span className="font-display text-lg font-extrabold tracking-tight text-navy">
            Rehabilified<sup className="text-[10px] font-semibold">&trade;</sup>
          </span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {links.map(([id, label]) => (
            <button key={id} onClick={() => go(id)} className="group relative rounded-full px-4 py-2 text-sm font-medium text-navy/70 transition hover:text-royal">
              {label}
              <span className="absolute inset-x-4 bottom-1 h-0.5 origin-left scale-x-0 rounded bg-royal transition-transform duration-300 group-hover:scale-x-100" />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <Link to="/dashboard" className="btn btn-outline hidden !py-2.5 sm:inline-flex">
              My dashboard
            </Link>
          ) : (
            <button onClick={openAuth} className="btn btn-ghost hidden !py-2.5 sm:inline-flex">
              Sign in
            </button>
          )}
          <Magnetic className="hidden sm:inline-block">
            <button onClick={() => go('appointment')} className="btn btn-primary !py-2.5">
              Book Appointment
            </button>
          </Magnetic>
          <button className="rounded-full p-2.5 text-navy hover:bg-sky lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={open}>
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="max-h-[calc(100dvh-72px)] overflow-y-auto overflow-x-hidden lg:hidden">
            <div className="space-y-1 px-5 pb-6 pt-2">
              {links.map(([id, label]) => (
                <button key={id} onClick={() => go(id)} className="block w-full rounded-xl px-4 py-3 text-left text-base font-medium text-navy/80 hover:bg-sky">
                  {label}
                </button>
              ))}
              <div className="flex gap-2 pt-3">
                {user ? (
                  <Link to="/dashboard" onClick={() => setOpen(false)} className="btn btn-outline flex-1">
                    My dashboard
                  </Link>
                ) : (
                  <button
                    onClick={() => {
                      setOpen(false);
                      openAuth();
                    }}
                    className="btn btn-outline flex-1"
                  >
                    Sign in
                  </button>
                )}
                <button onClick={() => go('appointment')} className="btn btn-primary flex-1">
                  Book Appointment
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
