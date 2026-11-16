import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Islamic programmes",
  description: "Six live programmes at Ilmvers Institute: Qur'an and Tajweed, Islamic Studies, Hifz, Arabic, Children's Education, and Advanced Studies. Fees are confirmed at enrolment.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
