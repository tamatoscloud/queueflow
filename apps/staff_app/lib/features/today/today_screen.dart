import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_network/queueflow_network.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_widgets/queueflow_widgets.dart';

import '../../core/cache/cached_fetch.dart';
import '../../core/cache/offline_cache_service.dart';
import '../../core/connectivity/connectivity_provider.dart';
import '../../core/models/queue_entry_model.dart';
import '../../core/models/queue_model.dart';
import '../../core/models/queue_snapshot_model.dart';
import '../../core/network/api_error_message.dart' show apiExceptionMessage;
import '../../core/network/business_api_client.dart';
import '../../core/realtime/realtime_client.dart';
import '../../core/realtime/realtime_sync.dart';
import '../../core/realtime/refresh_gate.dart';
import '../../core/routing/staff_routes.dart';
import '../../core/session/session_providers.dart';
import '../../features/auth/presentation/auth_controller.dart';
import '../../features/queue_console/presentation/queue_console_screen.dart';
import '../../features/settings/break_mode_provider.dart';
import '../../shared/widgets/calm/calm_primary_button.dart';
import '../../shared/widgets/staff/call_next_sheet.dart';
import '../../shared/widgets/staff/service_mode_helpers.dart';
import '../../shared/widgets/staff/staff_empty_states.dart';
import 'live_queue_board.dart';

final todayQueueSnapshotProvider = queueSnapshotProvider;

final todayQueuesProvider = FutureProvider.autoDispose((ref) async {
  final auth = ref.watch(authControllerProvider);
  if (!auth.isAuthenticated) return <QueueModel>[];
  final api = ref.watch(businessApiClientProvider);
  final cache = ref.watch(offlineCacheProvider);
  final user = auth.session?.user;
  final branchId = ref.watch(selectedBranchIdProvider);
  try {
    // Keep this path fast. Never await N queue snapshots here — realtime /
    // polling invalidate this provider and a slow enrich loop caused an
    // endless "Loading today's queue…" spinner after login.
    return await cachedFetchList(
      cache: cache,
      cacheKey: 'today-queues:${branchId ?? 'all'}:${user?.businessId ?? ''}',
      fetch: () => api
          .getQueues(
            branchId: branchId,
            businessId: user?.businessId,
          )
          .timeout(const Duration(seconds: 25)),
      fromJson: QueueModel.fromJson,
      toJson: (q) => q.toJson(),
    );
  } on UnauthorizedException {
    await ref.read(authControllerProvider.notifier).sessionExpired();
    rethrow;
  }
});

