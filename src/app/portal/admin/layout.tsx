import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Admin',
    template: '%s | Ilmvers Admin',
  },
  robots: 'noindex, nofollow',
  manifest: '/admin-manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Ilmvers Admin',
  },
};

export default function AdminPortalSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
