import { Suspense } from 'react';
import type { Metadata, Viewport } from "next";
import { Playfair_Display, Montserrat } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { PwaRegister } from "@/components/PwaRegister";
import { Footer } from "@/components/Footer";
import { FloatingButtons } from "@/components/FloatingButtons";
import { AuthProvider } from "@/context/AuthContext";
import MetaPixel from "@/components/MetaPixel";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import Link from 'next/link';
import { cn } from "@/lib/utils";

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
});

const BASE_URL = 'https://ilmvers.com';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "ILMVERS INSTITUTE | Knowledge. Faith. Excellence.",
    template: "%s | ILMVERS INSTITUTE",
  },
  description: "Live Islamic classes in Qur'an and Tajweed, Islamic Studies, Hifz, Arabic, and Children's Education.",
  keywords: [
    "Ilmvers Institute", "Ilmvers Academy", "ilmversinstitute.com", "online Islamic academy",
    "learn Quran online", "Tajweed classes online", "Hifz program online",
    "Islamic studies online", "Arabic language online", "Quran memorisation",
    "live Islamic classes", "Ilmvers online classes",
    "Islamic school online", "Quran for children", "adult Islamic classes"
  ],
  authors: [{ name: "Ilmvers Institute", url: BASE_URL }],
  creator: "Ilmvers Institute",
  publisher: "Ilmvers Institute",
  category: "Education",
  openGraph: {
    url: BASE_URL,
    siteName: "Ilmvers Institute",
    images: [
      {
        url: "/assets/images/logo.jpeg",
        width: 1200,
        height: 630,
        alt: "Ilmvers Institute – Knowledge. Faith. Excellence.",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    images: ["/assets/images/logo.jpeg"],
  },
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Ilmvers",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-ilmvers-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-ilmvers.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  formatDetection: {
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  other: {}
};

export const viewport: Viewport = {
  themeColor: '#004D4A',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "scroll-pt-28", "antialiased", playfair.variable, montserrat.variable, "font-sans")}
    >
      <head>
        <GoogleAnalytics />
        {process.env.NEXT_PUBLIC_META_PIXEL_ID && (
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              src={`https://www.facebook.com/tr?id=${process.env.NEXT_PUBLIC_META_PIXEL_ID}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "EducationalOrganization",
              "name": "ILMVERS INSTITUTE",
              "alternateName": ["Ilmvers Institute", "Ilmvers Academy"],
              "url": "https://ilmvers.com",
              "logo": "https://ilmvers.com/assets/images/logo.jpeg",
              "description": "Ilmvers Institute teaches Qur'an and Tajweed, Islamic Studies, Hifz, Arabic, and Children's Education in live classes.",
              "sameAs": [
                "https://instagram.com/ilmversinstitute",
                "https://youtube.com/@ilmversinstitute"
              ],
              "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "Customer Support",
                "availableLanguage": ["English", "Arabic"],
                "url": "https://ilmvers.com/contact"
              },
              "hasOfferCatalog": {
                "@type": "OfferCatalog",
                "name": "Islamic Learning Programs",
                "itemListElement": [
                  { "@type": "Offer", "itemOffered": { "@type": "Course", "name": "Qur'an & Tajweed" } },
                  { "@type": "Offer", "itemOffered": { "@type": "Course", "name": "Islamic Studies" } },
                  { "@type": "Offer", "itemOffered": { "@type": "Course", "name": "Hifz & Qur'an Memorization" } },
                  { "@type": "Offer", "itemOffered": { "@type": "Course", "name": "Arabic Language" } },
                  { "@type": "Offer", "itemOffered": { "@type": "Course", "name": "Children's Education" } },
                  { "@type": "Offer", "itemOffered": { "@type": "Course", "name": "Advanced Islamic Studies" } }
                ]
              }
            })
          }}
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <AuthProvider>
          <Suspense fallback={null}>
            <MetaPixel />
          </Suspense>
          <PwaRegister />
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
          <FloatingButtons />
        </AuthProvider>
      </body>
    </html>
  );
}


