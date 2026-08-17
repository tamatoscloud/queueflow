import { QrCode, Sparkles } from 'lucide-react';
import { PageShell } from '@/components/layout/page-shell';
import { Card, CardContent } from '@/components/ui/card';

export default function HomePage() {
  return (
    <PageShell gradient>
      <div className="flex flex-1 flex-col items-center justify-center gap-8 py-8 text-center animate-fade-in-up">
        <div className="relative">
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/20 to-accent-purple/20 blur-xl" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent-purple shadow-lg">
            <QrCode className="h-10 w-10 text-white" aria-hidden />
          </div>
        </div>

        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3 w-3" aria-hidden />
            Real-time queue tracking
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">QueueFlow</h1>
          <p className="mx-auto mt-3 max-w-sm text-muted">
            Scan the QR code at the venue to join a queue and track your position live.
          </p>
        </div>

        <Card className="w-full text-left">
          <CardContent className="pt-5">
            <p className="font-semibold text-foreground">Already joined?</p>
            <p className="mt-1.5 text-sm text-muted">
              Open the tracking link from your confirmation screen, or check your SMS/WhatsApp
              notification.
            </p>
          </CardContent>
        </Card>

        <p className="text-xs text-muted">Ask staff for a queue QR code to get started.</p>
      </div>
    </PageShell>
  );
}
