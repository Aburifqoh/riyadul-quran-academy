import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create an account',
  description: 'Create an Ilmvers Institute account, then book the free assessment. Your level and fee are confirmed before any payment.',
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
