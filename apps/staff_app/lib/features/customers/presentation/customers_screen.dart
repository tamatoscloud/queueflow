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
    });
    try {
      final customer = await ref.read(businessApiClientProvider).lookupCustomer(query);
      setState(() {
        _result = customer;
        _loading = false;
        if (customer == null) _error = 'No customer found. Try phone or token.';
      });
    } catch (_) {
      setState(() {
        _loading = false;
        _error = "We couldn't find that customer. Try again.";
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          Text(
            'Customers',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: AppSpacing.md),
          AppCard(
            child: TextField(
              controller: _search,
              style: Theme.of(context).textTheme.titleMedium,
              decoration: InputDecoration(
                hintText: 'Search name, phone or token',
                border: InputBorder.none,
                prefixIcon: const Icon(Icons.search, color: AppColors.primary, size: 28),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.arrow_forward),
                  onPressed: _lookup,
                ),
              ),
              onSubmitted: (_) => _lookup(),
            ),
          ),
          if (_loading) ...[
            const SizedBox(height: AppSpacing.md),
            const LinearProgressIndicator(color: AppColors.primary),
          ],
          if (_error != null) ...[
            const SizedBox(height: AppSpacing.md),
            Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ],
          if (_result != null) ...[
            const SizedBox(height: AppSpacing.md),
            _CustomerResultCard(customer: _result!),
          ],
          if (!_loading && _result == null && _error == null) ...[
            const SizedBox(height: AppSpacing.xl),
            const EmptyStateView(
              title: 'Find a customer',
              message: 'Search by phone number to view profile and queue history.',
              icon: Icons.person_search_outlined,
            ),
          ],
        ],
      ),
    );
  }
}

class _CustomerResultCard extends StatelessWidget {
  const _CustomerResultCard({required this.customer});
  final CustomerModel customer;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              AppAvatar(name: customer.fullName, size: 52),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      customer.fullName,
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    Text(customer.phone, style: Theme.of(context).textTheme.bodyMedium),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Expanded(
                child: AppButton(
                  label: 'View',
                  icon: Icons.visibility_outlined,
                  variant: AppButtonVariant.outline,
                  onPressed: () => context.push(StaffRoutes.customerDetail(customer.id)),
                ),
              ),
            ],
          ),
        ],
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
      appBar: AppBar(title: const Text('Customer')),
      body: async.when(
        loading: () => const PageLoading(),
        error: (e, _) => PageError(
          message: "We couldn't load this customer.",
          onRetry: () => ref.invalidate(customerDetailProvider(customerId)),
        ),
        data: (data) {
          final (customer, history) = data;
          final active = history.where((h) => h.status == 'WAITING' || h.status == 'CALLED' || h.status == 'HOLDING').toList();
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
                                style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
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
                  message: 'This customer has not joined any queues yet.',
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
                                  style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
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
