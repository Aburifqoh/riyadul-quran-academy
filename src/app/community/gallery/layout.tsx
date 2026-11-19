import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Class gallery',
  description: 'Photos from Ilmvers Institute classes. The gallery stays empty until the academy has pictures to publish.',
};

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
