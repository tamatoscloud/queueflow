import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';
import 'package:queueflow_widgets/queueflow_widgets.dart';

import '../../../core/models/models.dart';
import '../../../core/network/business_api_client.dart';
import '../../queue_console/presentation/queue_console_screen.dart';
import '../../queues/presentation/queues_screen.dart';

const _firstNames = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn',
  'Sam', 'Jamie', 'Drew', 'Blake', 'Cameron', 'Skyler', 'Reese', 'Harper',
  'Elena', 'Marco', 'Priya', 'Kenji', 'Sofia', 'Liam', 'Noah', 'Emma',
];

const _lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Garcia', 'Martinez', 'Lee', 'Kim',
  'Patel', 'Nguyen', 'Chen', 'Singh', 'Wilson', 'Anderson', 'Thomas', 'Moore',
  'Jackson', 'White', 'Harris', 'Clark', 'Lewis', 'Walker', 'Hall', 'Young',
];

String _randomName(Random random) =>
    '${_firstNames[random.nextInt(_firstNames.length)]} ${_lastNames[random.nextInt(_lastNames.length)]}';

String _randomPhone(Random random) =>
    '+1${random.nextInt(900) + 100}${random.nextInt(900) + 100}${random.nextInt(9000) + 1000}';

class DemoSimulatorScreen extends ConsumerStatefulWidget {
  const DemoSimulatorScreen({super.key});

  @override
  ConsumerState<DemoSimulatorScreen> createState() => _DemoSimulatorScreenState();
}

class _DemoSimulatorScreenState extends ConsumerState<DemoSimulatorScreen> {
  String? _selectedQueueId;
  String? _lastAction;
  bool _busy = false;
  final _random = Random();

