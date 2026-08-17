import { CalmButton, CalmCard } from '@/components/customer/calm/primitives';

export function CalmError({
  title = 'Something went wrong',
  message = "We couldn't load this page.",
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 py-12 text-center">
      <CalmCard className="w-full text-center">
        <p className="text-xl font-bold text-foreground">{title}</p>
        <p className="mt-2 text-sm text-muted">{message}</p>
      </CalmCard>
      {onRetry ? (
        <CalmButton onClick={onRetry}>Try again</CalmButton>
      ) : null}
    </div>
  );
}
