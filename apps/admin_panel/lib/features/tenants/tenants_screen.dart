import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../../core/network/api_error_message.dart';
import '../../core/network/platform_api_client.dart';
import '../../core/routing/app_routes.dart';
import '../../shared/widgets/admin_widgets.dart';
import '../../shared/widgets/calm/admin_calm_helpers.dart';
import '../../shared/widgets/calm/calm_business_card.dart';
import '../../shared/widgets/calm/calm_card.dart';
import '../../shared/widgets/calm/calm_empty_state.dart';
import '../../shared/widgets/calm/calm_page_scaffold.dart';
import '../../shared/widgets/calm/calm_primary_button.dart';
import '../../shared/widgets/calm/calm_search_field.dart';
import '../../shared/widgets/calm/calm_section_label.dart';
import '../../shared/widgets/calm/calm_stat_row.dart';
import '../../shared/widgets/calm/calm_status_dot.dart';

final tenantsProvider = FutureProvider.autoDispose.family((ref, ({int page, String? search, String? status}) args) async {
  final api = ref.watch(platformApiClientProvider);
  return api.listBusinesses(page: args.page, search: args.search, status: args.status);
});

class TenantsScreen extends ConsumerStatefulWidget {
  const TenantsScreen({super.key});

  @override
  ConsumerState<TenantsScreen> createState() => _TenantsScreenState();
}

class _TenantsScreenState extends ConsumerState<TenantsScreen> {
  int _page = 1;
  String _search = '';
  String? _statusFilter;
  final _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final args = (page: _page, search: _search.isEmpty ? null : _search, status: _statusFilter);
    final async = ref.watch(tenantsProvider(args));

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(AppSpacing.md, AppSpacing.md, AppSpacing.md, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Businesses', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
              const SizedBox(height: 4),
              Text('Manage QueueFlow restaurants', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.calmWarmGray)),
              const SizedBox(height: AppSpacing.md),
              CalmSearchField(
                controller: _searchCtrl,
                hint: 'Search businesses',
                onSubmitted: (v) => setState(() {
                  _search = v.trim();
                  _page = 1;
                }),
              ),
              const SizedBox(height: AppSpacing.sm),
              Wrap(
                spacing: 8,
                children: [
                  for (final f in [null, 'ACTIVE', 'INACTIVE'])
                    FilterChip(
                      label: Text(f == null ? 'All' : f == 'ACTIVE' ? 'Healthy' : 'Inactive'),
                      selected: _statusFilter == f,
                      onSelected: (_) => setState(() {
                        _statusFilter = f;
                        _page = 1;
                      }),
                    ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              CalmPrimaryButton(
                label: 'Add business',
                icon: Icons.add,
                onPressed: () => _showCreateDialog(context),
                compact: true,
              ),
            ],
          ),
        ),
        Expanded(
          child: async.when(
            loading: () => const CalmPageScaffold(isLoading: true),
            error: (e, _) => CalmPageScaffold(
              errorMessage: 'We couldn\'t load businesses.',
              onRetry: () => ref.invalidate(tenantsProvider(args)),
            ),
            data: (page) {
              if (page.items.isEmpty) {
                return const CalmEmptyState(
                  title: 'No businesses yet',
                  message: 'Businesses added to QueueFlow will appear here.',
                  icon: Icons.business_outlined,
                );
              }
              return Column(
                children: [
                  Expanded(
                    child: ListView.separated(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      itemCount: page.items.length,
                      separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
                      itemBuilder: (context, i) {
                        final b = page.items[i];
                        return CalmBusinessCard(
                          name: b.name,
                          subtitle: b.email ?? 'No email on file',
                          detail: b.slug,
                          status: calmStatusFromRaw(b.status),
                          onTap: () => context.push(AppRoutes.tenantDetail(b.id)),
                          actionLabel: 'View business',
                        );
                      },
                    ),
                  ),
                  AdminPagination(
                    page: _page,
                    totalPages: page.totalPages,
                    totalItems: page.totalItems,
                    onPrevious: _page > 1 ? () => setState(() => _page--) : null,
                    onNext: _page < page.totalPages ? () => setState(() => _page++) : null,
                  ),
                ],
              );
            },
          ),
        ),
      ],
    );
  }

  Future<void> _showCreateDialog(BuildContext context) async {
    final nameCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final slugCtrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add business'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Name')),
            const SizedBox(height: AppSpacing.sm),
            TextField(controller: slugCtrl, decoration: const InputDecoration(labelText: 'Slug')),
            const SizedBox(height: AppSpacing.sm),
            TextField(controller: emailCtrl, decoration: const InputDecoration(labelText: 'Email')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          AppButton(label: 'Create', onPressed: () => Navigator.pop(ctx, true)),
        ],
      ),
    );
    if (ok != true || !context.mounted) return;
    try {
      await ref.read(platformApiClientProvider).createBusiness({
        'name': nameCtrl.text.trim(),
        'slug': slugCtrl.text.trim(),
        'email': emailCtrl.text.trim(),
      });
      ref.invalidate(tenantsProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Business created')));
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiExceptionMessage(e))));
      }
    }
  }
}

