'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Bell, Hash, Lock, Mail, User } from 'lucide-react';
import type { QueueLanding, ServiceMode } from '@/lib/api/types';
import { customerApi } from '@/lib/api/customer-api';
import { ApiClientError } from '@/lib/api/client';
import { friendlyJoinError } from '@/lib/errors/friendly-messages';
import { primaryServiceMode } from '@/lib/restaurant/service-modes';
import {
  formatWaitMinutes,
  getServiceModeCopy,
} from '@/lib/restaurant/service-mode-config';
import {
  buildJoinMetadata,
  buildJoinNotes,
  bookingRegistrationSchema,
  driveInJoinSchema,
  takeawayJoinSchema,
  type ModeJoinFormValues,
} from '@/lib/schemas/forms';
import { loadQueueSession, saveQueueSession } from '@/lib/storage/session';
import { clampEstimatedWaitMinutes } from '@/lib/waiting/wait-estimate';
import { buildTrackingFromJoin } from '@/lib/tracking/seed-from-join';
import { queryKeys } from '@/lib/api/query-keys';
import { useQueryClient } from '@tanstack/react-query';
import { CalmReturningCustomer } from '@/components/customer/calm/calm-returning-customer';
import { CalmButton, CalmCard } from '@/components/customer/calm/primitives';
import {
  LightField,
  LightInput,
  LightPartySelect,
} from '@/components/customer/light/light-fields';
import { cn } from '@/lib/utils';

type BookingRegistrationProps = {
  data: QueueLanding;
  queueId: string;
};

const NOTIFICATION_OPTIONS = [
  { value: 'WHATSAPP' as const, label: 'WhatsApp' },
  { value: 'SMS' as const, label: 'Text message' },
  { value: 'BOTH' as const, label: 'Both' },
];

function headingCopy(mode: ServiceMode): { title: string; subtitle: string } {
  switch (mode) {
    case 'TAKEAWAY':
      return {
        title: "What's your order number?",
        subtitle: 'Just a few details to track your pickup.',
      };
    case 'DRIVE_IN':
      return {
        title: 'Tell us about your car',
        subtitle: 'Stay in your vehicle — we will come to you.',
      };
    default:
      return {
        title: 'Join the queue',
        subtitle: 'Name and phone — we’ll give you a number and live updates.',
      };
  }
}

function modeLabel(mode: ServiceMode): string {
  switch (mode) {
    case 'TAKEAWAY':
      return 'Takeaway';
    case 'DRIVE_IN':
      return 'Drive-in';
    default:
      return 'Dine-in';
  }
}

function summaryContext(mode: ServiceMode, values: ModeJoinFormValues): string {
  switch (mode) {
    case 'TAKEAWAY':
      return `Order #${values.orderNumber}`;
    case 'DRIVE_IN':
      return values.vehicleDescription || 'Your vehicle';
    default:
      return `Party of ${values.partySize}`;
  }
}

