import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "The Ilmvers Vision | Our Mission & Standard",
  description: "Ilmvers Institute teaches Qur'an, Tajweed, Hifz, Arabic, and Islamic studies in live classes.",
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
