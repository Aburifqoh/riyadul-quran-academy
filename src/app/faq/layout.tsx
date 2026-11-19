import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Questions about Ilmvers",
  description: "Answers about enrolment, live classes, the six programmes, and how parents follow attendance and homework at Ilmvers Institute.",
};

export default function FaqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
