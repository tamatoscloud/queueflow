import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:queueflow_network/queueflow_network.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../../../core/models/models.dart';
import '../../../core/network/business_api_client.dart';
import '../../../core/network/connection_diagnostics.dart' show apiExceptionMessage;
import '../../../core/realtime/realtime_client.dart';
import '../../../core/realtime/realtime_sync.dart';
import '../../../core/routing/app_routes.dart';
import '../../../core/session/session_providers.dart';
import '../../../features/auth/presentation/auth_controller.dart';
import '../../../shared/service_mode/service_mode_helpers.dart';
import '../../notifications/presentation/guest_messages_view.dart';
import '../../queues/presentation/queues_screen.dart';

typedef DashboardData = ({
  List<QueueModel> queues,
  DailySummaryModel summary,
  List<NotificationModel> notifications,
  String? businessName,
});

const _emptySummary = DailySummaryModel(date: '', totalServed: 0, averageWaitMinutes: 0, noShows: 0);

/// Today's numbers for the selected location. Lines are required; the
/// summary, alerts and business name are best-effort so one failing call
/// (e.g. a role without access) doesn't blank the whole page.
final dashboardProvider = FutureProvider.autoDispose<DashboardData>((ref) async {
  final auth = ref.watch(authControllerProvider);
  if (!auth.isAuthenticated) {
    return (queues: <QueueModel>[], summary: _emptySummary, notifications: <NotificationModel>[], businessName: null);
  }
  final api = ref.watch(businessApiClientProvider);
  final businessId = auth.session?.user.businessId;
  final branchId = ref.watch(selectedBranchIdProvider);

  Future<T?> optional<T>(Future<T> Function() call) async {
    try {
      return await call();
    } on UnauthorizedException {
      rethrow;
    } catch (_) {
      return null;
    }
  }

  try {
    final queuesF = api.getQueues(branchId: branchId, businessId: businessId);
    final summaryF = optional(() => api.getDailySummary(businessId: businessId, branchId: branchId));
    final notificationsF = optional(() => api.getNotifications());
    final Future<Map<String, dynamic>?> businessF =
        businessId == null ? Future.value() : optional(() => api.getBusiness(businessId));
    final queues = await queuesF;
    final summary = await summaryF;
    final notifications = await notificationsF;
    final business = await businessF;
    return (
      queues: queues,
      summary: summary ?? _emptySummary,
      notifications: notifications ?? const <NotificationModel>[],
      businessName: business?['name'] as String?,
    );
  } on UnauthorizedException {
    await ref.read(authControllerProvider.notifier).sessionExpired();
    rethrow;
  }
});

final dashboardRealtimeBindingProvider = Provider.autoDispose<void>((ref) {
  final user = ref.watch(currentUserProvider);
  final businessId = user?.businessId;
  if (businessId == null) return;

  final client = ref.watch(realtimeClientProvider);
  bindRealtimeRefresh(
    ref: ref,
    client: client,
    onRefresh: () => ref.invalidate(dashboardProvider),
    onSubscribe: () async {
      await client.connect();
      final dash = await client.subscribeBusinessDashboard(businessId);
      final queues = await client.subscribeBusinessQueues(businessId);
      return dash && queues;
    },
  );
});

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(dashboardRealtimeBindingProvider);
    final async = ref.watch(dashboardProvider);
    final today = DateFormat('EEEE, d MMMM').format(DateTime.now());

    return async.when(
      loading: () => QuykPage(title: 'Today', subtitle: today, children: const [QuykLoadingBlock()]),
      error: (e, _) => QuykPage(
        title: 'Today',
        subtitle: today,
        children: [
          QuykMessageCard(
            icon: Icons.cloud_off_rounded,
            title: 'We couldn’t load your restaurant right now',
            subtitle: apiExceptionMessage(e),
            actionLabel: 'Try again',
            onAction: () => ref.invalidate(dashboardProvider),
          ),
        ],
      ),
      data: (data) => _DashboardBody(data: data, today: today),
    );
  }
}

class _DashboardBody extends ConsumerWidget {
  const _DashboardBody({required this.data, required this.today});

  final DashboardData data;
  final String today;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final queues = data.queues;
    final summary = data.summary;
    final waiting = queues.fold<int>(0, (sum, q) => sum + q.waitingCount);
    final paused = queues.where((q) => q.isPaused).toList();
    final busiest = [...queues.where((q) => q.isActive || q.isPaused)]
      ..sort((a, b) => b.waitingCount.compareTo(a.waitingCount));
    final serveTarget = busiest.isNotEmpty ? busiest.first : (queues.isNotEmpty ? queues.first : null);
    final failedAlerts = data.notifications.where((n) => guestMessageGroup(n) == GuestMessageGroup.failed).length;

