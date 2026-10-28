import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../../../core/models/models.dart';
import '../../../core/network/business_api_client.dart';
import '../../../core/network/connection_diagnostics.dart' show apiExceptionMessage;
import '../../../core/session/session_providers.dart';
import '../../../features/auth/presentation/auth_controller.dart';

DateTime _day(DateTime d) => DateTime(d.year, d.month, d.day);

/// Summary for one day at the selected location (or all locations).
final reportsProvider = FutureProvider.autoDispose.family<DailySummaryModel, DateTime>((ref, day) async {
  final api = ref.watch(businessApiClientProvider);
  final businessId = ref.watch(currentUserProvider)?.businessId;
  final branchId = ref.watch(selectedBranchIdProvider);
  return api.getDailySummary(businessId: businessId, branchId: branchId, date: day);
});

class ReportsScreen extends ConsumerStatefulWidget {
  const ReportsScreen({super.key});

  @override
  ConsumerState<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends ConsumerState<ReportsScreen> {
  DateTime _selected = _day(DateTime.now());

  bool get _isToday => _selected == _day(DateTime.now());

  Future<void> _pickDay() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selected,
      firstDate: DateTime(2024),
      lastDate: _day(DateTime.now()),
    );
    if (picked != null) setState(() => _selected = _day(picked));
  }

  void _shift(int days) {
    final next = _selected.add(Duration(days: days));
    if (next.isAfter(_day(DateTime.now()))) return;
    setState(() => _selected = next);
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(reportsProvider(_selected));
    final label = _isToday ? 'Today' : DateFormat('EEE, d MMM yyyy').format(_selected);

    return QuykPage(
      title: 'Reports',
      subtitle: 'Guests joined, served and how long they waited.',
      onRefresh: () async => ref.invalidate(reportsProvider(_selected)),
      action: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton.outlined(
            tooltip: 'Previous day',
            onPressed: () => _shift(-1),
            icon: const Icon(Icons.chevron_left_rounded),
          ),
          const SizedBox(width: 6),
          OutlinedButton.icon(
            onPressed: _pickDay,
            icon: const Icon(Icons.calendar_today_outlined, size: 16),
            label: Text(label),
          ),
          const SizedBox(width: 6),
          IconButton.outlined(
            tooltip: 'Next day',
            onPressed: _isToday ? null : () => _shift(1),
            icon: const Icon(Icons.chevron_right_rounded),
          ),
        ],
      ),
      children: [
        async.when(
          loading: () => const QuykLoadingBlock(),
          error: (e, _) => QuykMessageCard(
            icon: Icons.cloud_off_rounded,
            title: 'We couldn’t load this day’s numbers',
            subtitle: apiExceptionMessage(e),
            actionLabel: 'Try again',
            onAction: () => ref.invalidate(reportsProvider(_selected)),
          ),
          data: (s) {
            if (!s.hasActivity) {
              return QuykMessageCard(
                icon: Icons.insights_outlined,
                title: _isToday ? 'Quiet so far today' : 'No guests on this day',
                subtitle: 'Numbers appear here once guests join your lines.',
              );
            }
            final servedRate = s.joined > 0 ? (s.totalServed * 100 / s.joined).round() : 0;
            final noShowRate = s.joined > 0 ? (s.noShows * 100 / s.joined).round() : 0;
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                QuykGrid(
                  minTileWidth: 220,
                  children: [
                    QuykStatTile(
                      label: 'Guests joined',
                      value: '${s.joined}',
                      icon: Icons.people_alt_outlined,
                      highlight: true,
                    ),
                    QuykStatTile(
                      label: 'Served',
                      value: '${s.totalServed}',
                      icon: Icons.check_circle_outline_rounded,
                      hint: '$servedRate% of guests',
                    ),
                    QuykStatTile(
                      label: 'Average wait',
                      value: s.averageWaitMinutes > 0 ? '${s.averageWaitMinutes} min' : '—',
                      icon: Icons.timer_outlined,
                      hint: 'Join to being served',
                    ),
                    QuykStatTile(
                      label: 'No-shows',
                      value: '${s.noShows}',
                      icon: Icons.person_off_outlined,
                      hint: '$noShowRate% of guests',
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                QuykCard(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Where guests ended up',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: QuykColors.ink),
                      ),
                      const SizedBox(height: 14),
                      _OutcomeBar(
                        served: s.totalServed,
                        noShows: s.noShows,
                        stillActive: s.stillActive,
                        total: s.joined,
                      ),
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      ],
    );
  }
}

class _OutcomeBar extends StatelessWidget {
  const _OutcomeBar({
    required this.served,
    required this.noShows,
    required this.stillActive,
    required this.total,
  });

  final int served;
  final int noShows;
  final int stillActive;
  final int total;

  @override
  Widget build(BuildContext context) {
    final other = (total - served - noShows - stillActive).clamp(0, total);
    final segments = [
      ('Served', served, QuykColors.green),
      ('Still in line', stillActive, QuykColors.lime),
      ('No-show', noShows, QuykColors.danger),
      ('Cancelled / left', other, QuykColors.field),
    ].where((s) => s.$2 > 0).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: SizedBox(
            height: 14,
            child: Row(
              children: [
                for (final s in segments) Expanded(flex: s.$2, child: ColoredBox(color: s.$3)),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),
        Wrap(
          spacing: 18,
          runSpacing: 8,
          children: [
            for (final s in segments)
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(color: s.$3, shape: BoxShape.circle),
                  ),
                  const SizedBox(width: 6),
                  Text('${s.$1} · ${s.$2}', style: const TextStyle(fontSize: 13, color: QuykColors.muted)),
                ],
              ),
          ],
        ),
      ],
    );
  }
}
