import { AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Alert({
  children,
  variant = 'error',
  className,
}: {
  children: React.ReactNode;
  variant?: 'error' | 'info' | 'success' | 'warning';
  className?: string;
}) {
  const Icon = variant === 'info' ? Info : AlertCircle;
  return (
    <div
      role="alert"
      className={cn(
        'flex gap-3 rounded-2xl border p-4 text-sm',
        variant === 'error' && 'border-danger/20 bg-danger-light text-danger',
        variant === 'info' && 'border-info/20 bg-info-light text-info',
        variant === 'success' && 'border-success/20 bg-success-light text-success',
        variant === 'warning' && 'border-warning/20 bg-warning-light text-warning',
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}
