import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Admin Portal Login | Ilmvers",
  description: "Log in to the Ilmvers Admin Portal.",
  robots: 'noindex, nofollow',
};

export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