    return QuykPage(
      title: data.businessName ?? 'Today',
      subtitle: data.businessName == null ? today : 'Today · $today',
      onRefresh: () async => ref.invalidate(dashboardProvider),
      action: serveTarget == null
          ? FilledButton.icon(
              onPressed: () => showCreateQueueSheet(context, ref),
              icon: const Icon(Icons.add_rounded),
              label: const Text('Create a line'),
            )
          : FilledButton.icon(
              onPressed: () => context.push(AppRoutes.queueConsole(serveTarget.id)),
              icon: const Icon(Icons.campaign_outlined),
              label: Text(waiting > 0 ? 'Serve guests' : 'Open live line'),
            ),
      children: [
        QuykGrid(
          minTileWidth: 170,
          children: [
            QuykStatTile(
              label: 'Waiting now',
              value: '$waiting',
              icon: Icons.people_alt_outlined,
              hint: queues.isEmpty ? 'No lines yet' : 'across ${queues.length} line${queues.length == 1 ? '' : 's'}',
              highlight: true,
              onTap: () => context.go(AppRoutes.queues),
            ),
            QuykStatTile(
              label: 'Served today',
              value: '${summary.totalServed}',
              icon: Icons.check_circle_outline_rounded,
              hint: summary.joined > 0 ? '${summary.joined} joined today' : 'No guests yet today',
            ),
            QuykStatTile(
              label: 'Average wait',
              value: summary.averageWaitMinutes > 0 ? '${summary.averageWaitMinutes} min' : '—',
              icon: Icons.timer_outlined,
              hint: 'For guests served today',
            ),
            QuykStatTile(
              label: 'No-shows',
              value: '${summary.noShows}',
              icon: Icons.person_off_outlined,
              hint: summary.joined > 0
                  ? '${(summary.noShows * 100 / summary.joined).round()}% of today’s guests'
                  : 'Guests who didn’t come back',
            ),
          ],
        ),
        if (paused.isNotEmpty || failedAlerts > 0) ...[
          const SizedBox(height: 16),
          _AttentionBanner(paused: paused, failedAlerts: failedAlerts),
        ],
        const SizedBox(height: 24),
        QuykSectionTitle(
          'Lines right now',
          trailing: TextButton(onPressed: () => context.go(AppRoutes.queues), child: const Text('All lines')),
        ),
        if (queues.isEmpty)
          QuykMessageCard(
            icon: Icons.format_list_numbered_rounded,
            title: 'Create your first waiting line',
            subtitle: 'Guests scan your code to join it, and your team serves them from here.',
            actionLabel: 'Create a line',
            onAction: () => showCreateQueueSheet(context, ref),
          )
        else
          QuykTable(
            columns: const [
              QuykColumn('Line', flex: 5),
              QuykColumn('Type', flex: 3),
              QuykColumn('Waiting', flex: 2),
              QuykColumn('Status', flex: 2),
              QuykColumn('', flex: 3, alignEnd: true),
            ],
            onRowTap: (i) => context.push(AppRoutes.queueDetail(queues[i].id)),
            rows: [
              for (final q in queues)
                [
                  QuykCellText(q.name, strong: true),
                  QuykCellText(ServiceModeInfo.forMode(q.serviceMode).label),
                  QuykCellText('${q.waitingCount}', strong: true, green: true),
                  queueStatusPill(q.status),
                  TextButton.icon(
                    onPressed: () => context.push(AppRoutes.queueConsole(q.id)),
                    icon: const Icon(Icons.campaign_outlined, size: 18),
                    label: const Text('Serve'),
                  ),
                ],
            ],
          ),
        const SizedBox(height: 24),
        LayoutBuilder(
          builder: (context, constraints) {
            final wide = constraints.maxWidth >= 860;
            final activity = _RecentActivity(notifications: data.notifications);
            const shortcuts = _Shortcuts();
            if (!wide) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [activity, const SizedBox(height: 24), shortcuts],
              );
            }
            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(flex: 3, child: activity),
                const SizedBox(width: 20),
                const Expanded(flex: 2, child: shortcuts),
              ],
            );
          },
        ),
      ],
    );
  }
}

class _AttentionBanner extends StatelessWidget {
  const _AttentionBanner({required this.paused, required this.failedAlerts});

