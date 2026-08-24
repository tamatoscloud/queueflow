import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';
import 'package:queueflow_widgets/queueflow_widgets.dart';

import '../../../core/models/models.dart';
import '../../../core/network/business_api_client.dart';
import '../../../core/routing/staff_routes.dart';

final guestsListProvider = FutureProvider.autoDispose.family<List<CustomerModel>, String>((ref, q) async {
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

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(guestsListProvider(_appliedQuery));
          await ref.read(guestsListProvider(_appliedQuery).future);
        },
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.md),
          children: [
            Text(
              'Guests',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 4),
            Text(
              _appliedQuery.isEmpty
                  ? 'People currently waiting or called'
                  : 'Results for “$_appliedQuery”',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.neutral500),
            ),
            const SizedBox(height: AppSpacing.md),
            AppCard(
              child: TextField(
                controller: _search,
                style: Theme.of(context).textTheme.titleMedium,
                textInputAction: TextInputAction.search,
                decoration: InputDecoration(
                  hintText: 'Search name, phone or ticket #',
                  border: InputBorder.none,
                  prefixIcon: const Icon(Icons.search, color: AppColors.primary, size: 28),
                  suffixIcon: IconButton(
                    icon: const Icon(Icons.arrow_forward),
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
                child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
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

    return AppCard(
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
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
                if (subtitle.isNotEmpty)
                  Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
          if (guest.activeStatus != null && guest.activeStatus!.isNotEmpty)
            StatusBadge(status: guest.activeStatus!),
          const Icon(Icons.chevron_right, color: AppColors.neutral400),
        ],
      ),
    );
  }
}

final customerDetailProvider =
    FutureProvider.autoDispose.family<(CustomerModel, List<CustomerHistoryEntry>), String>((ref, id) async {
  final api = ref.watch(businessApiClientProvider);
  final customer = await api.getCustomer(id);
  final history = await api.getCustomerHistory(id);
  return (customer, history);
});

class CustomerDetailScreen extends ConsumerWidget {
  const CustomerDetailScreen({super.key, required this.customerId});
  final String customerId;

  String _primaryActionLabel(String? status) => switch (status) {
        'CALLED' => 'Seat customer',
        'HOLDING' => 'Resume',
        'WAITING' => 'Call customer',
        _ => 'View queue',
      };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(customerDetailProvider(customerId));
    return Scaffold(
      appBar: AppBar(title: const Text('Guest')),
      body: async.when(
        loading: () => const PageLoading(),
        error: (e, _) => PageError(
          message: "We couldn't load this guest.",
          onRetry: () => ref.invalidate(customerDetailProvider(customerId)),
        ),
        data: (data) {
          final (customer, history) = data;
          final active = history
              .where((h) => h.status == 'WAITING' || h.status == 'CALLED' || h.status == 'HOLDING')
              .toList();
          final latest = active.isNotEmpty ? active.first : (history.isNotEmpty ? history.first : null);

          return ListView(
            padding: const EdgeInsets.all(AppSpacing.md),
            children: [
              GlassPanel(
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
                                style: Theme.of(context)
                                    .textTheme
                                    .headlineSmall
                                    ?.copyWith(fontWeight: FontWeight.w800),
                              ),
                              Text(customer.phone, style: Theme.of(context).textTheme.bodyLarge),
                            ],
                          ),
                        ),
                      ],
                    ),
                    if (latest != null) ...[
                      const SizedBox(height: AppSpacing.lg),
                      const Divider(),
                      const SizedBox(height: AppSpacing.sm),
                      _DetailRow(label: 'Queue', value: latest.queueName),
                      if (latest.displayCode != null && latest.displayCode!.isNotEmpty)
                        _DetailRow(label: 'Ticket', value: '#${latest.displayCode}'),
                      _DetailRow(label: 'Joined', value: DateFormat.jm().format(latest.joinedAt)),
                      _DetailRow(label: 'Status', value: latest.status),
                      const SizedBox(height: AppSpacing.md),
                      AppButton(
                        label: _primaryActionLabel(latest.status),
                        icon: Icons.campaign_outlined,
                        onPressed: () => context.push(StaffRoutes.today),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              const SectionHeader(title: 'Queue history'),
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
                    child: AppCard(
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  h.queueName,
                                  style: Theme.of(context)
                                      .textTheme
                                      .titleSmall
                                      ?.copyWith(fontWeight: FontWeight.w600),
                                ),
                                Text(
                                  DateFormat.yMMMd().add_jm().format(h.joinedAt),
                                  style: Theme.of(context).textTheme.bodySmall,
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
            child: Text(label, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.neutral500)),
          ),
          Expanded(
            child: Text(value, style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }
}
