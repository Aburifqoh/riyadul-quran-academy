import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How Ilmvers Institute collects and uses student, parent, and study-assistant information. The assistant supports study and is not a fatwa.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
