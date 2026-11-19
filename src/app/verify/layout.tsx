import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Verify Email | Ilmvers",
  description: "Verify your email address for the Ilmvers Student Portal.",
  robots: 'noindex, nofollow',
};

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
