import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { SentryInit } from '@/components/observability/sentry-init';
import { OfflineBanner } from '@/components/layout/offline-banner';
import { ServiceWorkerRegistration } from '@/components/layout/service-worker-registration';
import { QueryProvider } from '@/providers/query-provider';
import './globals.css';

// Quyk redesign typeface: Hanken Grotesk (variable, Latin subset, SIL OFL),
// vendored in ./fonts so builds never fetch fonts. One file covers every
// weight; headings and body share it, as in the Figma design.
const quykSans = localFont({
  src: './fonts/hanken-grotesk-latin-wght-normal.woff2',
  variable: '--font-quyk',
  weight: '100 900',
  display: 'swap',
  fallback: ['system-ui', 'Segoe UI', 'sans-serif'],
  adjustFontFallback: 'Arial',
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
  themeColor: '#003D32',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${quykSans.variable} h-full`}>
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
