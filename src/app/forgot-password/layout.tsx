import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Forgot Password | Ilmvers",
  description: "Reset your password for the Ilmvers Student Portal.",
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
