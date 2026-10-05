'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueueLanding, ServiceMode } from '@/lib/api/types';
import { CustomerDetailsForm } from '@/components/customer/join/customer-details-form';
import { JoinQueueCTA } from '@/components/customer/join/join-queue-cta';
import { LiveQueueStatus } from '@/components/customer/join/live-queue-status';
import { ModeJoinFields } from '@/components/customer/join/mode-join-fields';
import { NotificationPreferenceChips } from '@/components/customer/join/notification-preference-chips';
import { OptionalDetails } from '@/components/customer/join/optional-details';
import { PartySizeSelector } from '@/components/customer/join/party-size-selector';
import { QueueClosedState } from '@/components/customer/join/queue-closed-state';
import { QueueJoinHero } from '@/components/customer/join/queue-join-hero';
import { QueueSummary } from '@/components/customer/join/queue-summary';
import { ReturningCustomerCard } from '@/components/customer/join/returning-customer-card';
import { FloatingParticles } from '@/components/customer/primitives';
import { customerApi } from '@/lib/api/customer-api';
import { ApiClientError } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';
import { isRestaurantDemo } from '@/lib/demo/restaurant-content';
import { friendlyJoinError } from '@/lib/errors/friendly-messages';
import { primaryServiceMode } from '@/lib/restaurant/service-modes';
import {
  buildJoinMetadata,
  buildJoinNotes,
  bookingRegistrationSchema,
  driveInJoinSchema,
  takeawayJoinSchema,
  type ModeJoinFormValues,
} from '@/lib/schemas/forms';
import { loadQueueSession, saveQueueSession, clearQueueSession } from '@/lib/storage/session';
import { buildTrackingFromJoin } from '@/lib/tracking/seed-from-join';

type QueueJoinExperienceProps = {
  data: QueueLanding;
  queueId: string;
};

function joinCopy(mode: ServiceMode): { title: string; subtitle: string; cta: string } {
  switch (mode) {
    case 'TAKEAWAY':
      return {
        title: 'Link your order',
        subtitle: 'Enter your receipt details and we\'ll text you when it\'s ready.',
        cta: 'Track my order',
      };
    case 'DRIVE_IN':
      return {
        title: 'Join the drive-in queue',
        subtitle: 'Stay in your vehicle — we\'ll find you when your order is ready.',
        cta: 'Join drive queue',
      };
    default:
      return {
        title: 'Join the queue',
        subtitle: 'Tell us who you\'re with and we\'ll keep you updated.',
        cta: 'Join the queue',
      };
  }
}