final tenantDetailProvider = FutureProvider.autoDispose.family((ref, String id) async {
  final api = ref.watch(platformApiClientProvider);
  final business = await api.getBusiness(id);
  final branches = await api.listBranches(id);
  return (business: business, branches: branches);
});

class TenantDetailScreen extends ConsumerWidget {
  const TenantDetailScreen({super.key, required this.businessId});

  final String businessId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(tenantDetailProvider(businessId));

    return Scaffold(
      backgroundColor: AppColors.calmIvory,
      appBar: AppBar(
        backgroundColor: AppColors.calmIvory,
        elevation: 0,
        title: async.when(data: (d) => Text(d.business.name), loading: () => const Text('Business'), error: (_, __) => const Text('Business')),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            tooltip: 'View alerts',
            onPressed: () => context.push(AppRoutes.notifications),
          ),
        ],
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.calmViolet)),
        error: (_, __) => Center(
          child: CalmPrimaryButton(label: 'Try again', onPressed: () => ref.invalidate(tenantDetailProvider(businessId))),
        ),
        data: (data) {
          final b = data.business;
          final status = calmStatusFromRaw(b.status);
          final totalQueues = data.branches.fold<int>(0, (s, br) => s + br.queueCount);
          final totalStaff = data.branches.fold<int>(0, (s, br) => s + br.staffCount);

          return ListView(
            padding: const EdgeInsets.all(AppSpacing.md),
            children: [
              Text(b.name, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
              const SizedBox(height: AppSpacing.sm),
              CalmStatusDot(status: status),
              const SizedBox(height: 4),
              Text('${data.branches.length} branch${data.branches.length == 1 ? '' : 'es'}', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.calmWarmGray)),
              const SizedBox(height: AppSpacing.lg),
              const CalmSectionLabel('Overview'),
              const SizedBox(height: AppSpacing.sm),
              Row(
                children: [
                  Expanded(child: CalmStatRow(label: 'Branches', value: '${data.branches.length}')),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(child: CalmStatRow(label: 'Queues', value: '$totalQueues')),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              Row(
                children: [
                  Expanded(child: CalmStatRow(label: 'Staff', value: '$totalStaff')),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(child: CalmStatRow(label: 'Status', value: calmStatusLabel(status))),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              const CalmSectionLabel('Attention'),
              const SizedBox(height: AppSpacing.sm),
              CalmCard(
                child: Text(
                  status == CalmPlatformStatus.healthy ? 'No active issues' : 'Review business status and alerts.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.calmWarmGray),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              const CalmSectionLabel('Branches'),
              const SizedBox(height: AppSpacing.sm),
              for (final branch in data.branches)
                Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                  child: CalmCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(branch.name, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
                        Text(
                          '${branch.queueCount} queues · ${branch.staffCount} staff',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.calmWarmGray),
                        ),
                        if (branch.city != null)
                          Text(branch.city!, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.calmWarmGray)),
                      ],
                    ),
                  ),
                ),
              const SizedBox(height: AppSpacing.lg),
              const CalmSectionLabel('Account'),
              const SizedBox(height: AppSpacing.sm),
              CalmCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Email', style: Theme.of(context).textTheme.labelSmall?.copyWith(color: AppColors.calmWarmGray)),
                    Text(b.email ?? '—'),
                    const SizedBox(height: AppSpacing.sm),
                    Text('Created', style: Theme.of(context).textTheme.labelSmall?.copyWith(color: AppColors.calmWarmGray)),
                    Text(b.createdAt ?? '—'),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              Row(
                children: [
                  Expanded(
                    child: CalmPrimaryButton(
                      label: 'Deactivate',
                      variant: CalmPrimaryVariant.outline,
                      onPressed: () async {
                        await ref.read(platformApiClientProvider).deactivateBusiness(businessId);
                        ref.invalidate(tenantDetailProvider(businessId));
                      },
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: CalmPrimaryButton(
                      label: 'Delete',
                      variant: CalmPrimaryVariant.danger,
                      onPressed: () async {
                        await ref.read(platformApiClientProvider).deleteBusiness(businessId);
                        if (context.mounted) context.pop();
                      },
                    ),
                  ),
                ],
              ),
            ],
          );
        },
      ),
    );
  }
}
