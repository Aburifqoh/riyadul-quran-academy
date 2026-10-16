'use client';

import { useEffect, useRef } from 'react';

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
}

/** Cloudflare's public test key. It always passes and is only used on localhost. */
const LOCAL_SITE_KEY = '1x00000000000000000000AA';

export function TurnstileWidget({ onVerify, onExpire, onError }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const callbacksRef = useRef({ onVerify, onExpire, onError });

  useEffect(() => {
    callbacksRef.current = { onVerify, onExpire, onError };
  });

  useEffect(() => {
    const siteKey = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? LOCAL_SITE_KEY
      : process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

    if (!siteKey) {
      console.warn('[Turnstile] Missing NEXT_PUBLIC_TURNSTILE_SITE_KEY, auto-bypassing check.');
      callbacksRef.current.onVerify('bypass-token');
      return;
    }
    if (!containerRef.current) return;

    let destroyed = false;

    const renderWidget = () => {
      if (destroyed || !containerRef.current || !window.turnstile) return;
      if (widgetIdRef.current) return;

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => callbacksRef.current.onVerify(token),
        'expired-callback': () => callbacksRef.current.onExpire?.(),
        'error-callback': () => callbacksRef.current.onError?.(),
        theme: 'light',
        size: 'flexible',
      });
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      const existingScript = document.getElementById('cf-turnstile-script');
      if (!existingScript) {
        window.onloadTurnstileCallback = renderWidget;
        const script = document.createElement('script');
        script.id = 'cf-turnstile-script';
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback&render=explicit';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      } else {
        const poll = setInterval(() => {
          if (window.turnstile) {
            clearInterval(poll);
            renderWidget();
          }
        }, 100);
        setTimeout(() => clearInterval(poll), 10_000);
      }
    }

    return () => {
      destroyed = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // already removed
        }
        widgetIdRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} className="mt-1 min-h-[65px] w-full overflow-visible" />;
}
