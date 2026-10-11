import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Calendar, Clock, MapPin, Tag, Video } from 'lucide-react';
import { useDB, useSession } from '../lib/store';
import { useUI } from '../lib/ui';
import { fmtDate, fmtTime, inr } from '../lib/format';
import { useSEO } from '../lib/seo';
import { Reveal, FloatingShapes } from '../components/ui';

export function LecturePage() {
  const { lectureId } = useParams();
  const lectures = useDB((s) => s.lectures);
  const lecture = lectures.find((l) => l.id === lectureId);
  const openCheckout = useUI((s) => s.openCheckout);
  useSEO(
    lecture ? `${lecture.title} | Rehabilified\u2122` : 'Lecture not found',
    lecture?.description || '',
  );

  if (!lecture) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-mist px-5 pt-24">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold">Lecture not found</h1>
          <p className="mt-2 text-navy/60">This lecture may have been removed or the link is incorrect.</p>
          <Link to="/" className="btn btn-primary mt-6">Back to home</Link>
        </div>
      </main>
    );
  }

  function register() {
    openCheckout({ kind: 'lecture', refId: lecture.id });
  }

  return (
    <main className="relative min-h-screen bg-mist px-5 pb-24 pt-32 sm:px-8" data-testid="lecture-page">
      <FloatingShapes />
      <div className="relative mx-auto max-w-3xl">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-royal hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <Reveal>
          <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-royal/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-royal">
            <Video className="h-3.5 w-3.5" /> Live Lecture
          </span>
          <h1 className="text-3xl font-extrabold sm:text-4xl">{lecture.title}</h1>
          {lecture.description && <p className="mt-3 text-base text-navy/65 leading-relaxed">{lecture.description}</p>}

          <div className="mt-6 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky px-4 py-1.5 text-sm font-semibold text-navy/70">
              <Calendar className="h-4 w-4" /> {fmtDate(lecture.date)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky px-4 py-1.5 text-sm font-semibold text-navy/70">
              <Clock className="h-4 w-4" /> {fmtTime(lecture.time)} IST
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky px-4 py-1.5 text-sm font-semibold text-navy/70">
              <MapPin className="h-4 w-4" /> {lecture.mode}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-royal/10 px-4 py-1.5 text-sm font-bold text-royal">
              <Tag className="h-4 w-4" /> {lecture.price > 0 ? inr(lecture.price) : 'Free'}
            </span>
          </div>
        </Reveal>

        <Reveal>
          <div className="mt-10 rounded-3xl bg-white p-6 text-center shadow-xl shadow-royal/10 sm:p-8">
            <p className="font-display text-2xl font-extrabold text-royal">{lecture.price > 0 ? inr(lecture.price) : 'Free'}</p>
            <p className="mt-1 text-sm text-navy/50">{fmtDate(lecture.date)} &middot; {fmtTime(lecture.time)} IST &middot; {lecture.mode}</p>
            <button onClick={register} className="btn btn-primary mt-5 px-10 py-3.5 text-base" data-testid="lecture-register-btn">
              {lecture.price > 0 ? `Register for ${inr(lecture.price)}` : 'Register for free'} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </Reveal>
      </div>
    </main>
  );
}
