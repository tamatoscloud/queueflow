import { forwardRef } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Quyk redesign primitives (Figma "Quyk Redesign User").
 * Palette lives in globals.css as --q-* tokens and `q-*` Tailwind colours.
 */

/** Q logo tile: dark tile + lime mark on light screens, lime tile + dark mark on dark screens. */
export function QuykMarkTile({
  tone = 'light',
  className,
}: {
  tone?: 'light' | 'dark';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]',
        tone === 'light' ? 'bg-q-green text-q-lime' : 'bg-q-lime text-q-green',
        className,
      )}
      aria-hidden
    >
      <span className="quyk-mark h-6 w-6" />
    </span>
  );
}

/** Lime "Quyk" wordmark used on the venue QR poster. */
export function QuykWordmark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny static brand asset
    <img src="/brand/quyk-logo.png" alt="Quyk" width={96} height={35} className={className} />
  );
}

type PillTone = 'lime' | 'tint' | 'panel' | 'outline';

export function QuykPill({
  tone = 'lime',
  className,
  children,
}: {
  tone?: PillTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold leading-none',
        tone === 'lime' && 'bg-q-lime text-q-green',
        tone === 'tint' && 'bg-q-lime-tint text-q-green',
        tone === 'panel' && 'bg-q-green-panel text-q-lime',
        tone === 'outline' && 'border border-q-line bg-white text-q-green',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function QuykCard({
  className,
  children,
  as: Tag = 'div',
}: {
  className?: string;
  children: React.ReactNode;
  as?: 'div' | 'section';
}) {
  return (
    <Tag className={cn('rounded-[22px] border border-q-line bg-white', className)}>
      {children}
    </Tag>
  );
}

/** Deep-green feature panel (estimated wait, booking summary, waiting line). */
export function QuykPanel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-[26px] bg-q-green px-5 py-5 text-white', className)}>{children}</div>
  );
}

type ButtonVariant = 'primary' | 'lime' | 'outline';

const buttonClass = (variant: ButtonVariant, className?: string) =>
  cn(
    'inline-flex h-14 w-full items-center justify-center gap-2 rounded-full text-[16px] font-semibold transition-[opacity,transform] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-q-green disabled:cursor-not-allowed',
    variant === 'primary' &&
      'bg-q-green text-q-lime hover:opacity-95 disabled:bg-[#e3eadb] disabled:text-q-subtle',
    variant === 'lime' && 'bg-q-lime text-q-green hover:opacity-95 disabled:opacity-60',
    variant === 'outline' &&
      'border-[1.5px] border-q-green bg-transparent text-q-green hover:bg-white/60 disabled:opacity-60',
    className,
  );

export const QuykButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }
>(function QuykButton({ variant = 'primary', className, type = 'button', ...props }, ref) {
  return <button ref={ref} type={type} className={buttonClass(variant, className)} {...props} />;
});

export function QuykLinkButton({
  href,
  variant = 'primary',
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, className)}>
      {children}
    </Link>
  );
}

/** Lime circle holding a small icon (notices, live-updates card). */
export function QuykIconBubble({
  icon: Icon,
  size = 'md',
  className,
}: {
  icon: LucideIcon;
  size?: 'md' | 'lg';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full text-q-green',
        size === 'md' ? 'h-9 w-9 bg-q-lime' : 'h-11 w-11 bg-q-lime-soft',
        className,
      )}
      aria-hidden
    >
      <Icon className={size === 'md' ? 'h-[18px] w-[18px]' : 'h-5 w-5'} strokeWidth={2} />
    </span>
  );
}

/** Lime-tinted notice with a bell bubble ("How should we notify you?"). */
export function QuykNotice({
  icon,
  title,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex gap-3 rounded-[20px] bg-q-lime-tint px-4 py-4', className)}>
      <QuykIconBubble icon={icon} />
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-q-green">{title}</p>
        <div className="mt-1 text-[13px] leading-snug text-q-muted">{children}</div>
      </div>
    </div>
  );
}

export function QuykFieldLabel({
  icon: Icon,
  htmlFor,
  children,
}: {
  icon?: LucideIcon;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="flex items-center gap-2 text-[14px] font-semibold text-q-ink">
      {Icon ? <Icon className="h-4 w-4 text-q-green" aria-hidden /> : null}
      {children}
    </label>
  );
}

export const QuykInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function QuykInput({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'h-[52px] w-full rounded-[14px] border border-q-field bg-white px-4 text-[16px] text-q-ink outline-none transition-[border-color,box-shadow] placeholder:text-q-subtle focus:border-q-green focus:shadow-[0_0_0_3px_var(--q-lime)]',
          className,
        )}
        {...props}
      />
    );
  },
);

/** Small uppercase eyebrow label ("WELCOME TO", "ESTIMATED WAIT"). */
export function QuykEyebrow({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <p className={cn('text-[11px] font-semibold uppercase tracking-[0.12em]', className)}>{children}</p>
  );
}
