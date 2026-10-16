import type { JsonValue } from '@/types/json';

export const trackMetaEvent = async (
  eventName: string,
  userData: { email?: string; phone?: string; name?: string; ip?: string; userAgent?: string } = {},
  eventData: Record<string, JsonValue> = {}
) => {
  try {
    const eventId = crypto.randomUUID();

    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', eventName, eventData, { eventID: eventId });
    }

    await fetch('/api/fb-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName,
        eventId,
        url: typeof window !== 'undefined' ? window.location.href : '',
        ...userData
      })
    });
  } catch (error) {
    console.error(`Meta tracking failed for ${eventName}:`, error);
  }
};
