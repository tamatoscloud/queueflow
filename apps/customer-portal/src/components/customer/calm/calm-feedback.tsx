'use client';

import Link from 'next/link';
import { useState } from 'react';
import { customerApi } from '@/lib/api/customer-api';
import { ApiClientError } from '@/lib/api/client';
import { CalmButton, CalmCard, CalmHeading } from '@/components/customer/calm/primitives';
import { cn } from '@/lib/utils';

const EMOJIS = ['😍', '😊', '😐', '😕', '😞'] as const;
const QUICK_CHIPS = ['Food', 'Service', 'Wait time', 'Cleanliness', 'Atmosphere'] as const;

export function CalmFeedback({ entryId }: { entryId: string }) {
  const [rating, setRating] = useState(0);
  const [emoji, setEmoji] = useState<number | null>(null);
  const [chips, setChips] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const toggleChip = (chip: string) => {
    setChips((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1) {
      setError('Choose a reaction to continue');
      return;
    }
    setSubmitting(true);
    setError(null);
    const chipNote = chips.length ? `Highlights: ${chips.join(', ')}` : '';
    const fullComment = [chipNote, comment.trim()].filter(Boolean).join('\n') || undefined;
    try {
      await customerApi.submitFeedback({
        queueEntryId: entryId,
        rating,
        comment: fullComment,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not send feedback — try again');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-1 flex-col items-center gap-6 py-8 text-center">
        <span className="text-6xl" aria-hidden>
          {emoji !== null ? EMOJIS[emoji] : '🙏'}
        </span>
        <CalmHeading>Thank you!</CalmHeading>
        <p className="text-sm text-[#6b6870]">Your feedback helps us create better experiences.</p>
        <Link
          href="/"
          className="flex h-14 w-full items-center justify-center rounded-full bg-[var(--primary)] text-base font-semibold text-[var(--on-primary)] shadow-sm"
        >
          Done
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5">
      <div className="text-center">
        <CalmHeading>How was your visit?</CalmHeading>
        <p className="mt-2 text-sm text-[#6b6870]">Takes about 20 seconds</p>
      </div>

      <CalmCard className="text-center">
        <div className="flex justify-center gap-3">
          {EMOJIS.map((e, i) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                setEmoji(i);
                setRating(Math.max(rating, 5 - i));
              }}
              className={cn(
                'text-3xl transition-transform active:scale-110',
                emoji === i ? 'scale-125' : 'opacity-60 hover:opacity-100',
              )}
              aria-label={`Rate ${5 - i} out of 5`}
            >
              {e}
            </button>
          ))}
        </div>
      </CalmCard>

      <CalmCard>
        <p className="mb-3 text-sm font-medium text-[#17151a]">What stood out?</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => toggleChip(chip)}
              className={cn(
                'rounded-full border px-3 py-2 text-xs font-semibold transition-all',
                chips.includes(chip)
                  ? 'border-[#8b7cf8] bg-[#f5f3ff] text-[#8b7cf8]'
                  : 'border-[#e8e3e8] text-[#6b6870]',
              )}
            >
              {chip}
            </button>
          ))}
        </div>
      </CalmCard>

      <CalmCard>
        <textarea
          placeholder="Anything else? (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={2000}
          className="min-h-[80px] w-full resize-none border-0 bg-transparent text-sm text-[#17151a] outline-none placeholder:text-[#6b6870]"
        />
      </CalmCard>

      {error ? (
        <p className="text-center text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <CalmButton type="submit" disabled={submitting}>
        {submitting ? 'Sending…' : 'Send feedback'}
      </CalmButton>
    </form>
  );
}
