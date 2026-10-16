import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Frequently Asked Questions | Ilmvers Academy",
  description: "Find answers to common questions about admissions, our live class portal, parent transparency, and academic programs at Ilmvers Academy.",
};

export default function FaqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
