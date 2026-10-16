import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Share2 } from 'lucide-react';
import { ConsultationSection } from '../components/Offerings';
import { useSEO } from '../lib/seo';

export function ConsultationPage() {
  useSEO(
    '1:1 Career Clarity Consultation | Rehabilified\u2122',
    'Book a personal consultation with Dr. Sayyeda Uneza Fatima. Get clear, honest answers on your physiotherapy career.',
  );

  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/#/consultation`;

  function copyLink() {
    navigator.clipboard?.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '1:1 Career Clarity Consultation | Rehabilified',
          text: 'Book a personal 1:1 video consultation with Dr. Sayyeda Uneza Fatima for career clarity in physiotherapy.',
          url: shareUrl,
        });
      } catch { /* user cancelled */ }
    } else {
      copyLink();
    }
  }

  return (
    <main data-testid="consultation-page">
      <div className="bg-mist px-5 pt-28 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-royal hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
          <div className="flex items-center gap-2">
            <button onClick={share} className="btn btn-outline !px-3 !py-2 text-xs" data-testid="consultation-share-btn">
              <Share2 className="h-4 w-4" /> Share
            </button>
            <button onClick={copyLink} className="btn btn-outline !px-3 !py-2 text-xs" data-testid="consultation-copy-link-btn">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
        </div>
      </div>
      <ConsultationSection />
    </main>
  );
}
