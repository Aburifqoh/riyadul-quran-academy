'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export default function MetaPixel() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!PIXEL_ID) return;

    // Standard Meta Pixel Code
    /* eslint-disable */
    // @ts-ignore
    if (!window.fbq) {
      // @ts-ignore
      window.fbq = function () {
        // @ts-ignore
        window.fbq.callMethod ? window.fbq.callMethod.apply(window.fbq, arguments) : window.fbq.queue.push(arguments);
      };
      // @ts-ignore
      if (!window._fbq) window._fbq = window.fbq;
      // @ts-ignore
      window.fbq.push = window.fbq;
      // @ts-ignore
      window.fbq.loaded = true;
      // @ts-ignore
      window.fbq.version = '2.0';
      // @ts-ignore
      window.fbq.queue = [];

      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      const firstScript = document.getElementsByTagName('script')[0];
      firstScript.parentNode?.insertBefore(script, firstScript);

      // @ts-ignore
      window.fbq('init', PIXEL_ID);
    }
  }, []);

  useEffect(() => {
    if (!PIXEL_ID) return;

    // Track page views on route changes
    // @ts-ignore
    if (window.fbq) {
      // @ts-ignore
      window.fbq('track', 'PageView');
    }
  }, [pathname, searchParams]);

  return null;
}
