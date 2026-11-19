import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Teacher Portal Login | Ilmvers",
  description: "Log in to the Ilmvers Teacher Portal.",
  robots: 'noindex, nofollow',
};

export default function TeacherLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
