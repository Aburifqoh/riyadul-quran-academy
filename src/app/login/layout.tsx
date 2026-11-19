import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Student Portal Login | Ilmvers",
  description: "Log in to the Ilmvers Student Portal to access your classes, schedule, and learning progress.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
