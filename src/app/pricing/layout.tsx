import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Tuition",
  description: "Ilmvers Institute confirms tuition after the free assessment. This page does not publish a price until the official schedule is released.",
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
