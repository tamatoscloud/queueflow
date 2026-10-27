'use client';

import { useEffect, useState } from 'react';
import { MapPin, UtensilsCrossed } from 'lucide-react';
import { ConfettiBurst } from '@/components/queue/confetti-burst';
import { WalletPass } from '@/components/queue/wallet-pass';
import { Button } from '@/components/ui/button';
import { RESTAURANT_ADDRESS } from '@/lib/demo/restaurant-content';

type TableReadyScreenProps = {
  businessName: string;
  branchName: string;
  token: string;
  onProceed: () => void;
};

export function TableReadyScreen({
  businessName,
  branchName,
  token,
  onProceed,
}: TableReadyScreenProps) {
  const [reservedSeconds, setReservedSeconds] = useState(120);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setReservedSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const mins = Math.floor(reservedSeconds / 60);
  const secs = reservedSeconds % 60;

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-6 text-center animate-fade-in-up">
      <ConfettiBurst active />

      <div className="animate-success-pop rounded-full bg-gradient-to-br from-success to-secondary p-6 shadow-glow">
        <UtensilsCrossed className="h-16 w-16 text-white" aria-hidden />
      </div>

      <div>
        <h1 className="text-3xl font-black text-foreground">Your table is ready!</h1>
        <p className="mt-2 text-lg text-muted">Please proceed to the host stand</p>
      </div>

      <WalletPass
        businessName={businessName}
        branchName={branchName}
        token={token}
        status="CALLED"
        className="w-full max-w-sm shadow-glow"
      />

      <p className="rounded-full bg-warning-light px-4 py-2 text-sm font-semibold text-warning">
        Table held for {mins}:{secs.toString().padStart(2, '0')}
      </p>

      <div className="flex items-center gap-2 text-sm text-muted">
        <MapPin className="h-4 w-4 text-primary" aria-hidden />
        {RESTAURANT_ADDRESS}
      </div>

      <Button
        variant="default"
        size="lg"
        className="h-16 w-full max-w-sm rounded-2xl text-lg font-bold active:scale-[0.98]"
        onClick={onProceed}
      >
        Proceed to reception
      </Button>

      <p className="text-xs text-muted">Show this screen to our host</p>
    </div>
  );
}
