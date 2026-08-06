'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 py-12 text-center animate-fade-in-up">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-danger-light">
        <AlertCircle className="h-8 w-8 text-danger" aria-hidden />
      </div>
      <div>
        <p className="text-lg font-semibold text-foreground">{title}</p>
        {message && <p className="mt-2 text-sm text-muted">{message}</p>}
      </div>
      {onRetry && (
        <Button type="button" variant="outline" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" aria-hidden />
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon: Icon = AlertCircle,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center animate-fade-in-up">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Icon className="h-8 w-8 text-primary" aria-hidden />
      </div>
      <p className="font-semibold text-foreground">{title}</p>
      {description && <p className="max-w-xs text-sm text-muted">{description}</p>}
    </div>
  );
}
