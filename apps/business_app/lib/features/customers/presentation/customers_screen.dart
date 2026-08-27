import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../../core/models/models.dart';
import '../../../core/network/business_api_client.dart';
import '../../../core/routing/app_routes.dart';
import '../../../shared/widgets/calm/calm_card.dart';
import '../../../shared/widgets/calm/calm_customer_card.dart';
import '../../../shared/widgets/calm/calm_empty_state.dart';
import '../../../shared/widgets/calm/calm_primary_button.dart';
import '../../../shared/widgets/calm/calm_search_field.dart';
import '../../../shared/widgets/calm/calm_section_label.dart';
import '../../../shared/widgets/calm/calm_status_badge.dart';

class CustomersScreen extends ConsumerStatefulWidget {
  const CustomersScreen({super.key});

  @override
  ConsumerState<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends ConsumerState<CustomersScreen> {
  final _search = TextEditingController();
  CustomerModel? _result;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _lookup() async {
    final query = _search.text.trim();
    if (query.isEmpty) return;
    setState(() {
      _loading = true;
      _error = null;
      _result = null;
    });
    try {
      final customer = await ref.read(businessApiClientProvider).lookupCustomer(query);
      setState(() {
        _result = customer;
        _loading = false;
      });
    } catch (_) {
      setState(() {
        _loading = false;
        _error = 'We couldn’t find that guest. Try a name, phone, or ticket number.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.calmIvory,
      body: RefreshIndicator(
        onRefresh: () async {
          if (_search.text.trim().isNotEmpty) await _lookup();
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
              'Look up someone by name, phone, or ticket number',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.calmWarmGray),
            ),
            const SizedBox(height: AppSpacing.lg),
            CalmSearchField(
              controller: _search,
              hint: 'Search name, phone or ticket #',
              onSubmitted: (_) => _lookup(),
            ),
            const SizedBox(height: AppSpacing.sm),
            CalmPrimaryButton(
              label: 'Search',
              icon: Icons.search,
              isLoading: _loading,
              onPressed: _loading ? null : _lookup,
            ),
            if (_error != null) ...[
              const SizedBox(height: AppSpacing.md),
              CalmCard(
                child: Text(
                  _error!,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.calmWarmGray),
                ),
              ),
            ],
            if (_result != null) ...[
              const SizedBox(height: AppSpacing.lg),
              const CalmSectionLabel('Search result'),
              const SizedBox(height: AppSpacing.sm),
              CalmCustomerCard(
                name: _result!.fullName,
                subtitle: _result!.phone,
                detail: _result!.totalVisits > 0
                    ? '${_result!.totalVisits} visit${_result!.totalVisits == 1 ? '' : 's'}'
                    : 'First visit',
                onTap: () => context.push(AppRoutes.customerDetail(_result!.id)),
              ),
            ],
            if (!_loading && _result == null && _error == null) ...[
              const SizedBox(height: AppSpacing.xl),
              const CalmEmptyState(
                title: 'Find a customer',
                message: 'Search by name, phone number, or ticket number to see their visits.',
                icon: Icons.person_search_outlined,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

final customerDetailProvider = FutureProvider.autoDispose.family<(CustomerModel, List<CustomerHistoryEntry>), String>((ref, id) async {
  final api = ref.watch(businessApiClientProvider);
  final customer = await api.getCustomer(id);
  final history = await api.getCustomerHistory(id);
  return (customer, history);
});

class CustomerDetailScreen extends ConsumerWidget {
  const CustomerDetailScreen({super.key, required this.customerId});
  final String customerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(customerDetailProvider(customerId));
    return Scaffold(
      backgroundColor: AppColors.calmIvory,
      appBar: AppBar(
        backgroundColor: AppColors.calmIvory,
        elevation: 0,
        title: const Text('Customer'),
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.calmViolet)),
        error: (_, __) => Center(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text('We couldn\'t load this customer.'),
                const SizedBox(height: AppSpacing.md),
                CalmPrimaryButton(
                  label: 'Try again',
                  onPressed: () => ref.invalidate(customerDetailProvider(customerId)),
                ),
              ],
            ),
          ),
        ),
        data: (data) {
          final (customer, history) = data;
          return ListView(
            padding: const EdgeInsets.all(AppSpacing.md),
            children: [
              CalmCard(
                padding: const EdgeInsets.all(AppSpacing.lg),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 28,
                      backgroundColor: AppColors.calmLilac,
                      child: Text(
                        customer.fullName.isNotEmpty ? customer.fullName[0].toUpperCase() : '?',
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 22,
                          color: AppColors.calmViolet,
                        ),
                      ),
                    ),
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
                          Text(customer.phone, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.calmWarmGray)),
                          if (customer.totalVisits > 0)
                            Text(
                              '${customer.totalVisits} visit${customer.totalVisits == 1 ? '' : 's'}',
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.calmWarmGray),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              const CalmSectionLabel('Recent visits'),
              const SizedBox(height: AppSpacing.sm),
              if (history.isEmpty)
                const CalmEmptyState(
                  title: 'No visits yet',
                  message: 'This customer hasn\'t joined any of your queues yet.',
                  icon: Icons.history,
                )
              else
                ...history.map(
                  (h) => Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                    child: CalmCard(
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  h.queueName,
                                  style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                                ),
                                Text(
                                  DateFormat.yMMMd().add_jm().format(h.joinedAt),
                                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.calmWarmGray),
                                ),
                              ],
                            ),
                          ),
                          CalmStatusBadge(
                            label: calmStatusLabel(h.status, 'DINE_IN'),
                            status: calmStatusFromEntry(h.status),
                          ),
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
