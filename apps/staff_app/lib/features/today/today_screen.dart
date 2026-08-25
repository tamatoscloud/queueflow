import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_network/queueflow_network.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';
import 'package:queueflow_widgets/queueflow_widgets.dart';

import '../../core/connectivity/connectivity_provider.dart';
import '../../core/models/queue_entry_model.dart';
import '../../core/models/queue_model.dart';
import '../../core/models/queue_snapshot_model.dart';
import '../../core/network/api_error_message.dart' show apiExceptionMessage;
import '../../core/network/business_api_client.dart';
import '../../core/providers/branches_provider.dart';
import '../../core/realtime/realtime_client.dart';
import '../../core/realtime/realtime_sync.dart';
import '../../core/routing/staff_routes.dart';
import '../../core/session/session_providers.dart';
import '../../features/auth/presentation/auth_controller.dart';
import '../../features/queue_console/presentation/queue_console_screen.dart';
import '../../features/settings/break_mode_provider.dart';
import '../../shared/widgets/calm/calm_card.dart';
import '../../shared/widgets/calm/calm_live_indicator.dart';
import '../../shared/widgets/calm/calm_primary_button.dart';
import '../../shared/widgets/staff/call_next_sheet.dart';
import '../../shared/widgets/staff/live_queue_home_widgets.dart';
import '../../shared/widgets/staff/service_mode_helpers.dart';
import '../../shared/widgets/staff/staff_content_width.dart';
import '../../shared/widgets/staff/staff_empty_states.dart';
import '../../shared/widgets/staff/staff_greeting.dart';

final todayQueuesProvider = FutureProvider.autoDispose((ref) async {
  final auth = ref.watch(authControllerProvider);
  if (!auth.isAuthenticated) return <QueueModel>[];
  final api = ref.watch(businessApiClientProvider);
  final user = auth.session?.user;
  final branchId = ref.watch(selectedBranchIdProvider);
  try {
    // Keep this path fast. Never await N queue snapshots here — realtime /
    // polling invalidate this provider and a slow enrich loop caused an
    // endless "Loading today's queue…" spinner after login.
    return await api
        .getQueues(
          branchId: branchId,
          businessId: user?.businessId,
        )
        .timeout(const Duration(seconds: 18));
  } on UnauthorizedException {
    await ref.read(authControllerProvider.notifier).sessionExpired();
    rethrow;
  }
});

final todayQueueSnapshotProvider = FutureProvider.autoDispose
    .family<QueueSnapshotModel, String>((ref, queueId) async {
      return ref
          .read(businessApiClientProvider)
          .getQueueSnapshot(queueId)
          .timeout(const Duration(seconds: 18));
    });

final todayRealtimeProvider = Provider.autoDispose.family<void, String?>((
  ref,
  preferredQueueId,
) {
  final user = ref.watch(currentUserProvider);
  final businessId = user?.businessId;
  if (businessId == null) return;
  final client = ref.watch(realtimeClientProvider);
  var disposed = false;
  var refreshScheduled = false;
  ref.onDispose(() => disposed = true);
  void scheduleRefresh() {
    // Coalesce bursty socket/poll invalidations so Live Queue doesn't
    // restart loading mid-request.
    if (refreshScheduled || disposed) return;
    refreshScheduled = true;
    Future<void>.delayed(const Duration(milliseconds: 500), () {
      refreshScheduled = false;
      if (disposed) return;
      ref.invalidate(todayQueuesProvider);
      final qid = preferredQueueId;
      if (qid != null && qid.isNotEmpty) {
        ref.invalidate(todayQueueSnapshotProvider(qid));
      }
    });
  }

  bindRealtimeRefresh(
    ref: ref,
    client: client,
    onRefresh: scheduleRefresh,
    pollInterval: const Duration(seconds: 12),
    onSubscribe: () async {
      await client.connect();
      return client.subscribeBusinessQueues(businessId);
    },
  );
});

