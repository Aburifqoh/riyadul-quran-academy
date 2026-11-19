import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Secure Payment | Ilmvers",
  description: "Complete your tuition payment securely at Ilmvers.",
  robots: 'noindex, nofollow',
};

export default function PaymentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
