'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Bell, Car, Hash, Lock, Mail, Phone, User } from 'lucide-react';
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
import {
  LightField,
  LightInput,
  LightPartySelect,
} from '@/components/customer/light/light-fields';
import { QuykButton, QuykCard, QuykNotice, QuykPanel, QuykPill } from '@/components/quyk/ui';
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

function summaryFacts(
  mode: ServiceMode,
  values: ModeJoinFormValues,
): { label: string; value: string } {
  switch (mode) {
    case 'TAKEAWAY':
      return { label: 'Order', value: `#${values.orderNumber}` };
    case 'DRIVE_IN':
      return { label: 'Vehicle', value: values.vehicleDescription || 'Your vehicle' };
    default:
      return {
        label: 'Party',
        value: `${values.partySize} ${values.partySize === 1 ? 'person' : 'people'}`,
      };
  }
}

function NotifyChoice({
  options,
  value,
  onChange,
}: {
  options: { value: 'WHATSAPP' | 'SMS' | 'BOTH'; label: string }[];
  value: string;
  onChange: (v: 'WHATSAPP' | 'SMS' | 'BOTH') => void;
}) {
  if (options.length === 0) {
    return (
      <QuykNotice icon={Bell} title="How should we notify you?">
        We&apos;ll update you on this page. Turn on browser alerts after you join — WhatsApp and
        SMS are not connected yet.
      </QuykNotice>
    );
  }
  return (
    <QuykNotice icon={Bell} title="How should we notify you?">
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={value === opt.value}
            className={cn(
              'rounded-full px-4 py-2 text-[13px] font-semibold transition-colors',
              value === opt.value
                ? 'bg-q-green text-q-lime'
                : 'border border-q-field bg-white text-q-green',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </QuykNotice>
  );
}

function PrivacyLine() {
  return (
    <p className="flex items-center justify-center gap-1.5 text-[12px] text-q-subtle">
      <Lock className="h-3 w-3" aria-hidden />
      We&apos;ll never share your details.
    </p>
  );
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
        <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-q-green">We&apos;re not taking guests right now</h1>
        <p className="text-[14px] text-q-muted">
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

  const notifyChoice = (
    <NotifyChoice
      options={notifyOptions}
      value={values.notificationPreference}
      onChange={(v) => form.setValue('notificationPreference', v, { shouldValidate: true })}
    />
  );

  const errorBox = submitError ? (
    <p className="rounded-[16px] bg-danger-light px-4 py-3 text-[14px] text-[#9a3412]" role="alert">
      {submitError}
    </p>
  ) : null;

  // Figma screen 5: review before joining.
  if (showSummary && canShowSummary) {
    const facts = summaryFacts(mode, values);
    const rows = [
      { label: 'Name', value: values.fullName },
      { label: 'Mobile', value: values.phone },
      ...(values.email?.trim() ? [{ label: 'Email', value: values.email.trim() }] : []),
    ];
    return (
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-1 flex-col gap-4 pb-4">
        <div>
          <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.03em] text-q-green">
            Check your details
          </h1>
          <p className="mt-1.5 text-[14px] leading-snug text-q-muted">
            Make sure your number is right — this is how we find you.
          </p>
        </div>

        <QuykPanel>
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-[20px] font-semibold text-white">{data.business.name}</p>
            <QuykPill tone="lime">{modeLabel(mode)}</QuykPill>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/15 pt-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/80">
                {facts.label}
              </p>
              <p className="mt-1 text-[17px] font-semibold text-white">{facts.value}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/80">
                Estimated wait
              </p>
              <p className="mt-1 text-[17px] font-semibold text-q-lime">
                {formatWaitMinutes(data.live.estimatedWaitMinutes, copy)}
              </p>
            </div>
          </div>
        </QuykPanel>

        <QuykCard className="px-4">
          <dl className="divide-y divide-q-line">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-4 py-3.5">
                <dt className="text-[14px] text-q-muted">{row.label}</dt>
                <dd className="truncate text-[15px] font-semibold text-q-ink">{row.value}</dd>
              </div>
            ))}
          </dl>
        </QuykCard>

        {notifyChoice}
        {errorBox}

        <QuykButton type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Joining…' : 'Join the queue'}
        </QuykButton>
        <QuykButton
          variant="outline"
          disabled={form.formState.isSubmitting}
          onClick={() => setShowSummary(false)}
        >
          Edit details
        </QuykButton>
        <PrivacyLine />
      </form>
    );
  }

  // Figma screens 3–4: details form.
  return (
    <div className="flex flex-1 flex-col gap-5 pb-4">
      <div>
        <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.03em] text-q-green">
          {headings.title}
        </h1>
        <p className="mt-1.5 text-[14px] leading-snug text-q-muted">{headings.subtitle}</p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-1 flex-col gap-4">
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
            htmlFor="orderNumber"
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
              icon={Car}
              htmlFor="vehicleDescription"
              error={form.formState.errors.vehicleDescription?.message}
            >
              <LightInput
                id="vehicleDescription"
                placeholder="e.g. Black Toyota"
                {...form.register('vehicleDescription')}
              />
            </LightField>
            <LightField label="License plate (optional)" icon={Hash} htmlFor="vehiclePlate">
              <LightInput
                id="vehiclePlate"
                placeholder="e.g. ABC-123"
                {...form.register('vehiclePlate')}
              />
            </LightField>
          </>
        ) : null}

        <LightField
          label="Your name"
          icon={User}
          htmlFor="fullName"
          error={form.formState.errors.fullName?.message}
        >
          <LightInput
            id="fullName"
            placeholder="E.g. John Smith"
            autoComplete="name"
            {...form.register('fullName')}
          />
        </LightField>

        <LightField
          label="Phone number"
          icon={Phone}
          htmlFor="phone"
          error={form.formState.errors.phone?.message}
        >
          <LightInput
            id="phone"
            type="tel"
            placeholder="0332-0332002"
            autoComplete="tel"
            {...form.register('phone')}
          />
        </LightField>

        {notifyChoice}

        <LightField
          label="Email (optional)"
          icon={Mail}
          htmlFor="email"
          error={form.formState.errors.email?.message}
        >
          <LightInput
            id="email"
            type="email"
            placeholder="johnsmith@hotmail.com"
            autoComplete="email"
            {...form.register('email')}
          />
        </LightField>

        {errorBox}

        <QuykButton type="submit" disabled={form.formState.isSubmitting || !canShowSummary}>
          Continue
        </QuykButton>
        <PrivacyLine />
      </form>
    </div>
  );
}
