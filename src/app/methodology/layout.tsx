import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "How learning works",
  description: "How an Ilmvers class is taught: a free assessment, a teacher matched to the level, and live lessons with attendance and homework in the portal.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
