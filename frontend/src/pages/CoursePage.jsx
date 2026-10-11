import { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, BookOpen, Clock, Tag } from 'lucide-react';
import { useDB, useSession } from '../lib/store';
import { useUI } from '../lib/ui';
import { inr } from '../lib/format';
import { useSEO } from '../lib/seo';
import { EASE, Reveal, FloatingShapes } from '../components/ui';

export function CoursePage() {
  const { courseId } = useParams();
  const courses = useDB((s) => s.courses);
  const course = courses.find((c) => c.id === courseId);
  const user = useSession((s) => s.user);
  const openCheckout = useUI((s) => s.openCheckout);
  const openAuth = useUI((s) => s.openAuth);
  useSEO(
    course ? `${course.title} | Rehabilified\u2122` : 'Course not found',
    course?.description || '',
  );

  if (!course) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-mist px-5 pt-24">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold">Course not found</h1>
          <p className="mt-2 text-navy/60">This course may have been removed or the link is incorrect.</p>
          <Link to="/" className="btn btn-primary mt-6">Back to home</Link>
        </div>
      </main>
    );
  }

  function buy() {
    openCheckout({ kind: 'course', refId: course.id });
  }

  return (
    <main className="relative min-h-screen bg-mist px-5 pb-24 pt-32 sm:px-8" data-testid="course-page">
      <FloatingShapes />
      <div className="relative mx-auto max-w-3xl">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-royal hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <Reveal>
          {course.thumbnail && (
            <div className="mb-6 overflow-hidden rounded-2xl">
              <img src={course.thumbnail} alt={course.title} className="h-48 w-full object-cover sm:h-64" />
            </div>
          )}
          <h1 className="text-3xl font-extrabold sm:text-4xl">{course.title}</h1>
          <p className="mt-3 text-base text-navy/65 leading-relaxed">{course.description}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-royal/10 px-4 py-1.5 text-sm font-bold text-royal">
              <Tag className="h-4 w-4" /> {inr(course.price)}
            </span>
            {course.parts?.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky px-4 py-1.5 text-sm font-semibold text-navy/70">
                <BookOpen className="h-4 w-4" /> {course.parts.length} parts
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky px-4 py-1.5 text-sm font-semibold text-navy/70">
              <Clock className="h-4 w-4" /> Lifetime access
            </span>
          </div>
        </Reveal>

        {course.parts?.length > 0 && (
          <Reveal>
            <div className="mt-10">
              <h2 className="text-xl font-extrabold">What's inside</h2>
              <div className="mt-4 space-y-3">
                {course.parts.map((part, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, ease: EASE }}
                    className="rounded-2xl border border-royal/10 bg-white p-4 shadow-sm"
                  >
                    <p className="font-bold text-navy">
                      <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-royal text-xs font-bold text-white">{i + 1}</span>
                      {part.title}
                    </p>
                    {part.description && <p className="mt-1.5 pl-9 text-sm text-navy/60">{part.description}</p>}
                  </motion.div>
                ))}
              </div>
            </div>
          </Reveal>
        )}

        <Reveal>
          <div className="mt-10 rounded-3xl bg-white p-6 text-center shadow-xl shadow-royal/10 sm:p-8">
            <p className="font-display text-2xl font-extrabold text-royal">{inr(course.price)}</p>
            <p className="mt-1 text-sm text-navy/50">One-time payment &middot; Lifetime access</p>
            <button onClick={buy} className="btn btn-primary mt-5 px-10 py-3.5 text-base" data-testid="course-buy-btn">
              Buy this course <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </Reveal>
      </div>
    </main>
  );
}