  final List<QueueModel> paused;
  final int failedAlerts;

  @override
  Widget build(BuildContext context) {
    final lines = <String>[
      if (paused.isNotEmpty)
        paused.length == 1 ? '${paused.first.name} is paused — guests can’t join.' : '${paused.length} lines are paused.',
      if (failedAlerts > 0)
        '$failedAlerts guest alert${failedAlerts == 1 ? '' : 's'} failed to send.',
    ];
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
      decoration: BoxDecoration(color: QuykColors.warningTint, borderRadius: BorderRadius.circular(18)),
      child: Row(
        children: [
          const QuykIconBubble(
            icon: Icons.priority_high_rounded,
            background: QuykColors.warning,
            foreground: QuykColors.ink,
            size: 32,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              lines.join(' '),
              style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w500, color: QuykColors.ink),
            ),
          ),
          if (paused.isNotEmpty)
            TextButton(
              onPressed: () => context.push(AppRoutes.queueDetail(paused.first.id)),
              child: const Text('Review'),
            )
          else
            TextButton(onPressed: () => context.go(AppRoutes.notifications), child: const Text('View alerts')),
        ],
      ),
    );
  }
}

class _RecentActivity extends StatelessWidget {
  const _RecentActivity({required this.notifications});

  final List<NotificationModel> notifications;

  @override
  Widget build(BuildContext context) {
    final recent = notifications.take(6).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        QuykSectionTitle(
          'Recent guest alerts',
          trailing: TextButton(onPressed: () => context.go(AppRoutes.notifications), child: const Text('See all')),
        ),
        if (recent.isEmpty)
          const QuykMessageCard(
            icon: Icons.notifications_none_rounded,
            title: 'Nothing yet today',
            subtitle: 'Alerts sent to guests (joined, your turn, feedback) show up here.',
          )
        else
          QuykCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                for (var i = 0; i < recent.length; i++) ...[
                  if (i > 0) const Divider(height: 1),
                  ListTile(
                    leading: QuykIconBubble(
                      icon: switch (recent[i].type.toUpperCase()) {
                        'YOUR_TURN' || 'ALMOST_YOUR_TURN' => Icons.campaign_outlined,
                        'FEEDBACK_REQUEST' => Icons.star_outline_rounded,
                        'QUEUE_JOINED' => Icons.person_add_alt_outlined,
                        'POSITION_UPDATE' => Icons.format_list_numbered_rounded,
                        'QUEUE_PAUSED' || 'QUEUE_CLOSED' || 'QUEUE_CANCELLED' => Icons.pause_circle_outline_rounded,
                        _ => Icons.chat_bubble_outline_rounded,
                      },
                      size: 36,
                    ),
                    title: Text(
                      [
                        if (recent[i].displayCode != null) recent[i].displayCode!,
                        guestMessageEventLabel(recent[i].type),
                      ].join(' · '),
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                    ),
                    subtitle: Text(
                      [
                        recent[i].queueName,
                        guestMessageChannelLabel(recent[i].channel),
                        DateFormat.jm().format(recent[i].createdAt.toLocal()),
                      ].whereType<String>().join(' · '),
                      style: const TextStyle(fontSize: 12, color: QuykColors.subtle),
                    ),
                    trailing: QuykStatusPill(status: recent[i].status),
                  ),
                ],
              ],
            ),
          ),
      ],
    );
  }
}

class _Shortcuts extends StatelessWidget {
  const _Shortcuts();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const QuykSectionTitle('Shortcuts'),
        QuykActionTile(
          icon: Icons.qr_code_2_rounded,
          title: 'Guest join codes',
          subtitle: 'Print or share the code guests scan',
          onTap: () => context.go(AppRoutes.restaurantQr),
        ),
        const SizedBox(height: 10),
        QuykActionTile(
          icon: Icons.restaurant_menu_rounded,
          title: 'Menu',
          subtitle: 'What guests can browse while they wait',
          onTap: () => context.go(AppRoutes.menu),
        ),
        const SizedBox(height: 10),
        QuykActionTile(
          icon: Icons.badge_outlined,
          title: 'Team',
          subtitle: 'Invite staff and managers',
          onTap: () => context.go(AppRoutes.staff),
        ),
        const SizedBox(height: 10),
        QuykActionTile(
          icon: Icons.insights_outlined,
          title: 'Reports',
          subtitle: 'Guests served, waits and no-shows',
          onTap: () => context.go(AppRoutes.reports),
        ),
      ],
    );
  }
}
