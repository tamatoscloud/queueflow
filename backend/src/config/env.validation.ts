/**
 * Validates required environment variables at process startup.
 * Fails fast with actionable messages — never silently use insecure defaults in production.
 */
export type AppEnvironment = 'development' | 'staging' | 'production';

const PLACEHOLDER_PATTERNS = [
  'CHANGE_ME',
  'YOUR_',
  'PROJECT_REF',
  'placeholder',
];

export function getAppEnvironment(): AppEnvironment {
  const raw = (process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development').toLowerCase();
  if (raw === 'production' || raw === 'prod') return 'production';
  if (raw === 'staging' || raw === 'stage') return 'staging';
  return 'development';
}

function isPlaceholder(value: string | undefined): boolean {
  if (!value?.trim()) return true;
  const v = value.trim();
  return PLACEHOLDER_PATTERNS.some((p) => v.includes(p));
}

function requireVar(name: string, value: string | undefined, env: AppEnvironment): string {
  if (!value?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  if (env === 'production' && isPlaceholder(value)) {
    throw new Error(
      `Environment variable ${name} contains a placeholder value. Inject a real secret in production.`,
    );
  }
  return value.trim();
}

export function validateEnvironment(): void {
  const env = getAppEnvironment();
  const errors: string[] = [];

  const check = (name: string, optional = false) => {
    const value = process.env[name];
    if (optional && !value?.trim()) return;
    try {
      requireVar(name, value, env);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  };

  check('DATABASE_URL');
  check('JWT_SECRET');
  check('REFRESH_TOKEN_SECRET');
  check('CORS_ALLOWED_ORIGINS', env === 'development');

  if (env !== 'development') {
    check('SUPABASE_URL');
    check('SUPABASE_SECRET_KEY');
  }

  if (env === 'production') {
    if (process.env.NOTIFICATION_USE_MOCK === 'true') {
      errors.push('NOTIFICATION_USE_MOCK must not be true in production');
    }
    if (isPlaceholder(process.env.JWT_SECRET)) {
      errors.push('JWT_SECRET must not use a placeholder in production');
    }
  }

  if (env !== 'development') {
    // Warn rather than fail so an existing deployment never refuses to boot;
    // rotate to 32+ random characters at the next maintenance window.
    for (const key of ['JWT_SECRET', 'REFRESH_TOKEN_SECRET']) {
      const value = process.env[key];
      if (value && value.length < 32) {
        console.warn(`[env] ${key} is shorter than 32 characters — rotate it to a longer random secret`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed (${env}):\n${errors.map((e) => `  - ${e}`).join('\n')}`,
    );
  }
}

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

export function getGitSha(): string {
  return (
    firstNonEmpty(
      process.env.RAILWAY_GIT_COMMIT_SHA,
      process.env.GIT_SHA,
      process.env.GITHUB_SHA,
    ) ?? 'unknown'
  );
}

export function getBuildMetadata() {
  return {
    version: process.env.npm_package_version ?? '0.1.0',
    gitSha: getGitSha(),
    buildNumber:
      firstNonEmpty(
        process.env.BUILD_NUMBER,
        process.env.GITHUB_RUN_NUMBER,
        process.env.RAILWAY_DEPLOYMENT_ID,
      ) ?? 'local',
    environment: getAppEnvironment(),
  };
}
