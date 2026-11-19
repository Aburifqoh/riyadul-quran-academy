import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Contact Ilmvers",
  description: "Write to Ilmvers Institute at info@ilmversinstitute.com or WhatsApp +234 810 969 0304. Ask about enrolment, a scholarship, or a class.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
