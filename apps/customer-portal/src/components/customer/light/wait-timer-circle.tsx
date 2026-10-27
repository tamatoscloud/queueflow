'use client';

/**
 * Figma waiting ring: deep-green track, lime progress arc with round caps,
 * cream centre disc holding the tumbling hourglass.
 */
export function WaitTimerCircle({
  progress,
  size = 184,
  className,
}: {
  /** 0–1 remaining fraction of estimated wait */
  progress: number;
  size?: number;
  className?: string;
}) {
  const stroke = Math.round(size * 0.09);
  const cx = size / 2;
  const cy = size / 2;
  const trackR = (size - stroke) / 2;
  const discR = trackR - stroke / 2 - Math.round(size * 0.07);
  const circumference = 2 * Math.PI * trackR;
  const clamped = Math.min(1, Math.max(0.08, progress));
  const offset = circumference * (1 - clamped);
  const glass = Math.round(discR * 1.5);

  return (
    <div className={className} style={{ width: size, height: size, position: 'relative' }} aria-hidden>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
        <circle cx={cx} cy={cy} r={trackR} fill="none" stroke="#1d6b56" strokeWidth={stroke} />
        <circle
          cx={cx}
          cy={cy}
          r={trackR}
          fill="none"
          stroke="var(--q-lime)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <circle cx={cx} cy={cy} r={discR} fill="var(--q-cream)" />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- static decorative asset */}
        <img
          src="/vintage-hourglass.png"
          alt=""
          width={glass}
          height={glass}
          style={{ width: glass, height: glass }}
          className="animate-hourglass-flip object-contain"
          draggable={false}
        />
      </div>
    </div>
  );
}