String? _venueName(WidgetRef ref) {
  final branches = ref.watch(branchesProvider).valueOrNull;
  final selectedId = ref.watch(selectedBranchIdProvider);
  if (branches == null || branches.isEmpty) return null;
  if (selectedId != null) {
    for (final b in branches) {
      if (b.id == selectedId) return b.name;
    }
  }
  return branches.first.name;
}

String _realtimeLabel(RealtimeStatus status) => switch (status) {
  RealtimeStatus.connected => 'Online',
  RealtimeStatus.connecting => 'Connecting…',
  RealtimeStatus.reconnecting => 'Reconnecting…',
  RealtimeStatus.disconnected => 'Refreshing…',
};

String _friendlyCallLabel(ServiceModeInfo modeInfo) => switch (modeInfo.label) {
  'Takeaway' => 'Call next order',
  'Drive-in' => 'Call next car',
  _ => 'Call next guest',
};

/// Calm operational home — who is waiting, who is next, one obvious Call Next.
class TodayScreen extends ConsumerStatefulWidget {
  const TodayScreen({super.key});

  @override
  ConsumerState<TodayScreen> createState() => _TodayScreenState();
}

class _TodayScreenState extends ConsumerState<TodayScreen> {
  String? _selectedQueueId;

  QueueEntryModel? _nextWaiting(QueueSnapshotModel? snapshot) {
    if (snapshot == null) return null;
    final waiting = snapshot.entries
        .where((e) => e.status == 'WAITING')
        .toList();
    if (waiting.isEmpty) return null;
    waiting.sort((a, b) => (a.position ?? 999).compareTo(b.position ?? 999));
    return waiting.first;
  }

  int _waitMinutes(QueueEntryModel entry) {
    final joined = entry.joinedAt;
    if (joined == null) return 0;
    return DateTime.now().difference(joined).inMinutes;
  }

  /// Prefer the live entry estimate; ignore absurd historical averages (e.g. 829).
  double _displayWaitMinutes({
    required QueueEntryModel? entry,
    required int metricsMinutes,
    required int fallbackMinutes,
  }) {
    const maxReasonable = 180.0;
    final fromEntry = entry?.estimatedWaitMinutes ?? 0;
    if (fromEntry > 0 && fromEntry <= maxReasonable) return fromEntry;
    if (metricsMinutes > 0 && metricsMinutes <= maxReasonable) {
      return metricsMinutes.toDouble();
    }
    return fallbackMinutes > 0 ? fallbackMinutes.toDouble() : 0;
  }

  Future<void> _callNext(BuildContext context, QueueModel queue) async {
    setState(() => _selectedQueueId = queue.id);
    final snapshot = await ref.read(
      todayQueueSnapshotProvider(queue.id).future,
    );
    final next = _nextWaiting(snapshot);
    if (!context.mounted) return;
    await showCallNextSheet(
      context: context,
      ref: ref,
      queueId: queue.id,
      serviceMode: queue.serviceMode,
      nextEntry: next,
      calling: next != null,
      onRefresh: () async {
        ref.invalidate(todayQueuesProvider);
        ref.invalidate(todayQueueSnapshotProvider(queue.id));
      },
    );
  }

  bool _isSessionError(Object error) {
    if (error is ApiException) {
      return error.maybeWhen(unauthorized: () => true, orElse: () => false);
    }
    return false;
  }

  Widget _queueLoadError(Object error, VoidCallback onRetry) {
    if (_isSessionError(error)) {
      return StaffSessionExpiredState(
        onSignIn: () => context.go(StaffRoutes.login),
      );
    }
    return StaffLoadErrorState(
      message: apiExceptionMessage(error),
      onRetry: onRetry,
    );
  }

  void _invalidateSnapshots(List<QueueModel> queues) {
    ref.invalidate(todayQueuesProvider);
    for (final q in queues) {
      ref.invalidate(todayQueueSnapshotProvider(q.id));
    }
  }

