import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';
import 'package:queueflow_widgets/queueflow_widgets.dart';

import '../../../core/models/models.dart';
import '../../../core/network/api_error_message.dart' show apiExceptionMessage;
import '../../../core/network/business_api_client.dart';
import '../../../core/routing/staff_routes.dart';
import '../../../features/queue_console/presentation/queue_console_screen.dart';
import '../../../shared/widgets/calm/calm_card.dart';
import '../guest_history_display.dart';
import 'guests_view.dart';

final guestsListProvider =
    FutureProvider.autoDispose.family<List<CustomerModel>, String>((ref, q) async {
  final api = ref.watch(businessApiClientProvider);
  final query = normalizeGuestSearch(q);
  if (query.isEmpty) {
    return api.listCustomers(activeOnly: true);
  }
  // Prefer list search (supports partial matches); fall back to single lookup.
  final listed = await api.listCustomers(q: query, activeOnly: false);
  if (listed.isNotEmpty) return listed;
  final one = await api.lookupCustomer(query);
  return one == null ? const <CustomerModel>[] : [one];
});

class CustomersScreen extends ConsumerStatefulWidget {
  const CustomersScreen({super.key});

  @override
  ConsumerState<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends ConsumerState<CustomersScreen> {
  final _search = TextEditingController();
  String _appliedQuery = '';
  GuestFilter _filter = GuestFilter.all;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  void _applySearch() {
    setState(() => _appliedQuery = normalizeGuestSearch(_search.text));
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(guestsListProvider(_appliedQuery));

    return RefreshIndicator(
      color: QuykColors.green,
      backgroundColor: Colors.white,
      onRefresh: () async {
        ref.invalidate(guestsListProvider(_appliedQuery));
        await ref.read(guestsListProvider(_appliedQuery).future);
      },
      child: GuestsView(
        searchController: _search,
        onSearch: _applySearch,
        filter: _filter,
        onFilter: (f) => setState(() => _filter = f),
        query: _appliedQuery,
        guests: async.valueOrNull ?? const <CustomerModel>[],
        loading: async.isLoading && !async.hasValue,
        errorMessage: async.hasError && !async.hasValue
            ? "We couldn't load guests. Pull to retry."
            : null,
        onRetry: () => ref.invalidate(guestsListProvider(_appliedQuery)),
        onOpenGuest: (g) => context.push(StaffRoutes.customerDetail(g.id)),
      ),
    );
  }
}


final customerDetailProvider = FutureProvider.autoDispose
    .family<(CustomerModel, List<CustomerHistoryEntry>), String>((ref, id) async {
  final api = ref.watch(businessApiClientProvider);
  final customer = await api.getCustomer(id);
  final history = await api.getCustomerHistory(id);
  return (customer, history);
});

class CustomerDetailScreen extends ConsumerStatefulWidget {
  const CustomerDetailScreen({super.key, required this.customerId});
  final String customerId;

  @override
  ConsumerState<CustomerDetailScreen> createState() => _CustomerDetailScreenState();
}

class _CustomerDetailScreenState extends ConsumerState<CustomerDetailScreen> {
  bool _busy = false;

