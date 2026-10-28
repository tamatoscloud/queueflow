import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../../../core/models/models.dart';
import '../../../core/network/business_api_client.dart';
import '../../../core/network/connection_diagnostics.dart' show apiExceptionMessage;
import '../../../core/routing/app_routes.dart';
import 'guests_view.dart';

/// Empty query: guests waiting or called now. Otherwise search all visits by
/// name, phone or ticket code.
final guestsListProvider =
    FutureProvider.autoDispose.family<List<CustomerModel>, String>((ref, query) async {
  final api = ref.watch(businessApiClientProvider);
  final q = query.trim();
  if (q.isEmpty) return api.listCustomers(activeOnly: true);
  return api.listCustomers(q: q, activeOnly: false);
});

class CustomersScreen extends ConsumerStatefulWidget {
  const CustomersScreen({super.key});

  @override
  ConsumerState<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends ConsumerState<CustomersScreen> {
  final _search = TextEditingController();
  String _query = '';
  GuestFilter _filter = GuestFilter.all;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(guestsListProvider(_query));
    return RefreshIndicator(
      color: QuykColors.green,
      backgroundColor: Colors.white,
      onRefresh: () async {
        ref.invalidate(guestsListProvider(_query));
        await ref.read(guestsListProvider(_query).future);
      },
      child: GuestsView(
        searchController: _search,
        onSearch: () => setState(() => _query = _search.text.trim()),
        filter: _filter,
        onFilter: (f) => setState(() => _filter = f),
        query: _query,
        guests: async.valueOrNull ?? const <CustomerModel>[],
        loading: async.isLoading && !async.hasValue,
        errorMessage: async.hasError && !async.hasValue
            ? 'We couldn’t load guests — ${apiExceptionMessage(async.error!)}'
            : null,
        onRetry: () => ref.invalidate(guestsListProvider(_query)),
        onOpenGuest: (g) => context.push(AppRoutes.customerDetail(g.id)),
      ),
    );
  }
}

final customerDetailProvider =
    FutureProvider.autoDispose.family<(CustomerModel, List<CustomerHistoryEntry>), String>((ref, id) async {
  final api = ref.watch(businessApiClientProvider);
  final results = await Future.wait([api.getCustomer(id), api.getCustomerHistory(id)]);
  return (results[0] as CustomerModel, results[1] as List<CustomerHistoryEntry>);
});

class CustomerDetailScreen extends ConsumerWidget {
  const CustomerDetailScreen({super.key, required this.customerId});

  final String customerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(customerDetailProvider(customerId));
    return async.when(
      loading: () => const QuykPage(title: 'Guest', back: true, children: [QuykLoadingBlock()]),
      error: (e, _) => QuykPage(
        title: 'Guest',
        back: true,
        children: [
          QuykMessageCard(
            icon: Icons.cloud_off_rounded,
            title: 'We couldn’t load this guest',
            subtitle: apiExceptionMessage(e),
            actionLabel: 'Try again',
            onAction: () => ref.invalidate(customerDetailProvider(customerId)),
          ),
        ],
      ),
      data: (data) {
        final (customer, history) = data;
        final name = customer.fullName.isEmpty ? 'Guest' : customer.fullName;
        final completed = history.where((h) => h.status.toUpperCase() == 'COMPLETED').length;
        final lastVisit = history.isEmpty
            ? null
            : history.map((h) => h.joinedAt).reduce((a, b) => a.isAfter(b) ? a : b);
        return QuykPage(
          title: name,
          subtitle: customer.phone,
          back: true,
          onRefresh: () async => ref.invalidate(customerDetailProvider(customerId)),
          children: [
            QuykGrid(
              minTileWidth: 220,
              children: [
                QuykStatTile(label: 'Visits', value: '${history.length}', icon: Icons.history_rounded, highlight: true),
                QuykStatTile(label: 'Served', value: '$completed', icon: Icons.check_circle_outline_rounded),
                QuykStatTile(
                  label: 'Last visit',
                  value: lastVisit == null ? '—' : DateFormat.MMMd().format(lastVisit.toLocal()),
                  icon: Icons.event_outlined,
                ),
              ],
            ),
            const SizedBox(height: 24),
            const QuykSectionTitle('Visit history'),
            if (history.isEmpty)
              const QuykMessageCard(
                icon: Icons.history_rounded,
                title: 'No visits yet',
                subtitle: 'This guest hasn’t joined any of your lines yet.',
              )
            else
              QuykTable(
                columns: const [
                  QuykColumn('Line', flex: 4),
                  QuykColumn('Ticket', flex: 2),
                  QuykColumn('Joined', flex: 4),
                  QuykColumn('Status', flex: 3, alignEnd: true),
                ],
                rows: [
                  for (final h in history)
                    [
                      QuykCellText(h.queueName, strong: true),
                      QuykCellText(h.displayCode ?? '—', green: true, strong: true),
                      QuykCellText(DateFormat.yMMMd().add_jm().format(h.joinedAt.toLocal())),
                      QuykStatusPill(status: h.status),
                    ],
                ],
              ),
          ],
        );
      },
    );
  }
}
