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
import '../../shared/widgets/calm/calm_queue_entry_card.dart';
import '../../shared/widgets/calm/calm_section_label.dart';
import '../../shared/widgets/calm/calm_service_mode_row.dart';
import '../../shared/widgets/staff/call_next_sheet.dart';
import '../../shared/widgets/staff/service_mode_helpers.dart';
import '../../shared/widgets/staff/staff_empty_states.dart';
import '../../shared/widgets/staff/staff_greeting.dart';

final todayQueuesProvider = FutureProvider.autoDispose((ref) async {
  final auth = ref.watch(authControllerProvider);
  if (!auth.isAuthenticated) return <QueueModel>[];
  final api = ref.watch(businessApiClientProvider);
  final user = auth.session?.user;
  final branchId = ref.watch(selectedBranchIdProvider);
  try {
    final queues = await api.getQueues(
      branchId: branchId,
      businessId: user?.businessId,
    );
    // Backward-compatible: older API responses omit waitingCount (always 0),
    // which made Live Queue show "You're all clear" despite real waiters.
    final listedWaiting = queues.fold<int>(0, (s, q) => s + q.waitingCount);
    if (listedWaiting > 0 || queues.isEmpty) return queues;

    final snaps = await Future.wait(
      queues.map((q) => api.getQueueSnapshot(q.id)),
    );
    return [
      for (var i = 0; i < queues.length; i++)
        queues[i].copyWith(
          waitingCount: snaps[i].entries
              .where((e) => e.status == 'WAITING')
              .length,
        ),
    ];
  } on UnauthorizedException {
    await ref.read(authControllerProvider.notifier).sessionExpired();
    rethrow;
  }
});

final todayQueueSnapshotProvider = FutureProvider.autoDispose
    .family<QueueSnapshotModel, String>((ref, queueId) async {
      return ref.read(businessApiClientProvider).getQueueSnapshot(queueId);
    });

final todayRealtimeProvider = Provider.autoDispose<void>((ref) {
  final user = ref.watch(currentUserProvider);
  final businessId = user?.businessId;
  if (businessId == null) return;
  final client = ref.watch(realtimeClientProvider);
  bindRealtimeRefresh(
    ref: ref,
    client: client,
    onRefresh: () {
      ref.invalidate(todayQueuesProvider);
    },
    onSubscribe: () async {
      await client.connect();
      return client.subscribeBusinessQueues(businessId);
    },
  );
});

