import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ConsultationSection } from '../components/Offerings';
import { useSEO } from '../lib/seo';

export function ConsultationPage() {
  useSEO(
    '1:1 Career Clarity Consultation | Rehabilified\u2122',
    'Book a personal consultation with Dr. Sayyeda Uneza Fatima. Get clear, honest answers on your physiotherapy career.',
  );

  return (
    <main data-testid="consultation-page">
      <div className="bg-mist px-5 pt-28 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-royal hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </div>
      </div>
      <ConsultationSection />
    </main>
  );
}
