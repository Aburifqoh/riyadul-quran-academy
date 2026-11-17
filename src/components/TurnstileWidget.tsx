'use client';

import Script from 'next/script';
import { useCallback, useEffect, useRef, useState } from 'react';

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
}

/** Cloudflare's public test key. Always passes; only used on localhost. */
const LOCAL_SITE_KEY = '1x00000000000000000000AA';

type WidgetStatus = 'loading' | 'ready' | 'verified' | 'error' | 'bypassed';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: Record<string, unknown>
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

function resolveSiteKey(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return LOCAL_SITE_KEY;
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined;
}

export function TurnstileWidget({ onVerify, onExpire, onError }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const callbacksRef = useRef({ onVerify, onExpire, onError });
  const [status, setStatus] = useState<WidgetStatus>('loading');
  const [message, setMessage] = useState('Loading security check…');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    callbacksRef.current = { onVerify, onExpire, onError };
  });

  const clearWidget = useCallback(() => {
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {
        // already gone
      }
      widgetIdRef.current = null;
    }
  }, []);

  const bypass = useCallback((reason: string) => {
    clearWidget();
    setStatus('bypassed');
    setMessage(reason);
    callbacksRef.current.onVerify('bypass-token');
  }, [clearWidget]);

  const renderWidget = useCallback(() => {
    const siteKey = resolveSiteKey();
    if (!siteKey) {
      bypass('Security check is not configured for this environment.');
      return;
    }
    if (!containerRef.current || !window.turnstile) return;
    if (widgetIdRef.current) return;

    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: 'light',
        size: 'normal',
        appearance: 'always',
        callback: (token: string) => {
          setStatus('verified');
          setMessage('Security check complete.');
          callbacksRef.current.onVerify(token);
        },
        'expired-callback': () => {
          setStatus('ready');
          setMessage('Security check expired. Tick the box again.');
          callbacksRef.current.onExpire?.();
        },
        'error-callback': (code?: string | Error) => {
          const codeText = typeof code === 'string' ? code : '';
          // 110200 = domain not on the widget hostname list — retry will not help.
          const configFail = /110200|110100|110110|400020|400021|400070/.test(codeText);
          callbacksRef.current.onError?.();
          if (configFail) {
            bypass(
              'Security check is misconfigured for this domain. You can continue — ask the site admin to add ilmvers.com (and www) in Cloudflare Turnstile hostnames.'
            );
            return true;
          }
          setStatus('error');
          setMessage(
            'Security check failed to load. Allow challenges.cloudflare.com, turn off ad blockers, or tap Retry / Continue without box.'
          );
          return true;
        },
        'timeout-callback': () => {
          setStatus('ready');
          setMessage('Security check timed out. Tick the box again.');
        },
      });
      setStatus('ready');
      setMessage('Complete the security check below, then continue.');
    } catch {
      setStatus('error');
      setMessage('Security check could not start. Tap Retry.');
      callbacksRef.current.onError?.();
    }
  }, [bypass]);

  useEffect(() => {
    let cancelled = false;
    let loadTimer: ReturnType<typeof setTimeout> | undefined;
    let poll: ReturnType<typeof setInterval> | undefined;

    setStatus('loading');
    setMessage('Loading security check…');
    callbacksRef.current.onExpire?.();

    const tryRender = () => {
      if (cancelled) return;
      if (window.turnstile) {
        renderWidget();
        return;
      }
      poll = setInterval(() => {
        if (cancelled) return;
        if (window.turnstile) {
          if (poll) clearInterval(poll);
          renderWidget();
        }
      }, 150);
    };

    tryRender();

    // If the iframe never appears (blocked script / domain mismatch), don't trap the user.
    loadTimer = setTimeout(() => {
      if (cancelled) return;
      if (!widgetIdRef.current) {
        bypass(
          'Security check could not load in this browser. You can continue — refresh later if this keeps happening.'
        );
      }
    }, 12_000);

    return () => {
      cancelled = true;
      if (loadTimer) clearTimeout(loadTimer);
      if (poll) clearInterval(poll);
      clearWidget();
    };
  }, [reloadKey, renderWidget, bypass, clearWidget]);

  const retry = () => {
    clearWidget();
    callbacksRef.current.onExpire?.();
    setReloadKey((value) => value + 1);
  };

  const continueWithout = () => {
    bypass('Continuing without the visual security box.');
  };

  return (
    <div className="space-y-2">
      <Script
        id="cf-turnstile-script"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => renderWidget()}
        onError={() => {
          setStatus('error');
          setMessage(
            'Could not reach Cloudflare Turnstile. Turn off ad blockers or tap Continue without box.'
          );
        }}
      />
      <div
        ref={containerRef}
        className="min-h-[65px] w-full min-w-[300px] overflow-visible"
        aria-live="polite"
      />
      <p
        className={`text-xs leading-relaxed ${
          status === 'error'
            ? 'text-red-700'
            : status === 'verified' || status === 'bypassed'
              ? 'text-[#0F3D38]'
              : 'text-[#5A6E6C]'
        }`}
      >
        {message}
      </p>
      {(status === 'error' || status === 'loading') && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={retry}
            className="text-xs font-semibold rounded-full border border-[#004D4A] text-[#004D4A] px-3 py-1.5"
          >
            Retry security check
          </button>
          {status === 'error' ? (
            <button
              type="button"
              onClick={continueWithout}
              className="text-xs font-semibold rounded-full bg-[#004D4A] text-white px-3 py-1.5"
            >
              Continue without box
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
