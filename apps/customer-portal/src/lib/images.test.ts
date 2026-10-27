import { describe, it, expect } from 'vitest';
import { isOptimizableImage } from './images';

describe('isOptimizableImage', () => {
  it('allows same-origin paths and allowlisted https hosts', () => {
    expect(isOptimizableImage('/brand/quyk-logo.png')).toBe(true);
    expect(isOptimizableImage('https://images.unsplash.com/photo-1?w=1200')).toBe(true);
    expect(isOptimizableImage('https://abc.supabase.co/storage/v1/object/public/logo.png')).toBe(true);
  });

  it('rejects other hosts, plain http and look-alike domains', () => {
    expect(isOptimizableImage('https://evil.example/logo.png')).toBe(false);
    expect(isOptimizableImage('http://images.unsplash.com/x.png')).toBe(false);
    expect(isOptimizableImage('https://supabase.co.evil.example/x.png')).toBe(false);
    expect(isOptimizableImage('https://supabase.co/x.png')).toBe(false);
    expect(isOptimizableImage('not a url')).toBe(false);
    expect(isOptimizableImage(null)).toBe(false);
  });
});
