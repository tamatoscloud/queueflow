import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';
import 'package:queueflow_widgets/queueflow_widgets.dart';

import '../../../core/models/models.dart';
import '../../../core/network/api_error_message.dart' show apiExceptionMessage;
import '../../../core/network/business_api_client.dart';
import '../../../core/routing/staff_routes.dart';
import '../../../features/queue_console/presentation/queue_console_screen.dart';
import '../../../shared/widgets/calm/calm_card.dart';

final guestsListProvider =
    FutureProvider.autoDispose.family<List<CustomerModel>, String>((ref, q) async {
  final api = ref.watch(businessApiClientProvider);
  final query = q.trim();
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

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  void _applySearch() {
    setState(() => _appliedQuery = _search.text.trim());
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(guestsListProvider(_appliedQuery));

    return ColoredBox(
      color: AppColors.calmIvory,
      child: RefreshIndicator(
        color: AppColors.primary,
        backgroundColor: Colors.white,
        onRefresh: () async {
          ref.invalidate(guestsListProvider(_appliedQuery));
          await ref.read(guestsListProvider(_appliedQuery).future);
        },
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.md),
          children: [
            Text(
              'Guests',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: AppColors.calmCharcoal,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              _appliedQuery.isEmpty
                  ? 'People currently waiting or called'
                  : 'Results for “$_appliedQuery”',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.calmWarmGray,
                  ),
            ),
            const SizedBox(height: AppSpacing.md),
            CalmCard(
              backgroundColor: Colors.white,
              child: TextField(
                controller: _search,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: AppColors.calmCharcoal,
                    ),
                cursorColor: AppColors.primary,
                textInputAction: TextInputAction.search,
                decoration: InputDecoration(
                  hintText: 'Search name, phone or ticket #',
                  hintStyle: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: AppColors.calmWarmGray,
                      ),
                  filled: true,
                  fillColor: AppColors.calmLilac.withValues(alpha: 0.35),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide.none,
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(color: AppColors.calmBorder),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
                  ),
                  prefixIcon: const Icon(
                    Icons.search,
                    color: AppColors.primary,
                    size: 28,
                  ),
                  suffixIcon: IconButton(
                    icon: const Icon(Icons.arrow_forward, color: AppColors.calmCharcoal),
                    onPressed: _applySearch,
                  ),
                ),
                onSubmitted: (_) => _applySearch(),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            async.when(
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: AppSpacing.xl),
                child: Center(
                  child: CircularProgressIndicator(color: AppColors.primary),
                ),
              ),
              error: (_, __) => PageError(
                message: "We couldn't load guests. Pull to retry.",
                onRetry: () => ref.invalidate(guestsListProvider(_appliedQuery)),
              ),
              data: (guests) {
                if (guests.isEmpty) {
                  return EmptyStateView(
                    title: _appliedQuery.isEmpty ? 'No guests in line' : 'No matches',
                    message: _appliedQuery.isEmpty
                        ? 'When someone joins the queue, they will show up here.'
                        : 'Try another name, phone number, or ticket code.',
                    icon: Icons.person_search_outlined,
                  );
                }
                return Column(
                  children: [
                    for (final guest in guests) ...[
                      _GuestCard(guest: guest),
                      const SizedBox(height: AppSpacing.sm),
                    ],
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _GuestCard extends StatelessWidget {
  const _GuestCard({required this.guest});
  final CustomerModel guest;

  @override
  Widget build(BuildContext context) {
    final subtitle = [
      if (guest.displayCode != null && guest.displayCode!.isNotEmpty) '#${guest.displayCode}',
      guest.phone,
      if (guest.queueName != null && guest.queueName!.isNotEmpty) guest.queueName!,
    ].where((s) => s.isNotEmpty).join(' · ');

    return CalmCard(
      backgroundColor: Colors.white,
      onTap: () => context.push(StaffRoutes.customerDetail(guest.id)),
      child: Row(
        children: [
          AppAvatar(name: guest.fullName, size: 48),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  guest.fullName.isEmpty ? 'Guest' : guest.fullName,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: AppColors.calmCharcoal,
                      ),
                ),
                if (subtitle.isNotEmpty)
                  Text(
                    subtitle,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppColors.calmWarmGray,
                        ),
                  ),
              ],
            ),
          ),
          if (guest.activeStatus != null && guest.activeStatus!.isNotEmpty)
            StatusBadge(status: guest.activeStatus!),
          const Icon(Icons.chevron_right, color: AppColors.calmWarmGray),
        ],
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
      final called = await ref.read(businessApiClientProvider).callNext(queueId);
      if (!mounted) return;
      ref.invalidate(customerDetailProvider(widget.customerId));
      final match = called.id == entryId;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            match
                ? 'Called — notifying guest…'
                : 'Called next guest #${called.displayCode.isEmpty ? '—' : called.displayCode}. '
                    'This guest was not next in line.',
          ),
          behavior: SnackBarBehavior.floating,
          duration: Duration(seconds: match ? 3 : 5),
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
                        value: DateFormat.jm().format(latest.joinedAt),
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
                                  h.queueName,
                                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                        fontWeight: FontWeight.w600,
                                        color: AppColors.calmCharcoal,
                                      ),
                                ),
                                Text(
                                  DateFormat.yMMMd().add_jm().format(h.joinedAt),
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
