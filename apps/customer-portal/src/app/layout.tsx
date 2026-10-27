import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { SentryInit } from '@/components/observability/sentry-init';
import { OfflineBanner } from '@/components/layout/offline-banner';
import { ServiceWorkerRegistration } from '@/components/layout/service-worker-registration';
import { QueryProvider } from '@/providers/query-provider';
import './globals.css';

// Fonts are vendored in ./fonts (Latin subsets, SIL OFL) instead of being
// fetched from Google at build time: builds no longer fail when
// fonts.googleapis.com is unreachable, and the Geist file is a 34 KB variable
// subset covering every weight in one request.
const geistSans = localFont({
  src: './fonts/geist-latin-var.woff2',
  variable: '--font-geist-sans',
  weight: '100 900',
  display: 'swap',
  fallback: ['system-ui', 'Segoe UI', 'sans-serif'],
  adjustFontFallback: 'Arial',
});

// Display face is only used for headings; don't block the first paint on it.
const playfair = localFont({
  src: [
    { path: './fonts/playfair-display-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: './fonts/playfair-display-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-display',
  display: 'swap',
  preload: false,
  fallback: ['Georgia', 'Times New Roman', 'serif'],
  adjustFontFallback: 'Times New Roman',
});

export const metadata: Metadata = {
  title: {
    default: 'Quyk',
    template: '%s · Quyk',
  },
  description: 'Join and track your queue in real time',
  applicationName: 'Quyk',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Quyk',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#6366F1',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${playfair.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans text-foreground antialiased">
        <QueryProvider>
          <SentryInit />
          <OfflineBanner />
          {children}
          <ServiceWorkerRegistration />
        </QueryProvider>
      </body>
    </html>
  );
}
