import { Component, useEffect } from 'react';
import { HashRouter, Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { useSession } from './lib/store';
import { hydrateContent } from './lib/store';
import { Navbar } from './components/Navbar';
import { Footer, WhatsAppFloat } from './components/Footer';
import { Hero } from './components/Hero';
import { About, CredibilityStrip, Contact, FAQ, Testimonials } from './components/Info';
import { AppointmentSection, ConsultationSection, CoursesSection, LecturesSection } from './components/Offerings';
import { HowItWorks, Splash, TopicsMarquee } from './components/Extras';
import { GallerySection } from './components/Gallery';
import { AuthModal, CheckoutModal, PayModal } from './components/Modals';
import { Admin } from './pages/admin/AdminApp';
import { Dashboard } from './pages/Dashboard';
import { ThankYou } from './pages/ThankYou';
import { CoursePage } from './pages/CoursePage';
import { LecturePage } from './pages/LecturePage';
import { ConsultationPage } from './pages/ConsultationPage';
import { useSEO } from './lib/seo';
import { EASE } from './components/ui';

function Home() {
  useSEO(
    'Rehabilified\u2122 | Clinically-Led Physiotherapy Education by Dr. Sayyeda Uneza Fatima',
    'Live lectures, courses and 1:1 career guidance for physiotherapy students and professionals, taught from the clinical point of view by Dr. Sayyeda Uneza Fatima, double Gold Medalist and ICU rehab expert.',
  );
  return (
    <main>
      <Hero />
      <CredibilityStrip />
      <TopicsMarquee />
      <About />
      <LecturesSection />
      <CoursesSection />
      <HowItWorks />
      <ConsultationSection />
      <AppointmentSection />
      <Testimonials />
      <GallerySection />
      <FAQ />
      <Contact />
    </main>
  );
}

function NotFound() {
  useSEO('Page not found | Rehabilified\u2122', 'This page could not be found.');
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
      <p className="font-display text-7xl font-extrabold text-royal">404</p>
      <h1 className="mt-4 text-2xl font-extrabold">We couldn&rsquo;t find that page</h1>
      <Link to="/" className="btn btn-primary mt-6">Back to home</Link>
    </main>
  );
}

class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
          <h1 className="text-2xl font-extrabold">Something went wrong</h1>
          <p className="mt-2 text-navy/60">Please refresh the page. If the problem continues, message us on WhatsApp.</p>
          <button className="btn btn-primary mt-6" onClick={() => window.location.reload()}>Refresh</button>
        </main>
      );
    }
    return this.props.children;
  }
}

function Shell() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = location.pathname.startsWith('/admin');
  const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

  // Handle return from Google OAuth callback (cookie already set, URL has ?auth_success=1)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth_success') === '1') {
      (async () => {
        try {
          const res = await fetch(`${API}/auth/me`, { credentials: 'include' });
          if (!res.ok) throw new Error('auth failed');
          const u = await res.json();
          useSession.setState({ user: { id: u.user_id, name: u.name || u.email, email: u.email, picture: u.picture } });
          toast.success(`Welcome, ${(u.name || u.email).split(' ')[0]}!`);
        } catch {
          toast.error('Google sign-in failed. Please try again.');
        }
        // Clean the URL
        navigate(location.pathname, { replace: true });
      })();
      return;
    }
    const authErr = params.get('auth_error');
    if (authErr) {
      toast.error(authErr === 'cancelled' ? 'Sign-in was cancelled.' : 'Google sign-in failed. Please try again.');
      navigate(location.pathname, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore an existing Google session on load
  useEffect(() => {
    hydrateContent();
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth_success') === '1') return; // handled above
    fetch(`${API}/auth/me`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => { if (u && u.user_id) useSession.setState({ user: { id: u.user_id, name: u.name || u.email, email: u.email, picture: u.picture } }); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  // Cursor-follow glow on every .card
  useEffect(() => {
    const onMove = (e) => {
      const el = e.target?.closest?.('.card');
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    };
    document.addEventListener('mousemove', onMove, { passive: true });
    return () => document.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <>
      <Splash />
      {!isAdmin && <Navbar />}
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/course/:courseId" element={<CoursePage />} />
            <Route path="/lecture/:lectureId" element={<LecturePage />} />
            <Route path="/consultation" element={<ConsultationPage />} />
            <Route path="/thank-you/:type/:id" element={<ThankYou />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
      {!isAdmin && <Footer />}
      {!isAdmin && <WhatsAppFloat />}
      <AuthModal />
      <CheckoutModal />
      <PayModal />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <Shell />
      </HashRouter>
      <Toaster position="top-center" toastOptions={{ style: { borderRadius: '14px', color: '#0A1F44', fontWeight: 600 } }} />
    </ErrorBoundary>
  );
}
