import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';
import 'package:queueflow_widgets/queueflow_widgets.dart';

import '../../../core/models/models.dart';
import '../../../core/network/business_api_client.dart';
import '../../../core/routing/app_routes.dart';
import '../../queue_console/presentation/queue_console_screen.dart';
import '../../queues/presentation/queues_screen.dart';

enum TableStatus { available, occupied, cleaning, reserved }

class _TableState {
  const _TableState({
    required this.id,
    required this.label,
    required this.capacity,
    this.status = TableStatus.available,
    this.assignedEntry,
  });

  final String id;
  final String label;
  final int capacity;
  final TableStatus status;
  final QueueEntryModel? assignedEntry;

  _TableState copyWith({
    TableStatus? status,
    QueueEntryModel? assignedEntry,
    bool clearEntry = false,
  }) =>
      _TableState(
        id: id,
        label: label,
        capacity: capacity,
        status: status ?? this.status,
        assignedEntry: clearEntry ? null : (assignedEntry ?? this.assignedEntry),
      );
}

List<_TableState> _defaultTables() => [
      for (var i = 1; i <= 4; i++) _TableState(id: 't2-$i', label: 'T$i', capacity: 2),
      for (var i = 1; i <= 6; i++) _TableState(id: 't4-$i', label: 'T${i + 4}', capacity: 4),
      for (var i = 1; i <= 4; i++) _TableState(id: 't6-$i', label: 'T${i + 10}', capacity: 6),
      for (var i = 1; i <= 2; i++) _TableState(id: 't8-$i', label: 'T${i + 14}', capacity: 8),
    ];

class TableFloorScreen extends ConsumerStatefulWidget {
  const TableFloorScreen({super.key});

  @override
  ConsumerState<TableFloorScreen> createState() => _TableFloorScreenState();
}

class _TableFloorScreenState extends ConsumerState<TableFloorScreen> {
  String? _selectedQueueId;
  List<_TableState> _tables = _defaultTables();
  bool _busy = false;