  Future<void> _runAction({
    required String queueId,
    required String entryId,
    required String action,
  }) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      final ok = await entryAction(
        ref,
        queueId,
        entryId,
        action,
        () async {
          ref.invalidate(customerDetailProvider(widget.customerId));
        },
      );
      if (!mounted) return;
      if (ok) {
        final label = switch (action) {
          'complete' => 'Guest seated',
          'hold' => 'Guest on hold',
          'recall' => 'Called again — notifying guest…',
          'resume' => 'Guest returned to waiting',
          _ => 'Updated',
        };
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(label), behavior: SnackBarBehavior.floating),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(apiExceptionMessage(e))),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _callNextForWaiting({
    required String queueId,
    required String entryId,
  }) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      final api = ref.read(businessApiClientProvider);
      // Never call the wrong person — verify this guest is next before callNext.
      final snapshot = await api.getQueueSnapshot(queueId);
      final alreadyCalled = snapshot.currentCalled;
      if (alreadyCalled != null) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Finish #${alreadyCalled.displayCode.isEmpty ? '—' : alreadyCalled.displayCode} '
              '(${alreadyCalled.customerName ?? 'guest'}) first — Seat / Hold / No-show.',
            ),
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 4),
          ),
        );
        return;
      }
      final waiting = snapshot.entries.where((e) => e.status == 'WAITING').toList()
        ..sort((a, b) => (a.position ?? 999).compareTo(b.position ?? 999));
      final next = waiting.isEmpty ? null : waiting.first;
      if (next == null || next.id != entryId) {
        if (!mounted) return;
        final nextLabel = next == null
            ? 'No one is waiting.'
            : 'Next up is #${next.displayCode.isEmpty ? '—' : next.displayCode} '
                '(${next.customerName ?? 'guest'}). Open the queue board to call in order.';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(nextLabel),
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 4),
          ),
        );
        return;
      }
      final called = await api.callNext(queueId);
      if (!mounted) return;
      ref.invalidate(customerDetailProvider(widget.customerId));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            called.id == entryId
                ? 'Called — notifying guest…'
                : 'Called #${called.displayCode.isEmpty ? '—' : called.displayCode}. '
                    'Queue order changed — refresh and try again.',
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(apiExceptionMessage(e))),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(customerDetailProvider(widget.customerId));
    return Scaffold(
      backgroundColor: AppColors.calmIvory,
      appBar: AppBar(
        backgroundColor: AppColors.calmIvory,
        surfaceTintColor: Colors.transparent,
        foregroundColor: AppColors.calmCharcoal,
        title: Text(
          'Guest',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w800,
                color: AppColors.calmCharcoal,
              ),
        ),
      ),
      body: async.when(
        loading: () => const PageLoading(),
        error: (e, _) => PageError(
          message: "We couldn't load this guest.",
          onRetry: () => ref.invalidate(customerDetailProvider(widget.customerId)),
        ),
        data: (data) {
          final (customer, history) = data;
          final active = history
              .where((h) =>
                  h.status == 'WAITING' || h.status == 'CALLED' || h.status == 'HOLDING')
              .toList();
          final latest = active.isNotEmpty
              ? active.first
              : (history.isNotEmpty ? history.first : null);
          final canAct = latest != null &&
              latest.queueId != null &&
              latest.queueId!.isNotEmpty &&
              (latest.status == 'WAITING' ||
                  latest.status == 'CALLED' ||
                  latest.status == 'HOLDING');

          return ListView(
            padding: const EdgeInsets.all(AppSpacing.md),
            children: [
              CalmCard(
                backgroundColor: Colors.white,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        AppAvatar(name: customer.fullName, size: 56),
                        const SizedBox(width: AppSpacing.md),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                customer.fullName,
                                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                      fontWeight: FontWeight.w800,
                                      color: AppColors.calmCharcoal,
                                    ),
                              ),
                              Text(
                                customer.phone,
                                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                      color: AppColors.calmWarmGray,
                                    ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    if (latest != null) ...[
                      const SizedBox(height: AppSpacing.lg),
                      const Divider(color: AppColors.calmBorder),
                      const SizedBox(height: AppSpacing.sm),
                      _DetailRow(label: 'Queue', value: latest.queueName),
                      if (latest.displayCode != null && latest.displayCode!.isNotEmpty)
                        _DetailRow(label: 'Ticket', value: '#${latest.displayCode}'),
                      _DetailRow(
                        label: 'Joined',
                        value: formatGuestVisitWhen(latest.joinedAt),
                      ),
                      _DetailRow(label: 'Status', value: latest.status),
                      const SizedBox(height: AppSpacing.md),
                      if (canAct) ...[
                        Wrap(
                          spacing: AppSpacing.sm,
                          runSpacing: AppSpacing.sm,
                          children: [
                            if (latest.status == 'WAITING')
                              FilledButton.icon(
                                onPressed: _busy
                                    ? null
                                    : () => _callNextForWaiting(
                                          queueId: latest.queueId!,
                                          entryId: latest.entryId,
                                        ),
                                icon: const Icon(Icons.campaign_outlined, size: 18),
                                label: const Text('Call'),
                              ),
                            if (latest.status == 'CALLED') ...[
                              FilledButton.icon(
                                onPressed: _busy
                                    ? null
                                    : () => _runAction(
                                          queueId: latest.queueId!,
                                          entryId: latest.entryId,
                                          action: 'complete',
                                        ),
                                icon: const Icon(Icons.event_seat_outlined, size: 18),
                                label: const Text('Seat'),
                              ),
                              OutlinedButton.icon(
                                onPressed: _busy
                                    ? null
                                    : () => _runAction(
                                          queueId: latest.queueId!,
                                          entryId: latest.entryId,
                                          action: 'recall',
                                        ),
                                icon: const Icon(Icons.campaign_outlined, size: 18),
                                label: const Text('Call again'),
                              ),
                            ],
                            if (latest.status == 'WAITING' || latest.status == 'CALLED')
                              OutlinedButton.icon(
                                onPressed: _busy
                                    ? null
                                    : () => _runAction(
                                          queueId: latest.queueId!,
                                          entryId: latest.entryId,
                                          action: 'hold',
                                        ),
                                icon: const Icon(Icons.pause_circle_outline, size: 18),
                                label: const Text('Hold'),
                              ),
                            if (latest.status == 'HOLDING')
                              FilledButton.icon(
                                onPressed: _busy
                                    ? null
                                    : () => _runAction(
                                          queueId: latest.queueId!,
                                          entryId: latest.entryId,
                                          action: 'resume',
                                        ),
                                icon: const Icon(Icons.play_arrow_rounded, size: 18),
                                label: const Text('Resume'),
                              ),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.sm),
                      ],
                      TextButton.icon(
                        onPressed: latest.queueId != null && latest.queueId!.isNotEmpty
                            ? () => context.push(StaffRoutes.queueConsole(latest.queueId!))
                            : () => context.go(StaffRoutes.today),
                        icon: const Icon(Icons.open_in_new, size: 18),
                        label: Text(
                          latest.queueId != null && latest.queueId!.isNotEmpty
                              ? 'Open queue board'
                              : 'Open Live Queue',
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              Text(
                'Queue history',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: AppColors.calmCharcoal,
                    ),
              ),
              const SizedBox(height: AppSpacing.sm),
              if (history.isEmpty)
                const EmptyStateView(
                  title: 'No history',
                  message: 'This guest has not joined any queues yet.',
                  icon: Icons.history,
                )
              else
                ...history.map(
                  (h) => Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                    child: CalmCard(
                      backgroundColor: Colors.white,
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  guestHistoryHeadline(h.queueName, h.displayCode),
                                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                        fontWeight: FontWeight.w600,
                                        color: AppColors.calmCharcoal,
                                      ),
                                ),
                                Text(
                                  formatGuestVisitWhen(h.joinedAt),
                                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                        color: AppColors.calmWarmGray,
                                      ),
                                ),
                              ],
                            ),
                          ),
                          StatusBadge(status: h.status),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.calmWarmGray,
                  ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: AppColors.calmCharcoal,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}
