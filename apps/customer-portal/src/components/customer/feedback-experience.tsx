'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Gift, Heart } from 'lucide-react';
import { StarRating } from '@/components/queue/star-rating';
import { GlassCard } from '@/components/customer/primitives';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { customerApi } from '@/lib/api/customer-api';
import { ApiClientError } from '@/lib/api/client';

const EMOJIS = ['😍', '😊', '😐', '😕', '😞'] as const;
const QUICK_CHIPS = ['Food', 'Service', 'Wait time', 'Cleanliness', 'Staff'] as const;

export function FeedbackExperience({ entryId }: { entryId: string }) {
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
      setError('Tap a star rating to continue');
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
      <div className="flex flex-1 flex-col items-center gap-6 py-8 text-center animate-fade-in-up">
        <div className="text-6xl" aria-hidden>
          {emoji !== null ? EMOJIS[emoji] : '🙏'}
        </div>
        <h1 className="text-2xl font-bold">Grazie!</h1>
        <p className="text-muted">Your feedback helps us create better experiences.</p>
        <GlassCard className="w-full border-dashed border-primary/30 bg-primary/5">
          <Gift className="mx-auto mb-2 h-8 w-8 text-primary" aria-hidden />
          <p className="text-sm font-semibold">10% off your next visit</p>
          <p className="mt-1 text-xs text-muted">Show this screen on your next visit (demo coupon)</p>
        </GlassCard>
        <Button variant="default" className="w-full rounded-2xl" asChild>
          <Link href="/">Done</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 animate-fade-in-up">
      <div className="text-center">
        <Heart className="mx-auto mb-2 h-8 w-8 text-accent" aria-hidden />
        <h1 className="text-2xl font-bold">How was your visit?</h1>
        <p className="mt-1 text-sm text-muted">Takes 30 seconds — we read every response</p>
      </div>

      <GlassCard className="text-center">
        <p className="mb-3 text-sm font-medium text-muted">Quick reaction</p>
        <div className="flex justify-center gap-3">
          {EMOJIS.map((e, i) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                setEmoji(i);
                setRating(Math.max(rating, 5 - i));
              }}
              className={`text-3xl transition-transform active:scale-110 ${
                emoji === i ? 'scale-125' : 'opacity-60 hover:opacity-100'
              }`}
              aria-label={`Rate ${5 - i} out of 5`}
            >
              {e}
            </button>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <p className="mb-3 text-center text-sm font-medium">Star rating</p>
        <StarRating value={rating} onChange={setRating} />
      </GlassCard>

      <GlassCard>
        <p className="mb-3 text-sm font-medium">What stood out?</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => toggleChip(chip)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                chips.includes(chip)
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted'
              }`}
            >
              {chip}
            </button>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <Textarea
          placeholder="Anything else? (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={2000}
          className="min-h-[80px] border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
        />
      </GlassCard>

      {error ? (
        <p className="text-center text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        variant="default"
        size="lg"
        className="h-14 rounded-2xl"
        disabled={submitting}
      >
        {submitting ? 'Sending…' : 'Submit feedback'}
      </Button>
    </form>
  );
}
