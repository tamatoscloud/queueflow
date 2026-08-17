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
        <p className="font-display text-xl font-bold text-[#17151a]">{title}</p>
        <p className="mt-2 text-sm text-[#6b6870]">{message}</p>
      </CalmCard>
      {onRetry ? (
        <CalmButton onClick={onRetry}>Try again</CalmButton>
      ) : null}
    </div>
  );
}