export function BookingRegistration({ data, queueId }: BookingRegistrationProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<ReturnType<typeof loadQueueSession>>(null);
  const [showSummary, setShowSummary] = useState(false);
  const canJoin = data.live.isOpen && data.queue.isAcceptingEntries;
  const mode = primaryServiceMode(
    data.queue.serviceMode ?? 'DINE_IN',
    data.business.enabledModes,
  );
  const copy = getServiceModeCopy(mode);
  const headings = headingCopy(mode);
  const waOn = data.notificationChannels?.whatsapp === true;
  const smsOn = data.notificationChannels?.sms === true;
  const notifyOptions = NOTIFICATION_OPTIONS.filter((opt) => {
    if (opt.value === 'WHATSAPP') return waOn;
    if (opt.value === 'SMS') return smsOn;
    return waOn && smsOn;
  });
  const defaultPreference = waOn ? 'WHATSAPP' : smsOn ? 'SMS' : 'WHATSAPP';

  const schema = useMemo(() => {
    switch (mode) {
      case 'TAKEAWAY':
        return takeawayJoinSchema;
      case 'DRIVE_IN':
        return driveInJoinSchema;
      default:
        return bookingRegistrationSchema;
    }
  }, [mode]);

  const form = useForm<ModeJoinFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      phone: '',
      partySize: mode === 'TAKEAWAY' ? 1 : 2,
      email: '',
      notes: '',
      notificationPreference: defaultPreference,
      orderNumber: '',
      vehicleDescription: '',
      vehicleColor: '',
      vehiclePlate: '',
      driveInNote: '',
    },
    mode: 'onChange',
  });

  const values = form.watch();

  useEffect(() => {
    const session = loadQueueSession();
    if (session?.queueId === queueId) {
      setActiveSession(session);
    }
  }, [queueId]);

  const canShowSummary = useMemo(() => {
    if (!values.fullName?.trim() || !values.phone?.trim()) return false;
    if (mode === 'TAKEAWAY' && !values.orderNumber?.trim()) return false;
    if (mode === 'DRIVE_IN' && !values.vehicleDescription?.trim()) return false;
    return true;
  }, [mode, values]);

  const handleSubmit = form.handleSubmit(async (formValues) => {
    if (!showSummary) {
      setShowSummary(true);
      return;
    }

    setSubmitError(null);
    try {
      const result = await customerApi.joinQueue(queueId, {
        fullName: formValues.fullName,
        phone: formValues.phone,
        partySize: formValues.partySize,
        notes: buildJoinNotes(formValues),
        metadata: buildJoinMetadata(mode, formValues),
        notificationPreference: formValues.notificationPreference,
      });
      const waitMinutes = clampEstimatedWaitMinutes(
        result.estimate.estimatedWaitMinutes,
      );
      saveQueueSession({
        entryId: result.entryId,
        queueId,
        displayCode: result.displayCode,
        joinedAt: new Date().toISOString(),
        waitEstimateMinutes: waitMinutes,
        waitDeadlineAt: Date.now() + Math.round(waitMinutes * 60_000),
        trackingToken: result.trackingToken,
        fullName: formValues.fullName,
        phone: formValues.phone,
      });
      queryClient.setQueryData(
        queryKeys.entryTracking(result.entryId),
        buildTrackingFromJoin(result, data, {
          partySize: formValues.partySize,
          notes: buildJoinNotes(formValues),
        }),
      );
      router.push(`/track/${result.entryId}?welcome=1`);
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 'DUPLICATE_ACTIVE_JOIN') {
        const details = err.details as { entryId?: string } | undefined;
        const entryId = details?.entryId ?? loadQueueSession()?.entryId;
        if (entryId) {
          router.push(`/track/${entryId}`);
          return;
        }
      }
      setSubmitError(friendlyJoinError(err));
      setShowSummary(false);
    }
  });

  if (!canJoin) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
        <h1 className="font-display text-2xl font-bold">We&apos;re not taking guests right now</h1>
        <p className="text-sm text-[#6b6870]">
          {data.business.name} isn&apos;t accepting new guests right now. Please check back soon.
        </p>
      </div>
    );
  }

  if (activeSession) {
    return (
      <CalmReturningCustomer
        session={activeSession}
        businessName={data.business.name}
        displayCode={activeSession.displayCode}
        queueId={queueId}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 pb-4">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold leading-tight text-[var(--foreground)]">
          {headings.title.replace('!', '')}
          {headings.title.includes('!') ? <span className="text-[var(--primary)]">!</span> : null}
        </h1>
        <p className="mt-2 text-sm text-[#6b6870]">{headings.subtitle}</p>
      </div>

      {showSummary && canShowSummary ? (
        <CalmCard highlighted className="text-center">
          <p className="font-display text-lg font-bold text-[var(--foreground)]">{data.business.name}</p>
          <p className="mt-1 text-sm text-[#6b6870]">{modeLabel(mode)}</p>
          <p className="mt-3 text-base font-semibold text-[var(--foreground)]">
            {summaryContext(mode, values)}
          </p>
          <p className="mt-4 text-sm text-[#6b6870]">Estimated wait</p>
          <p className="font-display text-2xl font-bold text-[var(--primary)]">
            {formatWaitMinutes(data.live.estimatedWaitMinutes, copy)}
          </p>
        </CalmCard>
      ) : null}

      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-1 flex-col gap-5">
        {mode === 'DINE_IN' ? (
          <LightPartySelect
            value={form.watch('partySize')}
            onChange={(n) => form.setValue('partySize', n, { shouldValidate: true })}
            error={form.formState.errors.partySize?.message}
          />
        ) : null}

        {mode === 'TAKEAWAY' ? (
          <LightField
            label="What's your order number?"
            icon={Hash}
            error={form.formState.errors.orderNumber?.message}
          >
            <LightInput
              id="orderNumber"
              placeholder="e.g. 4821"
              inputMode="numeric"
              {...form.register('orderNumber')}
            />
          </LightField>
        ) : null}

        {mode === 'DRIVE_IN' ? (
          <>
            <LightField
              label="Vehicle"
              icon={User}
              error={form.formState.errors.vehicleDescription?.message}
            >
              <LightInput
                id="vehicleDescription"
                placeholder="e.g. Black Toyota"
                {...form.register('vehicleDescription')}
              />
            </LightField>
            <LightField label="License plate (optional)" icon={Hash}>
              <LightInput
                id="vehiclePlate"
                placeholder="e.g. ABC-123"
                {...form.register('vehiclePlate')}
              />
            </LightField>
          </>
        ) : null}

        <LightField label="Your name" icon={User} error={form.formState.errors.fullName?.message}>
          <LightInput
            id="fullName"
            placeholder="E.g. John Smith"
            autoComplete="name"
            {...form.register('fullName')}
          />
        </LightField>

        <LightField label="Phone number" icon={Hash} error={form.formState.errors.phone?.message}>
          <LightInput
            id="phone"
            type="tel"
            placeholder="0332-0332002"
            autoComplete="tel"
            {...form.register('phone')}
          />
        </LightField>

        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--foreground)]">How should we notify you?</p>
          {notifyOptions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {notifyOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    form.setValue('notificationPreference', opt.value, { shouldValidate: true })
                  }
                  className={cn(
                    'rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                    values.notificationPreference === opt.value
                      ? 'border-[var(--primary)] bg-[#f5f3ff] text-[var(--primary)]'
                      : 'border-[#e8e3e8] bg-white text-[#6b6870]',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[13px] leading-snug text-[#6b6870]">
              We&apos;ll update you on this page. Turn on browser alerts after you join — WhatsApp
              and SMS are not connected yet.
            </p>
          )}
        </div>

        <LightField label="Email (optional)" icon={Mail} error={form.formState.errors.email?.message}>
          <LightInput
            id="email"
            type="email"
            placeholder="johnsmith@hotmail.com"
            autoComplete="email"
            {...form.register('email')}
          />
        </LightField>

        {submitError ? (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600" role="alert">
            {submitError}
          </p>
        ) : null}

        <CalmButton type="submit" disabled={form.formState.isSubmitting || !canShowSummary}>
          <Bell className="h-4 w-4" aria-hidden />
          {form.formState.isSubmitting
            ? 'Joining…'
            : showSummary
              ? 'Join the queue'
              : 'Continue'}
        </CalmButton>

        {showSummary ? (
          <button
            type="button"
            onClick={() => setShowSummary(false)}
            className="text-center text-sm font-medium text-[var(--primary)]"
          >
            Edit details
          </button>
        ) : null}

        <p className="flex items-center justify-center gap-1.5 text-xs text-[#6b6870]">
          <Lock className="h-3 w-3" aria-hidden />
          We&apos;ll never share your details.
        </p>
      </form>
    </div>
  );
}