export function QueueJoinExperience({ data, queueId }: QueueJoinExperienceProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<ReturnType<typeof loadQueueSession>>(null);
  const isRestaurant = isRestaurantDemo(data.business.name);
  const canJoin = data.live.isOpen && data.queue.isAcceptingEntries;
  const mode = primaryServiceMode(
    data.queue.serviceMode ?? 'DINE_IN',
    data.business.enabledModes,
  );
  const copy = joinCopy(mode);

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
      partySize: mode === 'TAKEAWAY' ? 1 : isRestaurant ? 2 : 1,
      email: '',
      notes: '',
      notificationPreference: 'WHATSAPP',
      orderNumber: '',
      vehicleDescription: '',
      vehicleColor: '',
      vehiclePlate: '',
      driveInNote: '',
    },
    mode: 'onChange',
  });

  const partySize = form.watch('partySize');
  const notificationPreference = form.watch('notificationPreference');
  const notes = form.watch('notes') ?? '';

  const { data: activeTracking } = useQuery({
    queryKey: queryKeys.entryTracking(activeSession?.entryId ?? ''),
    queryFn: () => customerApi.getEntryTracking(activeSession!.entryId),
    enabled: Boolean(activeSession?.entryId),
    staleTime: 5_000,
  });

  useEffect(() => {
    const fresh =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('fresh') === '1';
    if (fresh) {
      clearQueueSession();
      setActiveSession(null);
      return;
    }
    const session = loadQueueSession();
    if (session?.queueId === queueId) {
      setActiveSession(session);
    }
  }, [queueId]);

  const handleSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      const result = await customerApi.joinQueue(queueId, {
        fullName: values.fullName,
        phone: values.phone,
        partySize: values.partySize,
        notes: buildJoinNotes(values),
        metadata: buildJoinMetadata(mode, values),
        notificationPreference: values.notificationPreference,
      });
      saveQueueSession({
        entryId: result.entryId,
        queueId,
        displayCode: result.displayCode,
        joinedAt: new Date().toISOString(),
        trackingToken: result.trackingToken,
      });
      queryClient.setQueryData(
        queryKeys.entryTracking(result.entryId),
        buildTrackingFromJoin(result, data, {
          partySize: values.partySize,
          notes: buildJoinNotes(values),
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
    }
  });

  if (!canJoin) {
    return <QueueClosedState data={data} />;
  }

  if (activeSession) {
    return (
      <div className="relative flex flex-1 flex-col gap-6 animate-fade-in-up">
        <FloatingParticles />
        <header className="border-b border-border/50 pb-3">
          <p className="font-display text-xl font-bold tracking-tight">{data.business.name}</p>
        </header>
        <QueueJoinHero data={data} />
        <LiveQueueStatus
          estimatedWaitMinutes={data.live.estimatedWaitMinutes}
          waitingCount={data.live.waitingCount}
          isOpen={data.live.isOpen}
          serviceMode={mode}
        />
        <ReturningCustomerCard
          displayCode={activeSession.displayCode}
          estimatedWaitMinutes={activeTracking?.estimatedWaitMinutes}
          onContinue={() => router.push(`/track/${activeSession.entryId}`)}
          onJoinAsSomeoneElse={() => {
            clearQueueSession();
            setActiveSession(null);
            router.replace(`/q/${queueId}/join?fresh=1`);
          }}
        />
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col pb-24">
      <FloatingParticles />

      <header className="relative mb-5 flex items-center justify-between border-b border-border/50 pb-3">
        <p className="font-display text-xl font-bold tracking-tight">{data.business.name}</p>
      </header>

      <QueueJoinHero data={data} className="relative mb-4" />

      <LiveQueueStatus
        estimatedWaitMinutes={data.live.estimatedWaitMinutes}
        waitingCount={data.live.waitingCount}
        isOpen={data.live.isOpen}
        serviceMode={mode}
        className="relative mb-6"
      />

      <div className="relative mb-6 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{copy.title}</h1>
        <p className="text-sm text-muted">{copy.subtitle}</p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="relative flex flex-1 flex-col gap-6">
        <ModeJoinFields mode={mode} register={form.register} errors={form.formState.errors} />

        {mode !== 'TAKEAWAY' ? (
          <PartySizeSelector
            value={partySize}
            onChange={(size) => form.setValue('partySize', size, { shouldValidate: true })}
            error={form.formState.errors.partySize?.message}
          />
        ) : null}

        <CustomerDetailsForm mode={mode} register={form.register} errors={form.formState.errors} />

        <NotificationPreferenceChips
          value={notificationPreference}
          onChange={(pref) => form.setValue('notificationPreference', pref, { shouldValidate: true })}
        />

        {mode === 'DINE_IN' ? (
          <OptionalDetails
            register={form.register}
            notes={notes}
            onNotesChange={(value) => form.setValue('notes', value)}
            emailError={form.formState.errors.email?.message}
          />
        ) : null}

        <QueueSummary
          businessName={data.business.name}
          partySize={partySize}
          estimatedWaitMinutes={data.live.estimatedWaitMinutes}
          serviceMode={mode}
        />

        {submitError ? (
          <p className="rounded-2xl bg-danger-light px-4 py-3 text-sm text-danger" role="alert">
            {submitError}
          </p>
        ) : null}

        <JoinQueueCTA
          partySize={partySize}
          estimatedWaitMinutes={data.live.estimatedWaitMinutes}
          isSubmitting={form.formState.isSubmitting}
          label={copy.cta}
        />
      </form>
    </div>
  );
}
