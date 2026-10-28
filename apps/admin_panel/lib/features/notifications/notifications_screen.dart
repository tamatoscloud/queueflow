import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../../core/network/api_error_message.dart';
import '../../core/network/platform_api_client.dart';
import '../../shared/feedback.dart';
import '../tenants/tenants_screen.dart' show formatDate;

final notificationDashboardProvider = FutureProvider.autoDispose((ref) async {
  final api = ref.watch(platformApiClientProvider);
  final results = await Future.wait<Object>([api.notificationStats(), api.listFailedNotifications()]);
  return (
    stats: results[0] as Map<String, dynamic>,
    failed: results[1] as List<Map<String, dynamic>>,
  );
});

int _count(Map<String, dynamic> row) {
  final c = row['_count'];
  final v = c is Map ? c['_all'] : null;
  return v is int ? v : 0;
}

String eventLabel(String? type) => switch ((type ?? '').toUpperCase()) {
      'QUEUE_JOINED' => 'Queue joined',
      'POSITION_UPDATE' => 'Position update',
      'ALMOST_YOUR_TURN' => 'Almost your turn',
      'YOUR_TURN' => 'Your turn',
      'QUEUE_CANCELLED' => 'Visit cancelled',
      'QUEUE_PAUSED' => 'Queue paused',
      'QUEUE_RESUMED' => 'Queue resumed',
      'QUEUE_CLOSED' => 'Queue closed',
      'FEEDBACK_REQUEST' => 'Feedback request',
      '' => 'Guest alert',
      final other => other[0] + other.substring(1).toLowerCase().replaceAll('_', ' '),
    };

String channelLabel(String? channel) => switch ((channel ?? '').toUpperCase()) {
      'WHATSAPP' => 'WhatsApp',
      'SMS' => 'SMS',
      'EMAIL' => 'Email',
      '' => '—',
      final other => other,
    };

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(notificationDashboardProvider);
    return QuykPage(
      title: 'Guest alerts',
      subtitle: 'WhatsApp, SMS and email delivery across every business.',
      onRefresh: () async => ref.invalidate(notificationDashboardProvider),
      children: [
        async.when(
          loading: () => const QuykLoadingBlock(),
          error: (e, _) => QuykMessageCard(
            icon: Icons.cloud_off_rounded,
            title: 'We couldn’t load guest alerts',
            subtitle: apiExceptionMessage(e),
            actionLabel: 'Try again',
            onAction: () => ref.invalidate(notificationDashboardProvider),
          ),
          data: (data) {
            final byStatus = (data.stats['byStatus'] as List<dynamic>? ?? const [])
                .whereType<Map<String, dynamic>>()
                .toList();
            int total(Set<String> statuses) => byStatus
                .where((r) => statuses.contains(r['status']?.toString()))
                .fold(0, (s, r) => s + _count(r));
            final sent = total({'SENT', 'DELIVERED'});
            final failed = total({'FAILED'});
            final pending = total({'PENDING', 'QUEUED', 'PROCESSING'});
            final all = sent + failed + pending + total({'CANCELLED'});
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                QuykGrid(
                  minTileWidth: 200,
                  children: [
                    QuykStatTile(label: 'Delivered', value: '$sent', icon: Icons.done_all_rounded, highlight: true),
                    QuykStatTile(
                      label: 'Failed',
                      value: '$failed',
                      icon: Icons.error_outline_rounded,
                      hint: all > 0 ? '${(failed * 100 / all).round()}% of all alerts' : null,
                    ),
                    QuykStatTile(label: 'Waiting to send', value: '$pending', icon: Icons.schedule_send_outlined),
                  ],
                ),
                const SizedBox(height: 24),
                QuykSectionTitle('Recent failures · ${data.failed.length}'),
                if (data.failed.isEmpty)
                  const QuykMessageCard(
                    icon: Icons.check_circle_outline_rounded,
                    title: 'No failed alerts',
                    subtitle: 'Every recent guest alert was delivered.',
                  )
                else
                  QuykTable(
                    columns: const [
                      QuykColumn('Business', flex: 4),
                      QuykColumn('Event', flex: 3),
                      QuykColumn('Channel', flex: 2),
                      QuykColumn('When', flex: 3),
                      QuykColumn('', flex: 2, alignEnd: true),
                    ],
                    rows: [
                      for (final n in data.failed)
                        [
                          QuykCellText(
                            (n['business'] is Map ? (n['business'] as Map)['name']?.toString() : null) ?? '—',
                            strong: true,
                          ),
                          QuykCellText(eventLabel(n['type']?.toString())),
                          QuykCellText(channelLabel(n['channel']?.toString())),
                          QuykCellText(formatDate((n['updatedAt'] ?? n['createdAt'])?.toString(), time: true)),
                          TextButton.icon(
                            onPressed: () async {
                              final done = await runWithFeedback(
                                context,
                                () => ref.read(platformApiClientProvider).retryNotification(n['id'] as String),
                                success: 'Alert queued to send again',
                                failure: 'Couldn’t retry the alert',
                              );
                              if (done) ref.invalidate(notificationDashboardProvider);
                            },
                            icon: const Icon(Icons.refresh_rounded, size: 18),
                            label: const Text('Retry'),
                          ),
                        ],
                    ],
                  ),
              ],
            );
          },
        ),
      ],
    );
  }
}
