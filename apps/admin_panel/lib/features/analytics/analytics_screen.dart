import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../../core/models/platform_models.dart';
import '../../core/network/api_error_message.dart';
import '../../core/network/platform_api_client.dart';
import '../notifications/notifications_screen.dart' show channelLabel;

/// Analytics over the last [days] days.
final analyticsProvider = FutureProvider.autoDispose.family<PlatformAnalytics, int>((ref, days) async {
  final to = DateTime.now().toUtc();
  final from = to.subtract(Duration(days: days));
  return ref.watch(platformApiClientProvider).getAnalytics(
        from: from.toIso8601String(),
        to: to.toIso8601String(),
      );
});

int _count(Map<String, dynamic> row) {
  final c = row['_count'];
  final v = c is Map ? c['_all'] : row['count'];
  return v is int ? v : 0;
}

String _statusLabel(String raw) => switch (raw.toUpperCase()) {
      'COMPLETED' => 'Served',
      'WAITING' => 'Waiting',
      'CALLED' => 'Called',
      'HOLDING' => 'On hold',
      'SKIPPED' => 'Skipped',
      'NO_SHOW' => 'No-show',
      'CANCELLED' => 'Cancelled',
      'SENT' => 'Sent',
      'DELIVERED' => 'Delivered',
      'FAILED' => 'Failed',
      'PENDING' || 'QUEUED' || 'PROCESSING' => 'Waiting to send',
      final other => other,
    };

class AnalyticsScreen extends ConsumerStatefulWidget {
  const AnalyticsScreen({super.key});

  @override
  ConsumerState<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends ConsumerState<AnalyticsScreen> {
  int _days = 30;

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(analyticsProvider(_days));
    return QuykPage(
      title: 'Analytics',
      subtitle: 'Platform growth, wait times and alert delivery.',
      onRefresh: () async => ref.invalidate(analyticsProvider(_days)),
      action: SegmentedButton<int>(
        segments: const [
          ButtonSegment(value: 7, label: Text('7 days')),
          ButtonSegment(value: 30, label: Text('30 days')),
          ButtonSegment(value: 90, label: Text('90 days')),
        ],
        selected: {_days},
        showSelectedIcon: false,
        onSelectionChanged: (s) => setState(() => _days = s.first),
      ),
      children: [
        async.when(
          loading: () => const QuykLoadingBlock(),
          error: (e, _) => QuykMessageCard(
            icon: Icons.cloud_off_rounded,
            title: 'We couldn’t load analytics',
            subtitle: apiExceptionMessage(e),
            actionLabel: 'Try again',
            onAction: () => ref.invalidate(analyticsProvider(_days)),
          ),
          data: (data) {
            final entries = data.dailyCustomers;
            final served = entries
                .where((r) => r['status']?.toString().toUpperCase() == 'COMPLETED')
                .fold(0, (s, r) => s + _count(r));
            final totalEntries = entries.fold(0, (s, r) => s + _count(r));
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                QuykGrid(
                  minTileWidth: 200,
                  children: [
                    QuykStatTile(
                      label: 'New businesses',
                      value: '${data.businessGrowth}',
                      icon: Icons.storefront_outlined,
                      hint: 'In the last $_days days',
                      highlight: true,
                    ),
                    QuykStatTile(
                      label: 'Guests served',
                      value: NumberFormat.decimalPattern().format(served),
                      icon: Icons.check_circle_outline_rounded,
                      hint: '${NumberFormat.decimalPattern().format(totalEntries)} joined',
                    ),
                    QuykStatTile(
                      label: 'Average wait',
                      value: data.averageWaitMinutes > 0 ? '${data.averageWaitMinutes.toStringAsFixed(1)} min' : '—',
                      icon: Icons.timer_outlined,
                      hint: 'Join to being served',
                    ),
                  ],
                ),
                if (data.peakHoursNote?.trim().isNotEmpty == true) ...[
                  const SizedBox(height: 12),
                  Text(data.peakHoursNote!, style: const TextStyle(fontSize: 12.5, color: QuykColors.subtle)),
                ],
                const SizedBox(height: 24),
                LayoutBuilder(
                  builder: (context, c) {
                    final guests = _Breakdown(
                      title: 'Where guests ended up',
                      rows: [for (final r in entries) (_statusLabel('${r['status']}'), _count(r))],
                    );
                    final alerts = _Breakdown(
                      title: 'Guest alert delivery',
                      rows: [
                        for (final r in data.notificationSuccess)
                          (
                            [
                              _statusLabel('${r['status']}'),
                              if (r['channel'] != null) channelLabel('${r['channel']}'),
                            ].join(' · '),
                            _count(r),
                          ),
                      ],
                    );
                    if (c.maxWidth < 820) {
                      return Column(children: [guests, const SizedBox(height: 16), alerts]);
                    }
                    return Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [Expanded(child: guests), const SizedBox(width: 16), Expanded(child: alerts)],
                    );
                  },
                ),
              ],
            );
          },
        ),
      ],
    );
  }
}

class _Breakdown extends StatelessWidget {
  const _Breakdown({required this.title, required this.rows});

  final String title;
  final List<(String, int)> rows;

  @override
  Widget build(BuildContext context) {
    final total = rows.fold(0, (s, r) => s + r.$2);
    final sorted = [...rows]..sort((a, b) => b.$2.compareTo(a.$2));
    return QuykCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: QuykColors.ink)),
          const SizedBox(height: 14),
          if (sorted.isEmpty)
            const Text('Not enough activity yet.', style: TextStyle(color: QuykColors.muted))
          else
            for (final (label, count) in sorted) ...[
              Row(
                children: [
                  Expanded(child: Text(label, style: const TextStyle(fontSize: 13, color: QuykColors.ink))),
                  Text(
                    NumberFormat.decimalPattern().format(count),
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: QuykColors.green),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              ClipRRect(
                borderRadius: BorderRadius.circular(999),
                child: LinearProgressIndicator(
                  value: total == 0 ? 0 : count / total,
                  minHeight: 8,
                  backgroundColor: QuykColors.mist,
                  color: QuykColors.green,
                ),
              ),
              const SizedBox(height: 12),
            ],
        ],
      ),
    );
  }
}
