import * as Sentry from '@sentry/nestjs';
import { getAppEnvironment } from '../config/env.validation';

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: getAppEnvironment(),
    release: process.env.GIT_SHA ?? process.env.GITHUB_SHA,
    tracesSampleRate: getAppEnvironment() === 'production' ? 0.1 : 1.0,
  });
}