  Future<void> _run(String label, Future<void> Function() action) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await action();
      if (mounted) setState(() => _lastAction = '✓ $label');
    } catch (e) {
      if (mounted) setState(() => _lastAction = '✗ $label: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _refresh(String queueId) async {
    ref.invalidate(queueSnapshotProvider(queueId));
    ref.invalidate(queuesProvider);
  }

  Future<void> _walkIn(String queueId, {bool vip = false, int? partySize}) async {
    final api = ref.read(businessApiClientProvider);
    final entry = await api.walkIn(queueId, {
      'fullName': _randomName(_random),
      'phone': _randomPhone(_random),
      'partySize': partySize ?? (_random.nextInt(6) + 1),
      'notificationPreference': 'SMS',
      if (vip) 'isVip': true,
    });
    setState(() => _lastAction = '✓ Added ${entry.displayCode} · ${entry.customerName}');
    await _refresh(queueId);
  }

  @override
  Widget build(BuildContext context) {
    final queuesAsync = ref.watch(queuesProvider);
    final isTablet = Breakpoints.isTablet(context);

    return Scaffold(
      body: queuesAsync.when(
        loading: () => const PageLoading(message: 'Loading queues…'),
        error: (e, _) => PageError(message: '$e', onRetry: () => ref.invalidate(queuesProvider)),
        data: (queues) {
          if (queues.isEmpty) {
            return const EmptyStateView(
              title: 'No queues',
              message: 'Create a queue to run the demo simulator.',
              icon: Icons.science_outlined,
            );
          }

          final queueId = _selectedQueueId ?? queues.first.id;
          final queue = queues.firstWhere((q) => q.id == queueId, orElse: () => queues.first);
          final snapshotAsync = ref.watch(queueSnapshotProvider(queueId));
          final called = snapshotAsync.maybeWhen(data: (s) => s.currentCalled, orElse: () => null);

          return ListView(
            padding: EdgeInsets.all(isTablet ? AppSpacing.lg : AppSpacing.md),
            children: [
              const SectionHeader(
                title: 'Demo Simulator',
                subtitle: 'Populate queues for live client presentations',
              ),
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Target queue', style: Theme.of(context).textTheme.titleSmall),
                    const SizedBox(height: AppSpacing.sm),
                    DropdownButtonFormField<String>(
                      value: queueId,
                      decoration: const InputDecoration(
                        prefixIcon: Icon(Icons.queue),
                        labelText: 'Queue',
                      ),
                      items: [
                        for (final q in queues)
                          DropdownMenuItem(value: q.id, child: Text('${q.prefix} · ${q.name}')),
                      ],
                      onChanged: _busy ? null : (v) => setState(() => _selectedQueueId = v),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Row(
                      children: [
                        StatusBadge(status: queue.status),
                        const SizedBox(width: AppSpacing.sm),
                        Text('${queue.waitingCount} waiting', style: Theme.of(context).textTheme.bodySmall),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              const SectionHeader(title: 'Add customers'),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  AppButton(
                    label: '+ Random Customer',
                    icon: Icons.person_add_outlined,
                    onPressed: _busy ? null : () => _run('Random walk-in', () => _walkIn(queueId)),
                  ),
                  AppButton(
                    label: '+10 Customers',
                    icon: Icons.groups_outlined,
                    variant: AppButtonVariant.secondary,
                    onPressed: _busy
                        ? null
                        : () => _run('+10 walk-ins', () async {
                              for (var i = 0; i < 10; i++) {
                                await _walkIn(queueId);
                              }
                            }),
                  ),
                  AppButton(
                    label: '+ VIP',
                    icon: Icons.star_outline,
                    variant: AppButtonVariant.outline,
                    onPressed: _busy ? null : () => _run('VIP walk-in', () => _walkIn(queueId, vip: true, partySize: 2)),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              const SectionHeader(title: 'Queue operations'),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  AppButton(
                    label: 'Call Next',
                    icon: Icons.campaign_outlined,
                    onPressed: _busy
                        ? null
                        : () => _run('Called next', () async {
                              final entry = await ref.read(businessApiClientProvider).callNext(queueId);
                              setState(() => _lastAction = '✓ Called ${entry.displayCode}');
                              await _refresh(queueId);
                            }),
                  ),
                  AppButton(
                    label: 'Complete',
                    icon: Icons.check_circle_outline,
                    variant: AppButtonVariant.outline,
                    onPressed: _busy || called == null
                        ? null
                        : () => _run('Completed ${called.displayCode}', () async {
                              await ref.read(businessApiClientProvider).completeEntry(called.id);
                              await _refresh(queueId);
                            }),
                  ),
                  AppButton(
                    label: 'Skip',
                    icon: Icons.skip_next_outlined,
                    variant: AppButtonVariant.outline,
                    onPressed: _busy || called == null
                        ? null
                        : () => _run('Skipped ${called.displayCode}', () async {
                              await ref.read(businessApiClientProvider).skipEntry(called.id);
                              await _refresh(queueId);
                            }),
                  ),
                  AppButton(
                    label: 'Pause Queue',
                    icon: Icons.pause_circle_outline,
                    variant: AppButtonVariant.secondary,
                    onPressed: _busy
                        ? null
                        : () => _run('Queue paused', () async {
                              await ref.read(businessApiClientProvider).pauseQueue(queueId);
                              await _refresh(queueId);
                            }),
                  ),
                  AppButton(
                    label: 'Resume Queue',
                    icon: Icons.play_circle_outline,
                    variant: AppButtonVariant.secondary,
                    onPressed: _busy
                        ? null
                        : () => _run('Queue resumed', () async {
                              await ref.read(businessApiClientProvider).resumeQueue(queueId);
                              await _refresh(queueId);
                            }),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              if (_lastAction != null)
                AppCard(
                  variant: AppCardVariant.filled,
                  child: Row(
                    children: [
                      Icon(
                        _lastAction!.startsWith('✓') ? Icons.check_circle : Icons.error_outline,
                        color: _lastAction!.startsWith('✓') ? AppColors.success : AppColors.danger,
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(child: Text(_lastAction!, style: Theme.of(context).textTheme.bodyMedium)),
                    ],
                  ),
                ),
              if (_busy) ...[
                const SizedBox(height: AppSpacing.md),
                const Center(child: AppLoadingIndicator()),
              ],
              const SizedBox(height: AppSpacing.lg),
              snapshotAsync.when(
                loading: () => const SizedBox.shrink(),
                error: (_, __) => const SizedBox.shrink(),
                data: (snapshot) => _SnapshotSummary(snapshot: snapshot),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _SnapshotSummary extends StatelessWidget {
  const _SnapshotSummary({required this.snapshot});

  final QueueSnapshotModel snapshot;

  @override
  Widget build(BuildContext context) {
    final m = snapshot.metrics;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(title: 'Live snapshot'),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.6,
          children: [
            MetricCard(label: 'Waiting', value: '${m.waitingCount}', icon: Icons.people_outline, accentColor: AppColors.primary),
            MetricCard(label: 'Called', value: '${m.calledCount}', icon: Icons.record_voice_over_outlined, accentColor: AppColors.secondary),
            MetricCard(label: 'Completed', value: '${m.completedToday}', icon: Icons.check_circle_outline, accentColor: AppColors.success),
            MetricCard(label: 'No shows', value: '${m.noShowCount}', icon: Icons.person_off_outlined, accentColor: AppColors.danger),
          ],
        ),
      ],
    );
  }
}
