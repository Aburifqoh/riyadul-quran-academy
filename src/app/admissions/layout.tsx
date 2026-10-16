import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Admissions | Ilmvers Online Academy",
  description: "Join a premier digital Islamic learning institution. Review our professional enrollment process, institutional policies, and student FAQs.",
};

export default function AdmissionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