  @override
  Widget build(BuildContext context) {
    final onBreak = ref.watch(breakModeProvider);
    final user = ref.watch(currentUserProvider);
    final online = ref.watch(connectivityProvider);
    final queuesAsync = ref.watch(todayQueuesProvider);
    // Defer socket/poll until the first queues response so REST isn't starved.
    if (queuesAsync.hasValue || queuesAsync.hasError) {
      final preferredId =
          queuesAsync.asData?.value.isNotEmpty == true
              ? (selectCallNextQueue(
                    queuesAsync.asData!.value,
                    preferredQueueId: _selectedQueueId,
                  )?.id ??
                  queuesAsync.asData!.value.first.id)
              : _selectedQueueId;
      ref.watch(todayRealtimeProvider(preferredId));
    }
    final realtimeStatus = ref.watch(realtimeStatusProvider);
    final venueName = _venueName(ref);
    final contentMax = StaffContentWidth.maxWidth(context);

    if (onBreak) {
      return const _BreakModeView();
    }

    // Treat connectivity "loading" as online so Live Queue never gates forever
    // on web when connectivity_plus has not emitted an initial event yet.
    final isOnline = online.valueOrNull ?? true;
    if (!isOnline) {
      return StaffOfflineState(
        showCachedHint: queuesAsync.hasValue,
        onRetry: () => ref.invalidate(todayQueuesProvider),
      );
    }

    return queuesAsync.when(
      skipLoadingOnReload: true,
      skipLoadingOnRefresh: true,
      loading: () => const PageLoading(message: "Loading today's queue…"),
      error: (e, _) =>
          _queueLoadError(e, () => ref.invalidate(todayQueuesProvider)),
      data: (queues) {
        if (queues.isEmpty) {
          return const StaffQueueClosedState();
        }

        final primary =
            selectCallNextQueue(queues, preferredQueueId: _selectedQueueId) ??
            queues.firstWhere((q) => q.isActive, orElse: () => queues.first);
        final snapshotAsync = ref.watch(todayQueueSnapshotProvider(primary.id));

        if (primary.isPaused) {
          return StaffQueuePausedState(
            onResume: () => queueAction(ref, primary.id, 'resume', () async {
              _invalidateSnapshots(queues);
            }),
          );
        }

        final totalWaiting = queues.fold<int>(0, (s, q) => s + q.waitingCount);
        final modeInfo = ServiceModeInfo.forMode(primary.serviceMode);
        final liveLabel = realtimeStatus.when(
          data: _realtimeLabel,
          loading: () => 'Connecting',
          error: (_, __) => 'Updating',
        );

        return Stack(
          children: [
            RefreshIndicator(
              onRefresh: () async => _invalidateSnapshots(queues),
              child: ListView(
                padding: EdgeInsets.fromLTRB(
                  AppSpacing.md,
                  AppSpacing.md,
                  AppSpacing.md,
                  totalWaiting > 0 ? 180 : AppSpacing.xl,
                ),
                children: [
                  StaffGreetingHeader(
                    name: user?.fullName.split(' ').first ?? 'there',
                    venueName: venueName ?? primary.name,
                    trailing: CalmLiveIndicator(label: liveLabel),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  WaitingCountBanner(
                    count: totalWaiting,
                  ),
                  ..._guestBoard(
                    context: context,
                    snapshotAsync: snapshotAsync,
                    primary: primary,
                    totalWaiting: totalWaiting,
                  ),
                  if (totalWaiting == 0) ...[
                    const SizedBox(height: AppSpacing.xl),
                    StaffQueueEmptyState(
                      onAddCustomer: () =>
                          showWalkIn(context, ref, primary.id, () async {
                            _invalidateSnapshots(queues);
                          }),
                    ),
                  ] else ...[
                    const SizedBox(height: AppSpacing.lg),
                    FriendlyActionTile(
                      icon: Icons.person_add_alt_1_rounded,
                      label: 'Add a walk-in guest',
                      subtitle: 'Someone arrived without scanning the QR',
                      onTap: () =>
                          showWalkIn(context, ref, primary.id, () async {
                            _invalidateSnapshots(queues);
                          }),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    FriendlyActionTile(
                      icon: Icons.list_alt_rounded,
                      label: 'See the full waiting list',
                      subtitle: 'Hold, skip, or move guests',
                      tint: AppColors.infoLight,
                      iconColor: AppColors.info,
                      onTap: () =>
                          context.push(StaffRoutes.queueConsole(primary.id)),
                    ),
                  ],
                  if (queues.length > 1) ...[
                    const SizedBox(height: AppSpacing.xl),
                    Text(
                      'Switch queue',
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w800,
                            color: AppColors.calmCharcoal,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Only needed if you run more than one line.',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppColors.calmWarmGray,
                          ),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    ...queues.map(
                      (q) => Padding(
                        padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                        child: QueuePickerCard(
                          queue: q,
                          selected: q.id == primary.id,
                          onTap: () {
                            setState(() => _selectedQueueId = q.id);
                          },
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            if (totalWaiting > 0)
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: SafeArea(
                  top: false,
                  child: Center(
                    child: ConstrainedBox(
                      constraints: BoxConstraints(maxWidth: contentMax),
                      child: Container(
                        margin: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.md,
                        ),
                        padding: const EdgeInsets.only(
                          top: AppSpacing.sm,
                          bottom: AppSpacing.sm,
                        ),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              AppColors.calmIvory.withValues(alpha: 0),
                              AppColors.calmIvory,
                            ],
                          ),
                        ),
                        child: Container(
                          padding: const EdgeInsets.all(AppSpacing.sm),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: AppColors.calmBorder),
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.calmCharcoal.withValues(
                                  alpha: 0.08,
                                ),
                                blurRadius: 16,
                                offset: const Offset(0, -2),
                              ),
                            ],
                          ),
                          child: CalmPrimaryButton(
                            label: _friendlyCallLabel(modeInfo),
                            icon: Icons.campaign_rounded,
                            onPressed: () => _callNext(context, primary),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }

  List<Widget> _guestBoard({
    required BuildContext context,
    required AsyncValue<QueueSnapshotModel> snapshotAsync,
    required QueueModel primary,
    required int totalWaiting,
  }) {
    if (totalWaiting <= 0) return const [];

    return snapshotAsync.when(
      skipLoadingOnReload: true,
      skipLoadingOnRefresh: true,
      loading: () => [
        const SizedBox(height: AppSpacing.md),
        CalmCard(
          backgroundColor: AppColors.calmLilac.withValues(alpha: 0.35),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: AppSpacing.xl),
            child: Column(
              children: [
                const CircularProgressIndicator(strokeWidth: 2.5),
                const SizedBox(height: AppSpacing.md),
                Text(
                  'Loading the next guest…',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: AppColors.calmCharcoal,
                      ),
                ),
              ],
            ),
          ),
        ),
      ],
      error: (e, _) => [
        const SizedBox(height: AppSpacing.md),
        CalmCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                "We couldn't load the guest list",
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: AppColors.calmCharcoal,
                    ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                'Check your connection, then try again.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppColors.calmWarmGray,
                    ),
              ),
              const SizedBox(height: AppSpacing.md),
              AppButton(
                label: 'Try again',
                icon: Icons.refresh_rounded,
                variant: AppButtonVariant.secondary,
                onPressed: () {
                  ref.invalidate(todayQueueSnapshotProvider(primary.id));
                  ref.invalidate(todayQueuesProvider);
                },
              ),
            ],
          ),
        ),
      ],
      data: (snapshot) {
        final waiting = snapshot.entries
            .where((e) => e.status == 'WAITING')
            .toList()
          ..sort((a, b) => (a.position ?? 999).compareTo(b.position ?? 999));
        final next = waiting.isEmpty ? null : waiting.first;
        final estWait = _displayWaitMinutes(
          entry: next,
          metricsMinutes: snapshot.metrics.averageWaitMinutes,
          fallbackMinutes: primary.averageServiceTimeMinutes,
        );
        final rest = waiting.skip(1).take(5).toList();

        return [
          if (next != null) ...[
            const SizedBox(height: AppSpacing.md),
            WhosNextHeroCard(
              entry: next,
              serviceMode: primary.serviceMode,
              detailLine: _upNextDetail(next, primary.serviceMode),
              estimatedWaitMinutes: estWait > 0 ? estWait : null,
            ),
          ] else ...[
            const SizedBox(height: AppSpacing.md),
            CalmCard(
              child: Text(
                'Guests are waiting in another line. Pick a queue below, or open the full list.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppColors.calmWarmGray,
                      fontWeight: FontWeight.w500,
                    ),
              ),
            ),
          ],
          if (rest.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.lg),
            Text(
              'Still waiting',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: AppColors.calmCharcoal,
                  ),
            ),
            const SizedBox(height: AppSpacing.sm),
            _WaitingGuestGrid(
              entries: rest,
              onTapEntry: (_) =>
                  context.push(StaffRoutes.queueConsole(primary.id)),
            ),
          ],
        ];
      },
    );
  }

