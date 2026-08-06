import QRCode from 'react-qr-code';

export function TrackQrSummary({
  trackUrl,
  displayCode,
}: {
  trackUrl: string;
  displayCode: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Scan to track · {displayCode}
      </p>
      <div className="rounded-lg bg-white p-3">
        <QRCode value={trackUrl} size={128} level="M" aria-label={`QR code for token ${displayCode}`} />
      </div>
      <p className="max-w-full truncate text-xs text-slate-500">{trackUrl}</p>
    </div>
  );
}
