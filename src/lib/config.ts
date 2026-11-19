/** Centralized server-side configuration. Prefer env vars in production. */
export const ADMIN_ALERT_EMAIL =
  process.env.ADMIN_ALERT_EMAIL || 'info@ilmversinstitute.com';
