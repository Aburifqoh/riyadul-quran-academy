import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Free Placement Assessment | Ilmvers",
  description: "Book your free placement assessment at Ilmvers to begin your Quranic journey with a customized learning path.",
};

export default function AssessmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
