import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Our scholars",
  description: "Instructor profiles at Ilmvers Institute. Cards stay as samples until the institute confirms the names and publishes them.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
