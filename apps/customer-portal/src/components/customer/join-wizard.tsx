'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Check, MessageCircle, Users } from 'lucide-react';
import { GlassCard, StepProgress } from '@/components/customer/primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  buildJoinNotes,
  joinQueueSchema,
  occasionOptions,
  seatingOptions,
  type JoinQueueFormValues,
} from '@/lib/schemas/forms';
import { isRestaurantDemo } from '@/lib/demo/restaurant-content';
import { cn } from '@/lib/utils';

const GUEST_COUNTS = [2, 3, 4, 5, 6, 7, 8] as const;
const STEPS = ['Name', 'Phone', 'Party', 'Alerts', 'Notes'] as const;

type JoinWizardProps = {
  businessName: string;
  onSubmit: (values: JoinQueueFormValues) => Promise<void>;
  submitError: string | null;
};

export function JoinWizard({ businessName, onSubmit, submitError }: JoinWizardProps) {
  const isRestaurant = isRestaurantDemo(businessName);
  const [step, setStep] = useState(0);

  const form = useForm<JoinQueueFormValues>({
    resolver: zodResolver(joinQueueSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      partySize: isRestaurant ? 2 : 1,
      notes: '',
      notificationPreference: 'WHATSAPP',
      whatsappNumber: '',
      occasion: undefined,
      seatingPreference: undefined,
    },
    mode: 'onChange',
  });

  const fieldsPerStep: (keyof JoinQueueFormValues)[][] = [
    ['fullName'],
    ['phone'],
    ['partySize'],
    ['notificationPreference'],
    ['notes', 'occasion', 'seatingPreference'],
  ];

  const validateStep = async () => {
    const fields = fieldsPerStep[step] ?? [];
    return form.trigger(fields.length ? fields : undefined);
  };

  const next = async () => {
    const ok = await validateStep();
    if (!ok) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = form.handleSubmit(
    async (values) => {
      await onSubmit(values);
    },
    (errors) => {
      const stepWithError = fieldsPerStep.findIndex((fields) =>
        fields.some((field) => errors[field]),
      );
      if (stepWithError >= 0) {
        setStep(stepWithError);
      }
    },
  );

  const selectedPartySize = form.watch('partySize');
  const pref = form.watch('notificationPreference');

  return (
    <div className="flex flex-1 flex-col gap-5 animate-fade-in-up">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
          Step {step + 1} of {STEPS.length}
        </p>
        <h2 className="mt-1 text-xl font-bold">{STEPS[step]}</h2>
        <div className="mt-3">
          <StepProgress step={step + 1} total={STEPS.length} />
        </div>
      </div>

      <GlassCard className="flex-1">
        <form onSubmit={handleSubmit} className="space-y-5">
          {step === 0 && (
            <div className="space-y-2 animate-fade-in-up">
              <Label htmlFor="fullName">What&apos;s your name?</Label>
              <Input
                id="fullName"
                autoComplete="name"
                autoFocus
                placeholder="Your full name"
                className="h-14 rounded-2xl text-lg"
                {...form.register('fullName')}
              />
              {form.formState.errors.fullName && (
                <p className="text-sm text-danger" role="alert">
                  {form.formState.errors.fullName.message}
                </p>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-2 animate-fade-in-up">
              <Label htmlFor="phone">Mobile number</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                autoFocus
                placeholder="+1 555 000 0000"
                className="h-14 rounded-2xl text-lg"
                {...form.register('phone')}
              />
              <p className="text-xs text-muted">We&apos;ll text you when your table is ready</p>
              {form.formState.errors.phone && (
                <p className="text-sm text-danger" role="alert">
                  {form.formState.errors.phone.message}
                </p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3 animate-fade-in-up">
              <Label>How many guests?</Label>
              {isRestaurant ? (
                <div className="grid grid-cols-4 gap-2">
                  {GUEST_COUNTS.map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => form.setValue('partySize', count, { shouldValidate: true })}
                      className={cn(
                        'flex h-14 flex-col items-center justify-center rounded-2xl border-2 text-lg font-bold transition-all active:scale-95',
                        selectedPartySize === count
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-surface',
                      )}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              ) : (
                <Input
                  type="number"
                  min={1}
                  max={20}
                  className="h-14 rounded-2xl text-lg"
                  {...form.register('partySize', { valueAsNumber: true })}
                />
              )}
              {form.formState.errors.partySize && (
                <p className="text-sm text-danger" role="alert">
                  {form.formState.errors.partySize.message}
                </p>
              )}
            </div>
          )}

          {step === 3 && (
            <fieldset className="space-y-3 animate-fade-in-up">
              <legend className="text-sm font-medium">How should we notify you?</legend>
              {(['WHATSAPP', 'SMS', 'BOTH'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => form.setValue('notificationPreference', opt)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all active:scale-[0.98]',
                    pref === opt ? 'border-primary bg-primary/5' : 'border-border',
                  )}
                >
                  <MessageCircle className="h-5 w-5 text-primary" aria-hidden />
                  <span className="font-semibold">
                    {opt === 'BOTH' ? 'WhatsApp & SMS' : opt === 'WHATSAPP' ? 'WhatsApp' : 'SMS'}
                  </span>
                  {pref === opt ? <Check className="ml-auto h-5 w-5 text-primary" /> : null}
                </button>
              ))}
            </fieldset>
          )}

          {step === 4 && (
            <div className="space-y-4 animate-fade-in-up">
              {isRestaurant ? (
                <>
                  <div>
                    <Label className="mb-2 block">Occasion (optional)</Label>
                    <div className="flex flex-wrap gap-2">
                      {occasionOptions.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => form.setValue('occasion', opt)}
                          className={cn(
                            'rounded-full border px-3 py-1.5 text-xs font-medium',
                            form.watch('occasion') === opt
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border',
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block">Seating (optional)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {seatingOptions.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => form.setValue('seatingPreference', opt)}
                          className={cn(
                            'rounded-xl border py-2.5 text-sm font-medium',
                            form.watch('seatingPreference') === opt
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border',
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="notes">Special requests (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Allergies, high chair, wheelchair…"
                  className="min-h-[100px] rounded-2xl"
                  {...form.register('notes')}
                />
              </div>
            </div>
          )}

          {submitError ? (
            <p className="rounded-xl bg-danger-light p-3 text-sm text-danger" role="alert">
              {submitError}
            </p>
          ) : null}

          <div className="flex gap-3 pt-2">
            {step > 0 ? (
              <Button type="button" variant="outline" className="h-12 rounded-2xl" onClick={back}>
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Back
              </Button>
            ) : null}
            {step < STEPS.length - 1 ? (
              <Button
                type="button"
                variant="default"
                className="h-12 flex-1 rounded-2xl"
                onClick={() => void next()}
              >
                Continue
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            ) : (
              <Button
                type="submit"
                variant="default"
                className="h-12 flex-1 rounded-2xl"
                disabled={form.formState.isSubmitting}
              >
                <Users className="h-4 w-4" aria-hidden />
                {form.formState.isSubmitting ? 'Joining…' : 'Join Waitlist'}
              </Button>
            )}
          </div>
        </form>
      </GlassCard>
    </div>
  );
}

export { buildJoinNotes };
