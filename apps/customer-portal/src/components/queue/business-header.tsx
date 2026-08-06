import Image from 'next/image';
import { cn } from '@/lib/utils';
import { RESTAURANT_HERO_IMAGE_URL } from '@/lib/demo/restaurant-theme';

export function BusinessHeader({
  name,
  logoUrl,
  branchName,
  queueName,
  heroImageUrl,
  className,
}: {
  name: string;
  logoUrl?: string | null;
  branchName?: string;
  queueName?: string;
  heroImageUrl?: string | null;
  className?: string;
}) {
  const hero = heroImageUrl ?? null;

  return (
    <header className={cn('flex flex-col items-center gap-4 text-center animate-fade-in-up', className)}>
      {hero ? (
        <div className="relative w-full overflow-hidden rounded-2xl shadow-lg">
          <div className="relative aspect-[2.2/1] w-full">
            <Image
              src={hero}
              alt={`${name} interior`}
              fill
              className="object-cover"
              priority
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
            <div className="flex items-end gap-3">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={`${name} logo`}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-xl object-cover ring-2 ring-white/80 shadow-md"
                  unoptimized
                />
              ) : (
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent-purple text-lg font-bold text-white shadow-md ring-2 ring-white/80"
                  aria-hidden
                >
                  {name.charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-xl font-bold tracking-tight text-white drop-shadow-sm">
                  {name}
                </h1>
                {branchName && (
                  <p className="text-sm text-white/85">{branchName}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {logoUrl ? (
            <div className="relative">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary to-accent-purple opacity-30 blur-sm" />
              <Image
                src={logoUrl}
                alt={`${name} logo`}
                width={80}
                height={80}
                className="relative h-20 w-20 rounded-2xl object-cover shadow-md ring-2 ring-white"
                unoptimized
              />
            </div>
          ) : (
            <div
              className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent-purple text-3xl font-bold text-white shadow-lg"
              aria-hidden
            >
              {name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{name}</h1>
            {branchName && <p className="mt-1 text-sm text-muted">{branchName}</p>}
          </div>
        </>
      )}

      {queueName && (
        <p className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
          {queueName}
        </p>
      )}
    </header>
  );
}

export { RESTAURANT_HERO_IMAGE_URL };
