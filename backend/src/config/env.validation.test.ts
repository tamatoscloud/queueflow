import { afterEach, describe, expect, it } from 'vitest';
import { getBuildMetadata, getGitSha } from './env.validation';

const SHA_KEYS = ['RAILWAY_GIT_COMMIT_SHA', 'GIT_SHA', 'GITHUB_SHA'] as const;

const original = Object.fromEntries(
  SHA_KEYS.map((key) => [key, process.env[key]]),
) as Record<(typeof SHA_KEYS)[number], string | undefined>;

function setShaEnv(values: Partial<Record<(typeof SHA_KEYS)[number], string | undefined>>) {
  for (const key of SHA_KEYS) {
    const next = values[key];
    if (next === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = next;
    }
  }
}

afterEach(() => {
  setShaEnv(original);
});

describe('getGitSha', () => {
  it('prefers Railway deploy SHA over a stale GIT_SHA', () => {
    setShaEnv({
      RAILWAY_GIT_COMMIT_SHA: 'railway-live-sha',
      GIT_SHA: 'stale-static-sha',
      GITHUB_SHA: 'github-sha',
    });
    expect(getGitSha()).toBe('railway-live-sha');
    expect(getBuildMetadata().gitSha).toBe('railway-live-sha');
  });

  it('uses RAILWAY_DEPLOYMENT_ID for buildNumber when set', () => {
    const previous = {
      railway: process.env.RAILWAY_DEPLOYMENT_ID,
      build: process.env.BUILD_NUMBER,
      github: process.env.GITHUB_RUN_NUMBER,
    };
    process.env.RAILWAY_DEPLOYMENT_ID = 'dep-123';
    delete process.env.BUILD_NUMBER;
    delete process.env.GITHUB_RUN_NUMBER;
    try {
      expect(getBuildMetadata().buildNumber).toBe('dep-123');
    } finally {
      if (previous.railway === undefined) delete process.env.RAILWAY_DEPLOYMENT_ID;
      else process.env.RAILWAY_DEPLOYMENT_ID = previous.railway;
      if (previous.build === undefined) delete process.env.BUILD_NUMBER;
      else process.env.BUILD_NUMBER = previous.build;
      if (previous.github === undefined) delete process.env.GITHUB_RUN_NUMBER;
      else process.env.GITHUB_RUN_NUMBER = previous.github;
    }
  });

  it('falls back to GIT_SHA then GITHUB_SHA', () => {
    setShaEnv({
      RAILWAY_GIT_COMMIT_SHA: undefined,
      GIT_SHA: 'ci-sha',
      GITHUB_SHA: 'github-sha',
    });
    expect(getGitSha()).toBe('ci-sha');

    setShaEnv({
      RAILWAY_GIT_COMMIT_SHA: undefined,
      GIT_SHA: undefined,
      GITHUB_SHA: 'github-sha',
    });
    expect(getGitSha()).toBe('github-sha');
  });

  it('ignores blank SHA values', () => {
    setShaEnv({
      RAILWAY_GIT_COMMIT_SHA: '  ',
      GIT_SHA: '',
      GITHUB_SHA: 'github-sha',
    });
    expect(getGitSha()).toBe('github-sha');
  });
});
