import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "The Ilmvers Vision | Our Mission & Standard",
  description: "Learn about Ilmvers Academy's commitment to authentic Islamic education, our elite teacher vetting process, and our vision for digital Qur'anic learning.",
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
