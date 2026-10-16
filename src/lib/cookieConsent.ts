export const COOKIE_CONSENT_KEY = 'ilmvers_cookie_consent';
export const COOKIE_CONSENT_EVENT = 'ilmvers-cookie-consent';

export type CookieConsentValue = 'accepted' | 'rejected';

export function readCookieConsent(): CookieConsentValue | null {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(COOKIE_CONSENT_KEY);
  return value === 'accepted' || value === 'rejected' ? value : null;
}

export function writeCookieConsent(value: CookieConsentValue) {
  window.localStorage.setItem(COOKIE_CONSENT_KEY, value);
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: value }));
}

export function subscribeCookieConsent(onChange: () => void) {
  window.addEventListener(COOKIE_CONSENT_EVENT, onChange);
  return () => window.removeEventListener(COOKIE_CONSENT_EVENT, onChange);
}
