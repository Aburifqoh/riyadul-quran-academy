import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DEFAULT_PROGRAMMES, loadPublicProgrammes } from '@/lib/programmes';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return DEFAULT_PROGRAMMES.map((programme) => ({ slug: programme.slug }));
}

export const dynamicParams = true;
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const list = await loadPublicProgrammes({ includeUnpublished: true });
  const programme = list.find((p) => p.slug === slug) || DEFAULT_PROGRAMMES.find((p) => p.slug === slug);
  if (!programme) return {};
  return {
    title: { absolute: `${programme.seoTitle} | ILMVERS INSTITUTE` },
    description: programme.description,
    alternates: { canonical: `/programs/${programme.slug}` },
    openGraph: {
      title: programme.seoTitle,
      description: programme.description,
      url: `/programs/${programme.slug}`,
      type: 'website',
    },
  };
}

export default async function ProgrammePage({ params }: Props) {
  const { slug } = await params;
  const list = await loadPublicProgrammes();
  const programme = list.find((p) => p.slug === slug) || DEFAULT_PROGRAMMES.find((p) => p.slug === slug);
  if (!programme || programme.published === false) notFound();

  const others = list.filter((item) => item.slug !== programme.slug);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: programme.title,
    description: programme.description,
    provider: {
      '@type': 'EducationalOrganization',
      name: 'Ilmvers Institute',
      url: 'https://ilmvers.com',
    },
    url: `https://ilmvers.com/programs/${programme.slug}`,
  };

  return (
    <main className="bg-[#FAF9F6] text-[#2E2E2E] px-6 pt-12 pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="max-w-3xl mx-auto">
        <p className="text-xs font-bold tracking-[0.22em] uppercase text-[#D4AF37] mb-3">{programme.tagline}</p>
        <h1 className="font-headers text-4xl md:text-5xl font-bold text-[#004D4A] leading-tight mb-5">{programme.title}</h1>
        <p className="text-lg text-[#5A6E6C] leading-relaxed mb-8">{programme.description}</p>

        <section className="rounded-3xl bg-white border border-[#E2E9E7] p-6 md:p-8 mb-6">
          <h2 className="font-headers text-2xl text-[#004D4A] mb-3">Who it is for</h2>
          <p className="text-[#5A6E6C] leading-relaxed">{programme.audience}</p>
        </section>

        <section className="rounded-3xl bg-white border border-[#E2E9E7] p-6 md:p-8 mb-8">
          <h2 className="font-headers text-2xl text-[#004D4A] mb-4">What the classes cover</h2>
          <ul className="space-y-3">
            {programme.points.map((point) => (
              <li key={point} className="flex gap-3 text-[#2E2E2E]">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#D4AF37]" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-[#5A6E6C]">Duration and the fee are confirmed with you after the free assessment. This page is not a quote.</p>
        </section>

        <div className="flex flex-col sm:flex-row gap-3 mb-12">
          <Link href="/admissions" className="rounded-full bg-[#004D4A] text-white px-8 py-3 text-center font-semibold">
            Book the free assessment
          </Link>
          <Link href="/contact" className="rounded-full border-2 border-[#004D4A] text-[#004D4A] px-8 py-3 text-center font-semibold">
            Ask a question
          </Link>
        </div>

        <h2 className="font-headers text-2xl text-[#004D4A] mb-4">Other programmes</h2>
        <ul className="grid sm:grid-cols-2 gap-3">
          {others.map((item) => (
            <li key={item.slug}>
              <Link href={`/programs/${item.slug}`} className="block rounded-2xl border border-[#E2E9E7] bg-white px-4 py-3 hover:border-[#D4AF37]">
                <span className="font-semibold text-[#004D4A]">{item.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </article>
    </main>
  );
}