  Future<void> _completeDining(_TableState table) async {
    final entry = table.assignedEntry;
    if (entry == null || _busy) return;
    setState(() => _busy = true);
    try {
      await ref.read(businessApiClientProvider).completeEntry(entry.id);
      if (_selectedQueueId != null) ref.invalidate(queueSnapshotProvider(_selectedQueueId!));
      setState(() {
        _tables = _tables
            .map((t) => t.id == table.id
                ? t.copyWith(status: TableStatus.cleaning, clearEntry: true)
                : t)
            .toList();
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${entry.displayCode} completed · table ${table.label} cleaning')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _markAvailable(String tableId) {
    setState(() {
      _tables = _tables
          .map((t) => t.id == tableId ? t.copyWith(status: TableStatus.available, clearEntry: true) : t)
          .toList();
    });
  }

  void _toggleReserved(_TableState table) {
    if (table.status == TableStatus.occupied) return;
    setState(() {
      _tables = _tables
          .map((t) => t.id == table.id
              ? t.copyWith(
                  status: table.status == TableStatus.reserved ? TableStatus.available : TableStatus.reserved,
                  clearEntry: true,
                )
              : t)
          .toList();
    });
  }

  Future<void> _assignFromWaiting(_TableState table, List<QueueEntryModel> waiting) async {
    if (table.status != TableStatus.available || waiting.isEmpty) return;

    final entry = await showModalBottomSheet<QueueEntryModel>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Text(
                'Assign to ${table.label} (${table.capacity} seats)',
                style: Theme.of(ctx).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
              ),
            ),
            Flexible(
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: waiting.length,
                itemBuilder: (context, i) {
                  final e = waiting[i];
                  final fits = e.partySize <= table.capacity;
                  return ListTile(
                    enabled: fits,
                    leading: AppAvatar(name: e.displayCode, size: 40),
                    title: Text('${e.displayCode} · ${e.customerName ?? 'Guest'}'),
                    subtitle: Text('Party of ${e.partySize}${e.isVip ? ' · VIP' : ''}'),
                    trailing: fits ? null : const Icon(Icons.warning_amber, color: AppColors.warning),
                    onTap: fits ? () => Navigator.pop(ctx, e) : null,
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );

    if (entry == null) return;
    setState(() {
      _tables = _tables
          .map((t) => t.id == table.id
              ? t.copyWith(status: TableStatus.occupied, assignedEntry: entry)
              : t)
          .toList();
    });
  }

  Color _statusColor(TableStatus status) => switch (status) {
        TableStatus.available => AppColors.success,
        TableStatus.occupied => AppColors.primary,
        TableStatus.cleaning => AppColors.warning,
        TableStatus.reserved => AppColors.accentPurple,
      };

  @override
  Widget build(BuildContext context) {
    final queuesAsync = ref.watch(queuesProvider);
    final isTablet = Breakpoints.isTablet(context);

    return Scaffold(
      body: queuesAsync.when(
        loading: () => const PageLoading(message: 'Loading floor plan…'),
        error: (e, _) => PageError(message: '$e', onRetry: () => ref.invalidate(queuesProvider)),
        data: (queues) {
          if (queues.isEmpty) {
            return const EmptyStateView(
              title: 'No queues',
              message: 'Select a queue to manage table assignments.',
              icon: Icons.table_restaurant_outlined,
            );
          }

          final queueId = _selectedQueueId ?? queues.first.id;
          final snapshotAsync = ref.watch(queueSnapshotProvider(queueId));
          final waiting = snapshotAsync.maybeWhen(
            data: (s) => s.entries.where((e) => e.status == 'WAITING').toList(),
            orElse: () => <QueueEntryModel>[],
          );

          final available = _tables.where((t) => t.status == TableStatus.available).length;
          final occupied = _tables.where((t) => t.status == TableStatus.occupied).length;

          return ListView(
            padding: EdgeInsets.all(isTablet ? AppSpacing.lg : AppSpacing.md),
            children: [
              SectionHeader(
                title: 'Table Floor',
                subtitle: 'Visual demo — local seating assignments',
                action: AppButton(
                  label: 'Console',
                  size: AppButtonSize.sm,
                  variant: AppButtonVariant.outline,
                  icon: Icons.dashboard_customize,
                  onPressed: () => context.push(AppRoutes.queueConsole(queueId)),
                ),
              ),
              AppCard(
                child: DropdownButtonFormField<String>(
                  initialValue: queueId,
                  decoration: const InputDecoration(
                    prefixIcon: Icon(Icons.queue),
                    labelText: 'Waiting list source',
                  ),
                  items: [
                    for (final q in queues)
                      DropdownMenuItem(value: q.id, child: Text('${q.prefix} · ${q.name}')),
                  ],
                  onChanged: (v) => setState(() => _selectedQueueId = v),
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              GridView.count(
                crossAxisCount: isTablet ? 4 : 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 1.3,
                children: [
                  MetricCard(label: 'Tables', value: '${_tables.length}', icon: Icons.table_bar, accentColor: AppColors.primary),
                  MetricCard(label: 'Available', value: '$available', icon: Icons.event_available, accentColor: AppColors.success),
                  MetricCard(label: 'Occupied', value: '$occupied', icon: Icons.people, accentColor: AppColors.secondary),
                  MetricCard(label: 'Waiting', value: '${waiting.length}', icon: Icons.hourglass_top, accentColor: AppColors.accentPurple),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              const SectionHeader(title: 'Floor plan', subtitle: 'Tap an available table to seat a guest'),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  for (final table in _tables)
                    _TableCard(
                      table: table,
                      statusColor: _statusColor(table.status),
                      onTap: () {
                        switch (table.status) {
                          case TableStatus.available:
                            _assignFromWaiting(table, waiting);
                          case TableStatus.occupied:
                            _completeDining(table);
                          case TableStatus.cleaning:
                            _markAvailable(table.id);
                          case TableStatus.reserved:
                            _toggleReserved(table);
                        }
                      },
                      onLongPress: () => _toggleReserved(table),
                    ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              AppCard(
                variant: AppCardVariant.filled,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Legend', style: Theme.of(context).textTheme.titleSmall),
                    const SizedBox(height: AppSpacing.sm),
                    const Wrap(
                      spacing: 12,
                      runSpacing: 8,
                      children: [
                        _LegendDot(color: AppColors.success, label: 'Available — tap to seat'),
                        _LegendDot(color: AppColors.primary, label: 'Occupied — tap to complete dining'),
                        _LegendDot(color: AppColors.warning, label: 'Cleaning — tap when ready'),
                        _LegendDot(color: AppColors.accentPurple, label: 'Reserved — long press to toggle'),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _TableCard extends StatelessWidget {
  const _TableCard({
    required this.table,
    required this.statusColor,
    required this.onTap,
    required this.onLongPress,
  });

  final _TableState table;
  final Color statusColor;
  final VoidCallback onTap;
  final VoidCallback onLongPress;

  @override
  Widget build(BuildContext context) {
    final entry = table.assignedEntry;
    return SizedBox(
      width: 140,
      child: GestureDetector(
        onLongPress: onLongPress,
        child: AppCard(
          onTap: onTap,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.12),
                  borderRadius: AppRadius.lgAll,
                  border: Border.all(color: statusColor.withValues(alpha: 0.4), width: 2),
                ),
                child: Icon(
                  switch (table.capacity) {
                    2 => Icons.table_bar,
                    4 => Icons.table_restaurant,
                    6 => Icons.groups,
                    _ => Icons.event_seat,
                  },
                  color: statusColor,
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                table.label,
                style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
              ),
              Text('${table.capacity} seats', style: Theme.of(context).textTheme.bodySmall),
              const SizedBox(height: 4),
              StatusBadge(status: table.status.name),
              if (entry != null) ...[
                const SizedBox(height: 4),
                Text(
                  entry.displayCode,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _LegendDot extends StatelessWidget {
  const _LegendDot({required this.color, required this.label});

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 6),
        Text(label, style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}
