// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore `.open-next/worker.js` only exists after opennextjs-cloudflare build
import { default as handler } from './.open-next/worker.js';

interface CronEnv {
  CRON_SECRET?: string;
}

interface CronController {
  cron: string;
}

const CRON_ROUTES: Record<string, string> = {
  '0 * * * *': '/api/cron/class-reminders',
  '30 * * * *': '/api/cron/class-reminders',
  '0 23 * * *': '/api/cron/process-subscriptions',
  '0 4 * * SUN': '/api/cron/sync-messaging-assignments',
  '0 5 1 * *': '/api/cron/purge-messages',
};

const ORIGIN = 'https://ilmvers.com';
const ADMIN_HOST = 'admin.ilmvers.com';

const worker = {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);
    if (url.hostname === ADMIN_HOST && url.pathname === '/') {
      url.pathname = '/portal/admin';
      return Response.redirect(url.toString(), 302);
    }
    return handler.fetch(request, env, ctx);
  },

  async scheduled(controller: CronController, env: CronEnv, ctx: unknown) {
    const path = CRON_ROUTES[controller.cron];
    if (!path) throw new Error(`No cron route mapped for schedule "${controller.cron}"`);
    if (!env.CRON_SECRET) throw new Error('CRON_SECRET is not configured on this Worker');

    const request = new Request(`${ORIGIN}${path}`, {
      headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
    });
    const response = await handler.fetch(request, env, ctx);
    const body = await response.text();
    if (!response.ok) throw new Error(`${path} failed (${response.status}): ${body}`);
    console.log(`[cron] ${controller.cron} ${path} -> ${body}`);
  },
};

export default worker;
