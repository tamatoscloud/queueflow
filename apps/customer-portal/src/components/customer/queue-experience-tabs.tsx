'use client';

import { useState } from 'react';
import { Copy, Radio, Share2, Ticket } from 'lucide-react';
import { TrackQrSummary } from '@/components/queue/track-qr-summary';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Tab = 'live' | 'share';

type QueueExperienceTabsProps = {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  live: React.ReactNode;
  trackUrl: string;
  displayCode: string;
};

export function QueueExperienceTabs({
  activeTab,
  onTabChange,
  live,
  trackUrl,
  displayCode,
}: QueueExperienceTabsProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareData = {
      title: 'My waitlist pass',
      text: `Token ${displayCode} — track my wait`,
      url: trackUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        /* cancelled */
      }
    }
    await navigator.clipboard.writeText(trackUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div
        className="grid grid-cols-2 gap-1 rounded-2xl bg-muted/40 p-1"
        role="tablist"
        aria-label="Queue experience"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'live'}
          className={cn(
            'flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
            activeTab === 'live'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted hover:text-foreground',
          )}
          onClick={() => onTabChange('live')}
        >
          <Radio className="h-4 w-4" aria-hidden />
          Live
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'share'}
          className={cn(
            'flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
            activeTab === 'share'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted hover:text-foreground',
          )}
          onClick={() => onTabChange('share')}
        >
          <Ticket className="h-4 w-4" aria-hidden />
          Share pass
        </button>
      </div>

      {activeTab === 'live' ? (
        <div role="tabpanel">{live}</div>
      ) : (
        <div role="tabpanel" className="flex flex-col gap-4 animate-fade-in-up">
          <p className="text-center text-sm text-muted">
            Send this link to someone joining you, or save it to reopen your pass later.
          </p>
          <TrackQrSummary trackUrl={trackUrl} displayCode={displayCode} />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-12 rounded-2xl" onClick={() => void handleShare()}>
              <Share2 className="h-4 w-4" aria-hidden />
              Share
            </Button>
            <Button
              variant="outline"
              className="h-12 rounded-2xl"
              onClick={() =>
                void navigator.clipboard.writeText(trackUrl).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                })
              }
            >
              <Copy className="h-4 w-4" aria-hidden />
              {copied ? 'Copied!' : 'Copy link'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
