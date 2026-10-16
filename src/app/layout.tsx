import { Suspense } from 'react';
import type { Metadata, Viewport } from "next";
import { Amiri, Playfair_Display, Montserrat } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FloatingButtons } from "@/components/FloatingButtons";
import { AuthProvider } from "@/context/AuthContext";
import MetaPixel from "@/components/MetaPixel";
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

const amiri = Amiri({
  weight: ['400', '700'],
  subsets: ['arabic', 'latin'],
  variable: '--font-amiri',
  display: 'swap',
});

const BASE_URL = 'https://ilmversinstitute.com';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "ILMVERS INSTITUTE | Knowledge. Faith. Excellence.",
    template: "%s | ILMVERS INSTITUTE",
  },
  description: "Authentic Islamic education delivered by qualified scholars with modern learning tools. Study Qur'an & Tajweed, Islamic Studies, Hifz, Arabic Language, and Children's Education anytime, anywhere.",
  keywords: [
    "Ilmvers Institute", "Ilmvers Academy", "ilmversinstitute.com", "online Islamic academy",
    "learn Quran online", "Tajweed classes online", "Hifz program online",
    "Islamic studies online", "Arabic language online", "Quran memorisation",
    "qualified scholars", "live Islamic classes", "certified Islamic education",
    "Islamic school online", "Quran for children", "adult Islamic classes"
  ],
  authors: [{ name: "Ilmvers Institute", url: BASE_URL }],
  creator: "Ilmvers Institute",
  publisher: "Ilmvers Institute",
  category: "Education",
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    title: "ILMVERS INSTITUTE | Knowledge. Faith. Excellence.",
    description: "Authentic Islamic education, delivered by qualified scholars, with modern learning tools — anytime, anywhere in the world.",
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
    title: "ILMVERS INSTITUTE | Knowledge. Faith. Excellence.",
    description: "Authentic Islamic education, delivered by qualified scholars, with modern learning tools.",
    images: ["/assets/images/logo.jpeg"],
  },
  manifest: "/manifest.json",
  icons: [
    {
      media: '(prefers-color-scheme: light)',
      url: '/assets/images/logo.jpeg',
      href: '/assets/images/logo.jpeg',
    },
    {
      media: '(prefers-color-scheme: dark)',
      url: '/assets/images/logo dark.jpeg',
      href: '/assets/images/logo dark.jpeg',
    },
    {
      rel: 'apple-touch-icon',
      url: '/assets/images/logo.jpeg',
    }
  ],
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
      className={cn("h-full", "antialiased", playfair.variable, montserrat.variable, amiri.variable, "font-sans")}
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Amiri+Quran&display=swap"
          rel="stylesheet"
        />
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
              "url": "https://ilmversinstitute.com",
              "logo": "https://ilmversinstitute.com/assets/images/logo.jpeg",
              "description": "Ilmvers Institute is a premier online Islamic institution offering structured learning in Qur'an & Tajweed, Islamic Studies, Hifz, Arabic Language, and Children's Education delivered by qualified scholars.",
              "sameAs": [
                "https://instagram.com/ilmversinstitute",
                "https://youtube.com/@ilmversinstitute"
              ],
              "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "Customer Support",
                "availableLanguage": ["English", "Arabic"],
                "url": "https://ilmversinstitute.com/contact"
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