final todayRealtimeProvider = Provider.autoDispose.family<void, String?>((
  ref,
  preferredQueueId,
) {
  final user = ref.watch(currentUserProvider);
  final businessId = user?.businessId;
  if (businessId == null) return;
  final client = ref.watch(realtimeClientProvider);
  final followUp = RefreshFollowUp();
  var disposed = false;
  ref.onDispose(() => disposed = true);

  bool inFlight(AsyncValue<dynamic> value) => value.isLoading || value.isRefreshing;

  void scheduleRefresh([RealtimeEnvelope? event]) {
    if (disposed) return;
    final queues = ref.read(todayQueuesProvider);
    final qid = preferredQueueId;
    final snap = qid != null && qid.isNotEmpty
        ? ref.read(todayQueueSnapshotProvider(qid))
        : null;
    final busy = inFlight(queues) || (snap != null && inFlight(snap));
    // Invalidating mid-flight restarts a slow fetch. Queue one follow-up instead.
    if (!followUp.begin(busy: busy)) return;
    if (event?.event != 'EstimatedWaitChanged') {
      ref.invalidate(todayQueuesProvider);
    }
    if (snap != null && qid != null && !inFlight(snap)) {
      ref.invalidate(todayQueueSnapshotProvider(qid));
    }
  }

  void onSettled(AsyncValue<dynamic>? prev, AsyncValue<dynamic> next) {
    if (disposed || prev == null) return;
    if (inFlight(prev) && !inFlight(next) && followUp.take()) {
      scheduleRefresh();
    }
  }

  ref.listen(todayQueuesProvider, onSettled);
  final qid = preferredQueueId;
  if (qid != null && qid.isNotEmpty) {
    ref.listen(todayQueueSnapshotProvider(qid), onSettled);
  }

  bindRealtimeRefresh(
    ref: ref,
    client: client,
    onRefresh: scheduleRefresh,
    pollInterval: const Duration(seconds: 20),
    coalesce: const Duration(milliseconds: 1200),
    refreshOnBind: false,
    onSubscribe: () async {
      await client.connect();
      return client.subscribeBusinessQueues(businessId);
    },
  );
});

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
  bool _callNextInFlight = false;

  QueueEntryModel? _nextWaiting(QueueSnapshotModel? snapshot) {
    if (snapshot == null) return null;
    final waiting = snapshot.entries
        .where((e) => e.status == 'WAITING')
        .toList();
    if (waiting.isEmpty) return null;
    waiting.sort((a, b) => (a.position ?? 999).compareTo(b.position ?? 999));
    return waiting.first;
  }

  QueueEntryModel? _currentCalled(QueueSnapshotModel? snapshot) {
    if (snapshot == null) return null;
    return snapshot.currentCalled;
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
    required num fallbackMinutes,
  }) {
    const maxReasonable = 180.0;
    final fromEntry = entry?.estimatedWaitMinutes ?? 0;
    if (fromEntry > 0 && fromEntry <= maxReasonable) return fromEntry;
    if (metricsMinutes > 0 && metricsMinutes <= maxReasonable) {
      return metricsMinutes.toDouble();
    }
    final fallback = fallbackMinutes.toDouble();
    return fallback > 0 ? fallback : 0;
  }

  Future<void> _openCalledSheet(
    BuildContext context,
    QueueModel queue,
    QueueEntryModel called,
  ) async {
    setState(() => _selectedQueueId = queue.id);
    if (!context.mounted) return;
    await showCallNextSheet(
      context: context,
      ref: ref,
      queueId: queue.id,
      serviceMode: queue.serviceMode,
      nextEntry: called,
      calling: false,
      onRefresh: () async {
        // Snapshot only — avoid wiping Today with a full queue-list reload.
        ref.invalidate(todayQueueSnapshotProvider(queue.id));
      },
    );
  }

  Future<void> _callNext(BuildContext context, QueueModel queue) async {
    if (_callNextInFlight) return;
    setState(() {
      _callNextInFlight = true;
      _selectedQueueId = queue.id;
    });
    try {
      // Prefer cached snapshot — don't block the sheet on a cold network fetch.
      QueueEntryModel? next;
      QueueEntryModel? alreadyCalled;
      final cached = ref.read(todayQueueSnapshotProvider(queue.id));
      if (cached.hasValue) {
        alreadyCalled = _currentCalled(cached.requireValue);
        next = _nextWaiting(cached.requireValue);
      } else {
        try {
          final snapshot = await ref
              .read(todayQueueSnapshotProvider(queue.id).future)
              .timeout(const Duration(seconds: 8));
          alreadyCalled = _currentCalled(snapshot);
          next = _nextWaiting(snapshot);
        } catch (e) {
          if (!context.mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(apiExceptionMessage(e))),
          );
          return;
        }
      }
      if (!context.mounted) return;
      // If someone is already called, reopen their actions (seat / call again)
      // instead of advancing to the next waiter.
      if (alreadyCalled != null) {
        await _openCalledSheet(context, queue, alreadyCalled);
        return;
      }
      await showCallNextSheet(
        context: context,
        ref: ref,
        queueId: queue.id,
        serviceMode: queue.serviceMode,
        nextEntry: next,
        calling: next != null,
        onRefresh: () async {
          ref.invalidate(todayQueueSnapshotProvider(queue.id));
        },
      );
    } finally {
      if (mounted) setState(() => _callNextInFlight = false);
    }
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

    if (onBreak) {
      return const _BreakModeView();
    }

    // Treat connectivity "loading" as online so Live Queue never gates forever
    // on web when connectivity_plus has not emitted an initial event yet.
    final isOnline = online.valueOrNull ?? true;
    final hasCachedQueues = queuesAsync.hasValue && (queuesAsync.valueOrNull?.isNotEmpty ?? false);
    if (!isOnline && !hasCachedQueues) {
      return StaffOfflineState(
        showCachedHint: false,
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
          if (!isOnline) {
            return StaffOfflineState(
              showCachedHint: true,
              onRetry: () => ref.invalidate(todayQueuesProvider),
            );
          }
          return StaffQueuePausedState(
            onResume: () => queueAction(ref, primary.id, 'resume', () async {
              _invalidateSnapshots(queues);
            }),
          );
        }

        final totalWaiting = queues.fold<int>(0, (s, q) => s + q.waitingCount);
        final calledOnPrimary = snapshotAsync.maybeWhen(
          data: (s) => s.currentCalled,
          orElse: () => null,
        );
        final hasActiveBoard = totalWaiting > 0 || calledOnPrimary != null;
        final modeInfo = ServiceModeInfo.forMode(primary.serviceMode);
        final hasSavedSnapshot = snapshotAsync.hasValue;

        final snapshot = snapshotAsync.valueOrNull;
        final heroEntry = calledOnPrimary ?? _nextWaiting(snapshot);
        final estWait = snapshot == null
            ? 0.0
            : _displayWaitMinutes(
                entry: heroEntry,
                metricsMinutes: snapshot.metrics.averageWaitMinutes,
                fallbackMinutes: primary.averageServiceTimeMinutes,
              );
        Future<void> refreshPrimary() async {
          ref.invalidate(todayQueueSnapshotProvider(primary.id));
          ref.invalidate(todayQueuesProvider);
        }

        final heroMessage = snapshotAsync.when(
          data: (_) => totalWaiting > 0
              ? 'Guests are waiting in another line — pick one on the right.'
              : 'No one is waiting right now',
          loading: () => totalWaiting > 0 ? 'Loading the next guest…' : 'No one is waiting right now',
          error: (_, __) => "We couldn't load the guest list — pull to refresh.",
        );
        final compact = MediaQuery.sizeOf(context).width < 720;

        return RefreshIndicator(
          onRefresh: () async => _invalidateSnapshots(queues),
          child: ListView(
            padding: EdgeInsets.fromLTRB(
              compact ? 16 : 32,
              compact ? 8 : 12,
              compact ? 16 : 32,
              32,
            ),
            children: [
              LiveQueueBoard(
                waitingCount: totalWaiting,
                heroBadge: calledOnPrimary != null ? 'Called' : "Who's next",
                heroLineLabel: '${liveBoardModeLabel(primary.serviceMode)} · ${primary.name}',
                heroMessage: heroMessage,
                hero: heroEntry == null
                    ? null
                    : LiveBoardGuest(
                        displayCode: heroEntry.displayCode.isNotEmpty
                            ? heroEntry.displayCode
                            : (heroEntry.customerName ?? 'Guest'),
                        name: heroEntry.customerName ?? 'Guest',
                        phone: heroEntry.customerPhone,
                        contextLabel: _contextLabel(heroEntry, primary.serviceMode),
                        waitingMinutes: heroEntry.joinedAt == null ? null : _waitMinutes(heroEntry),
                        estimatedMinutes: calledOnPrimary == null && estWait > 0 ? estWait : null,
                      ),
                lines: [
                  for (final q in queues)
                    LiveBoardLine(
                      id: q.id,
                      name: q.name,
                      serviceMode: q.serviceMode,
                      waiting: q.waitingCount,
                      selected: q.id == primary.id,
                    ),
                ],
                callLabel: calledOnPrimary != null
                    ? 'Continue with called guest'
                    : _friendlyCallLabel(modeInfo),
                callBusy: _callNextInFlight,
                actionsEnabled: isOnline,
                notice: isOnline
                    ? null
                    : _OfflineNotice(hasSavedSnapshot: hasSavedSnapshot),
                onCallNext: hasActiveBoard ? () => _callNext(context, primary) : null,
                onHeroTap: calledOnPrimary == null
                    ? null
                    : () => _openCalledSheet(context, primary, calledOnPrimary),
                onHold: heroEntry == null
                    ? null
                    : () => entryAction(ref, primary.id, heroEntry.id, 'hold', refreshPrimary),
                onSkip: heroEntry == null
                    ? null
                    : () => entryAction(ref, primary.id, heroEntry.id, 'skip', refreshPrimary),
                onMove: heroEntry == null || queues.length < 2
                    ? null
                    : () => entryAction(ref, primary.id, heroEntry.id, 'transfer', refreshPrimary),
                onWalkIn: () => showWalkIn(context, ref, primary.id, () async {
                  _invalidateSnapshots(queues);
                }),
                onFullList: () => context.push(StaffRoutes.queueConsole(primary.id)),
                onSelectLine: (id) => setState(() => _selectedQueueId = id),
              ),
            ],
          ),
        );
      },
    );
  }

  String? _contextLabel(QueueEntryModel entry, String serviceMode) {
    return switch (serviceMode) {
      'TAKEAWAY' => entry.metadata?['orderNumber'] != null
          ? 'Order #${entry.metadata!['orderNumber']}'
          : null,
      'DRIVE_IN' => [
          if (entry.metadata?['vehiclePlate'] != null) entry.metadata!['vehiclePlate'] as String,
          if (entry.metadata?['vehicleColor'] != null) entry.metadata!['vehicleColor'] as String,
        ].where((s) => s.isNotEmpty).join(' · '),
      _ => 'Party of ${entry.partySize}',
    };
  }
}

class _OfflineNotice extends StatelessWidget {
  const _OfflineNotice({required this.hasSavedSnapshot});

  final bool hasSavedSnapshot;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: QuykColors.warningTint,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          const Icon(Icons.wifi_off_rounded, size: 20, color: Color(0xFF7A4B0C)),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              hasSavedSnapshot
                  ? 'Showing last saved queue. Actions are paused until you reconnect.'
                  : "You're offline. Reconnect to load the guest board — actions are paused.",
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: QuykColors.ink,
              ),
            ),
          ),
        ],
      ),
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
