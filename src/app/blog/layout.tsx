import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Blog | Ilmvers",
  description: "Explore the Blog page of Ilmvers Premium Online Qur'an & Islamic Learning Institution.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
