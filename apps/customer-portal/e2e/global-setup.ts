import type { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const apiBase =
    (config.metadata?.apiBaseUrl as string | undefined) ??
    process.env.API_BASE_URL ??
    'http://localhost:3000/api/v1';

  try {
    const root = apiBase.replace(/\/api\/v1\/?$/, '');
    const health = await fetch(`${root}/api/v1/health/live`);
    if (!health.ok) {
      console.warn(
        `[e2e] Backend health check failed (${health.status}). Tests may skip if services are unavailable.`,
      );
    }
  } catch {
    console.warn(
      '[e2e] Backend not reachable. Start backend + customer portal before running Playwright.',
    );
  }
}

export default globalSetup;
