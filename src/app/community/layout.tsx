import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Community",
  description: "Writing, class photos, and optional study circles at Ilmvers Institute. Circles are arranged with enrolled families and are not separate priced courses.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
