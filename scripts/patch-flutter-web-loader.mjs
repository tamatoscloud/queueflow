// Run this after `flutter build web` and before `vercel deploy`.
// Flutter git projects on Vercel skip the build when the ignore command
// exits 0 (`true`). An exit code of 1 still publishes an empty site.
// Flutter waits up to 4s for the service worker before loading the app.
// A short timeout still installs the worker, but the first open does not sit on it.
// Also starts the engine download from <head> so it overlaps flutter_bootstrap.js.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
if (!dir) {
  console.error('usage: node scripts/patch-flutter-web-loader.mjs <build/web>');
  process.exit(1);
}

const bootstrapPath = join(dir, 'flutter_bootstrap.js');
const indexPath = join(dir, 'index.html');

const bootstrap = readFileSync(bootstrapPath, 'utf8');
const patchedBootstrap = bootstrap.replaceAll('timeoutMillis:n=4e3', 'timeoutMillis:n=800');
if (patchedBootstrap === bootstrap) {
  console.error('loader timeout pattern not found');
  process.exit(1);
}
writeFileSync(bootstrapPath, patchedBootstrap);

const js = readFileSync(join(dir, 'main.dart.js'), 'utf8');
const canvasKit = js.match(
  /https:\/\/www\.gstatic\.com\/flutter-canvaskit\/[a-f0-9]+\//,
)?.[0];

let index = readFileSync(indexPath, 'utf8');
if (!index.includes('rel="preconnect" href="https://www.gstatic.com"')) {
  const hints = [
    '<link rel="preconnect" href="https://www.gstatic.com" crossorigin>',
    '<link rel="preload" href="main.dart.js" as="script">',
  ];
  if (canvasKit) {
    hints.push(
      `<link rel="preload" href="${canvasKit}canvaskit.js" as="script" crossorigin>`,
      `<link rel="preload" href="${canvasKit}canvaskit.wasm" as="fetch" crossorigin>`,
    );
  }
  index = index.replace('</head>', `  ${hints.join('\n  ')}\n</head>`);
  writeFileSync(indexPath, index);
}

console.log('patched', dir, canvasKit ?? 'local-canvaskit');
