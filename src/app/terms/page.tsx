import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'How enrolment, classes, and the study assistant work at Ilmvers Institute.',
};

export default function TermsPage() {
  return (
    <main className="bg-[#FAF9F6] min-h-screen text-[#2E2E2E] px-6 pt-16 pb-20">
      <article className="max-w-3xl mx-auto space-y-4 [&_h1]:font-headers [&_h1]:text-4xl [&_h1]:text-[#004D4A] [&_h2]:font-headers [&_h2]:text-2xl [&_h2]:text-[#004D4A] [&_h2]:mt-8">
        <p className="text-sm font-semibold text-[#D4AF37]">Last updated: November 10, 2026</p>
        <h1>Terms of Service</h1>
        <p>These terms cover the public website and the classes you enrol in with Ilmvers Institute.</p>

        <h2>Enrolment</h2>
        <p>A free assessment places you on a track. Your fee, timetable, and teacher are confirmed with you before any payment. Figures that are not on a written confirmation from Ilmvers are not a quote.</p>

        <h2>Classes</h2>
        <p>Live classes are opened from the student portal. If a teacher cannot attend, the academy contacts you to arrange another time.</p>

        <h2>Study assistant</h2>
        <p>The Ilmvers study assistant helps with revision. It is not a fatwa, a medical opinion, or financial advice. Ask a teacher for a ruling or for anything that affects your health or money.</p>

        <h2>Accounts</h2>
        <p>Keep your login private. You may ask us to correct your details or close an account by writing to info@ilmversinstitute.com.</p>

        <h2>Contact</h2>
        <p>Email info@ilmversinstitute.com or WhatsApp +234 810 969 0304. The privacy note is on the <Link href="/privacy" className="text-[#004D4A] underline">privacy page</Link>.</p>
      </article>
    </main>
  );
}