  String _upNextDetail(QueueEntryModel entry, String serviceMode) {
    final wait = _waitMinutes(entry);
    final waitText = wait < 1 ? '<1 min wait' : '$wait min wait';
    return switch (serviceMode) {
      'TAKEAWAY' => [
        if (entry.metadata?['orderNumber'] != null)
          'Order #${entry.metadata!['orderNumber']}',
        waitText,
      ].join(' · '),
      'DRIVE_IN' => [
        if (entry.metadata?['vehiclePlate'] != null)
          entry.metadata!['vehiclePlate'] as String,
        if (entry.metadata?['vehicleColor'] != null)
          entry.metadata!['vehicleColor'] as String,
        waitText,
      ].where((s) => s.isNotEmpty).join(' · '),
      _ => 'Party of ${entry.partySize} · $waitText',
    };
  }
}

class _WaitingGuestGrid extends StatelessWidget {
  const _WaitingGuestGrid({
    required this.entries,
    required this.onTapEntry,
  });

  final List<QueueEntryModel> entries;
  final ValueChanged<QueueEntryModel> onTapEntry;

  @override
  Widget build(BuildContext context) {
    final columns = StaffContentWidth.guestGridColumns(context);
    if (columns <= 1) {
      return Column(
        children: [
          for (final entry in entries)
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: OtherWaitingTile(
                entry: entry,
                onTap: () => onTapEntry(entry),
              ),
            ),
        ],
      );
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        const gap = AppSpacing.sm;
        final tileWidth =
            (constraints.maxWidth - gap * (columns - 1)) / columns;
        return Wrap(
          spacing: gap,
          runSpacing: gap,
          children: [
            for (final entry in entries)
              SizedBox(
                width: tileWidth,
                child: OtherWaitingTile(
                  entry: entry,
                  onTap: () => onTapEntry(entry),
                ),
              ),
          ],
        );
      },
    );
  }
}

class _BreakModeView extends ConsumerWidget {
  const _BreakModeView();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.coffee_outlined,
              size: 64,
              color: AppColors.warning,
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              "You're on break",
              style: Theme.of(
                context,
              ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Queue operations are paused for you.',
              textAlign: TextAlign.center,
              style: Theme.of(
                context,
              ).textTheme.bodyLarge?.copyWith(color: AppColors.calmWarmGray),
            ),
            const SizedBox(height: AppSpacing.xl),
            CalmPrimaryButton(
              label: 'End break',
              icon: Icons.play_arrow,
              onPressed: () =>
                  ref.read(breakModeProvider.notifier).state = false,
            ),
          ],
        ),
      ),
    );
  }
}
