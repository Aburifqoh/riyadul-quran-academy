import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Enrol at Ilmvers",
  description: "Start at Ilmvers Institute with a free assessment. Your level, teacher, and fee are confirmed with you before any payment.",
};

export default function AdmissionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
