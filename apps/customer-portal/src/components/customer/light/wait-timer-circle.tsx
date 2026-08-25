'use client';

/**
 * Circular wait timer matched to design:
 * thick lavender track, rounded purple arc, peach disc, vintage hourglass.
 */
export function WaitTimerCircle({
  progress,
  className,
}: {
  /** 0–1 remaining fraction of estimated wait */
  progress: number;
  className?: string;
}) {
  const size = 280;
  const stroke = 36;
  const cx = size / 2;
  const cy = size / 2;
  /** Stroke is centered on this radius → outer edge = size/2 */
  const trackR = (size - stroke) / 2;
  /** Peach fills flush to the inner edge of the track */
  const peachR = trackR - stroke / 2;
  const circumference = 2 * Math.PI * trackR;
  const clamped = Math.min(1, Math.max(0.08, progress));
  const offset = circumference * (1 - clamped);

  return (
    <div className={className} style={{ width: size, height: size }} aria-hidden>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="mx-auto block"
      >
        {/* Soft lavender track */}
        <circle
          cx={cx}
          cy={cy}
          r={trackR}
          fill="none"
          stroke="#ebe6fa"
          strokeWidth={stroke}
        />
        {/* Thick rounded purple progress arc */}
        <circle
          cx={cx}
          cy={cy}
          r={trackR}
          fill="none"
          stroke="#9b8cff"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        {/* Peach center — flush with track */}
        <circle cx={cx} cy={cy} r={peachR} fill="#fbe6d5" />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <img
          src="/vintage-hourglass.png"
          alt=""
          width={234}
          height={234}
          className="animate-hourglass-flip h-[234px] w-[234px] object-contain drop-shadow-sm"
          draggable={false}
        />
      </div>
    </div>
  );
}
