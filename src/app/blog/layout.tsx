import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Academy journal",
  description: "Notes and writing from Ilmvers Institute. New pieces appear here when the academy publishes them.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