String _aggregateWaitingUnit(List<QueueModel> queues) {
  final modes = queues.map((q) => q.serviceMode).toSet();
  if (modes.length == 1) {
    return ServiceModeInfo.forMode(modes.first).waitingLabel;
  }
  return 'waiting';
}

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
  RealtimeStatus.connected => 'Live',
  RealtimeStatus.connecting => 'Connecting',
  RealtimeStatus.reconnecting => 'Reconnecting',
  RealtimeStatus.disconnected => 'Updating',
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
  int _displayWaitMinutes({
    required QueueEntryModel? entry,
    required int metricsMinutes,
    required int fallbackMinutes,
  }) {
    const maxReasonable = 180;
    final fromEntry = entry?.estimatedWaitMinutes ?? 0;
    if (fromEntry > 0 && fromEntry <= maxReasonable) return fromEntry;
    if (metricsMinutes > 0 && metricsMinutes <= maxReasonable) {
      return metricsMinutes;
    }
    return fallbackMinutes > 0 ? fallbackMinutes : 0;
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
    ref.watch(todayRealtimeProvider);
    final onBreak = ref.watch(breakModeProvider);
    final user = ref.watch(currentUserProvider);
    final online = ref.watch(connectivityProvider);
    final queuesAsync = ref.watch(todayQueuesProvider);
    final realtimeStatus = ref.watch(realtimeStatusProvider);
    final venueName = _venueName(ref);
    final isTablet = Breakpoints.isTablet(context);

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
        final waitingUnit = _aggregateWaitingUnit(queues);
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
                  totalWaiting > 0 ? 200 : AppSpacing.xl,
                ),
                children: [
                  StaffGreetingHeader(
                    name: user?.fullName.split(' ').first ?? 'Staff',
                    venueName: venueName ?? primary.name,
                    trailing: CalmLiveIndicator(label: liveLabel),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  CalmCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const CalmSectionLabel('WAITING NOW'),
                        const SizedBox(height: AppSpacing.sm),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            AnimatedCounter(
                              value: totalWaiting,
                              style: Theme.of(context).textTheme.displayLarge
                                  ?.copyWith(
                                    fontWeight: FontWeight.w800,
                                    color: AppColors.calmCharcoal,
                                    height: 1,
                                    fontSize: 56,
                                  ),
                            ),
                            const SizedBox(width: 10),
                            Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: Text(
                                waitingUnit,
                                style: Theme.of(context).textTheme.titleLarge
                                    ?.copyWith(
                                      color: AppColors.calmWarmGray,
                                      fontWeight: FontWeight.w500,
                                    ),
                              ),
                            ),
                          ],
                        ),
                        // Keep the next guest visible above the sticky CALL NEXT
                        // bar on short web viewports (demo tablets / laptop panes).
                        ...snapshotAsync.maybeWhen(
                          data: (snapshot) {
                            final next = _nextWaiting(snapshot);
                            if (next == null) return const <Widget>[];
                            final code = next.displayCode.isNotEmpty
                                ? next.displayCode
                                : 'Guest';
                            final name = next.customerName ?? 'Guest';
                            return [
                              const SizedBox(height: AppSpacing.md),
                              Text(
                                'Next · $code · $name',
                                style: Theme.of(context).textTheme.titleMedium
                                    ?.copyWith(
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.primaryDark,
                                    ),
                              ),
                            ];
                          },
                          orElse: () => const <Widget>[],
                        ),
                      ],
                    ),
                  ),
                  ..._guestBoard(
                    context: context,
                    snapshotAsync: snapshotAsync,
                    primary: primary,
                    totalWaiting: totalWaiting,
                    modeInfo: modeInfo,
                    queues: queues,
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
                    Row(
                      children: [
                        Expanded(
                          child: AppButton(
                            label: 'Add customer',
                            icon: Icons.person_add_outlined,
                            variant: AppButtonVariant.secondary,
                            fullWidth: true,
                            onPressed: () =>
                                showWalkIn(context, ref, primary.id, () async {
                                  _invalidateSnapshots(queues);
                                }),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: AppButton(
                            label: 'View queue',
                            icon: Icons.list_alt,
                            variant: AppButtonVariant.outline,
                            fullWidth: true,
                            onPressed: () => context.push(
                              StaffRoutes.queueConsole(primary.id),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    const CalmSectionLabel('SERVICE MODES'),
                    const SizedBox(height: AppSpacing.sm),
                    ...calmServiceModeRows(
                      context,
                      queues,
                      onModeTap: (mode) {
                        final target = selectCallNextQueue(
                          queues,
                          preferredServiceMode: mode,
                        );
                        if (target != null) {
                          context.push(StaffRoutes.queueConsole(target.id));
                        }
                      },
                    ),
                    if (queues.length > 1) ...[
                      const SizedBox(height: AppSpacing.md),
                      const CalmSectionLabel('ALL QUEUES'),
                      const SizedBox(height: AppSpacing.sm),
                      ...queues.map(
                        (q) => Padding(
                          padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                          child: CalmCard(
                            onTap: () {
                              setState(() => _selectedQueueId = q.id);
                              context.push(StaffRoutes.queueConsole(q.id));
                            },
                            padding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.md,
                              vertical: AppSpacing.md,
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        q.name,
                                        style: Theme.of(context)
                                            .textTheme
                                            .titleSmall
                                            ?.copyWith(
                                              fontWeight: FontWeight.w600,
                                            ),
                                      ),
                                      Text(
                                        '${ServiceModeInfo.forMode(q.serviceMode).label} · ${q.waitingCount} waiting',
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodySmall
                                            ?.copyWith(
                                              color: AppColors.calmWarmGray,
                                            ),
                                      ),
                                    ],
                                  ),
                                ),
                                const Icon(
                                  Icons.chevron_right,
                                  color: AppColors.calmWarmGray,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ],
                ],
              ),
            ),
            if (totalWaiting > 0)
              Positioned(
                left: isTablet ? 32 : 16,
                right: isTablet ? 32 : 16,
                bottom: 0,
                child: SafeArea(
                  top: false,
                  child: Container(
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
                    child: CalmPrimaryButton(
                      label: modeInfo.callNextActionLabel,
                      icon: Icons.campaign_outlined,
                      onPressed: () => _callNext(context, primary),
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
    required ServiceModeInfo modeInfo,
    required List<QueueModel> queues,
  }) {
    if (totalWaiting <= 0) return const [];

    return snapshotAsync.when(
      loading: () => [
        const SizedBox(height: AppSpacing.md),
        const CalmCard(
          child: Padding(
            padding: EdgeInsets.symmetric(vertical: AppSpacing.lg),
            child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
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
                'Could not load waiting guests',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                apiExceptionMessage(e),
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppColors.calmWarmGray,
                    ),
              ),
              const SizedBox(height: AppSpacing.md),
              AppButton(
                label: 'Retry',
                icon: Icons.refresh,
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
            CalmCard(
              highlighted: true,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const CalmSectionLabel('UP NEXT'),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    next.displayCode.isNotEmpty
                        ? next.displayCode
                        : (next.customerName ?? 'Guest'),
                    style: Theme.of(context).textTheme.displaySmall?.copyWith(
                          fontWeight: FontWeight.w800,
                          color: AppColors.primaryDark,
                          letterSpacing: 1,
                          fontFeatures: const [FontFeature.tabularFigures()],
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    next.customerName ?? 'Guest',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: AppColors.calmCharcoal,
                        ),
                  ),
                  if (next.customerPhone != null &&
                      next.customerPhone!.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      next.customerPhone!,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppColors.calmWarmGray,
                          ),
                    ),
                  ],
                  const SizedBox(height: 6),
                  Text(
                    _upNextDetail(next, primary.serviceMode),
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: AppColors.calmWarmGray,
                        ),
                  ),
                  if (estWait > 0) ...[
                    const SizedBox(height: 4),
                    Text(
                      'Estimated wait · ~$estWait min',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppColors.calmWarmGray,
                          ),
                    ),
                  ],
                ],
              ),
            ),
          ] else ...[
            const SizedBox(height: AppSpacing.md),
            CalmCard(
              child: Text(
                'Waiting count is ${queues.fold<int>(0, (s, q) => s + q.waitingCount)}, '
                'but no WAITING guests were returned for ${primary.name}. '
                'Open another queue below or tap View queue.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppColors.calmWarmGray,
                    ),
              ),
            ),
          ],
          if (rest.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.lg),
            const CalmSectionLabel('WAITING LINE'),
            const SizedBox(height: AppSpacing.sm),
            ...rest.map(
              (entry) => Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                child: CalmQueueEntryCard(
                  entry: entry,
                  serviceMode: primary.serviceMode,
                  compact: true,
                  onTap: () => context.push(StaffRoutes.queueConsole(primary.id)),
                ),
              ),
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
