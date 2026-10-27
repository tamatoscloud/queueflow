/**
 * Hosts the Next.js image optimizer may fetch from. Keep in sync with
 * `images.remotePatterns` in next.config.ts. Extra hosts (e.g. a CDN for
 * tenant logos) can be added with NEXT_PUBLIC_IMAGE_HOSTS=host1,host2.
 */
export const OPTIMIZED_IMAGE_HOSTS: readonly string[] = [
  'images.unsplash.com',
  '*.supabase.co',
  ...(process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean),
];

function hostMatches(host: string, pattern: string): boolean {
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(1); // ".supabase.co"
    return host.endsWith(suffix) && host.length > suffix.length;
  }
  return host === pattern;
}

/**
 * True when `src` can go through the optimizer (same-origin path or an
 * allowlisted https host). Tenant-supplied logo URLs on other hosts render
 * with `unoptimized` instead of failing, so the optimizer is never an open proxy.
 */
export function isOptimizableImage(src: string | null | undefined): boolean {
  if (!src) return false;
  if (src.startsWith('/')) return true;
  try {
    const url = new URL(src);
    return (
      url.protocol === 'https:' &&
      OPTIMIZED_IMAGE_HOSTS.some((pattern) => hostMatches(url.hostname, pattern))
    );
  } catch {
    return false;
  }
}
