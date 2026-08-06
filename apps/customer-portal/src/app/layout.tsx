import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Playfair_Display } from 'next/font/google';
import { SentryInit } from '@/components/observability/sentry-init';
import { OfflineBanner } from '@/components/layout/offline-banner';
import { RealtimeStatusBanner } from '@/components/layout/realtime-status-banner';
import { ServiceWorkerRegistration } from '@/components/layout/service-worker-registration';
import { QueryProvider } from '@/providers/query-provider';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const playfair = Playfair_Display({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['600', '700'],
});

export const metadata: Metadata = {
  title: {
    default: 'QueueFlow',
    template: '%s · QueueFlow',
  },
  description: 'Join and track your queue in real time',
  applicationName: 'QueueFlow',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'QueueFlow',
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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans text-foreground antialiased">
        <QueryProvider>
          <SentryInit />
          <OfflineBanner />
          <RealtimeStatusBanner />
          {children}
          <ServiceWorkerRegistration />
        </QueryProvider>
      </body>
    </html>
  );
}
