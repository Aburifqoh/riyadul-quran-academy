/**
 * Hifz Lab stays behind "Coming Soon" until the alignment service it depends on
 * is actually reachable in production.
 *
 * The engine and the scoring are finished and validated; what is missing is
 * infrastructure. `hifz-api` is a ~1.2GB PyTorch service that cannot run inside
 * a Cloudflare Worker, so `HIFZ_SCORING_URL` has to point at a real host first.
 * Until it does, every recording would come back "grading is temporarily
 * offline" — worse than an honest Coming Soon.
 *
 * To go live: host hifz-api, set HIFZ_SCORING_URL to it, set
 * NEXT_PUBLIC_HIFZ_LAB_ENABLED = "true" in wrangler.toml [vars], redeploy.
 * Nothing else needs editing.
 */
export const HIFZ_LAB_ENABLED = process.env.NEXT_PUBLIC_HIFZ_LAB_ENABLED === 'true';
