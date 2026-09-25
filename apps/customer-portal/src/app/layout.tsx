import type { Metadata, Viewport } from 'next';
import { Geist, Playfair_Display } from 'next/font/google';
import { SentryInit } from '@/components/observability/sentry-init';
import { OfflineBanner } from '@/components/layout/offline-banner';
import { ServiceWorkerRegistration } from '@/components/layout/service-worker-registration';
import { QueryProvider } from '@/providers/query-provider';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const playfair = Playfair_Display({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['600', '700'],
  display: 'swap',
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
