import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';
import 'package:queueflow_widgets/queueflow_widgets.dart';

import '../../../core/cache/cached_fetch.dart';
import '../../../core/cache/offline_cache_service.dart';
import '../../../core/models/models.dart';
import '../../../core/network/api_error_message.dart';
import '../../../core/network/business_api_client.dart';
import '../../../core/routing/app_routes.dart';
import '../../../core/session/session_providers.dart';
import '../../../features/auth/presentation/auth_controller.dart';
import '../../../shared/widgets/calm/calm_section_label.dart';
import '../../../shared/widgets/skeleton_loaders.dart';

final branchesProvider = FutureProvider.autoDispose<List<BranchModel>>((ref) async {
  final api = ref.watch(businessApiClientProvider);
  final cache = ref.watch(offlineCacheProvider);
  final businessId = ref.watch(currentUserProvider)?.businessId;
  return cachedFetchList(
    cache: cache,
    cacheKey: 'branches:${businessId ?? 'all'}',
    fetch: () => api.getBranches(businessId: businessId),
    fromJson: BranchModel.fromJson,
    toJson: (b) => b.toJson(),
  );
});

class BranchesScreen extends ConsumerWidget {
  const BranchesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(branchesProvider);
    return Scaffold(
      backgroundColor: AppColors.calmIvory,
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(branchesProvider),
        child: async.when(
          loading: () => ListView.builder(
            padding: const EdgeInsets.all(AppSpacing.md),
            itemCount: 6,
            itemBuilder: (_, __) => const ListTileSkeleton(),
          ),
          error: (e, _) => PageError(
            message: apiExceptionMessage(e),
            onRetry: () => ref.invalidate(branchesProvider),
          ),
          data: (branches) {
            if (branches.isEmpty) {
              return ListView(
                children: const [
                  SizedBox(height: 80),
                  EmptyStateView(
                    title: 'No branches',
                    message: 'Add a branch to start managing queues.',
                    icon: Icons.store_outlined,
                  ),
                ],
              );
            }
            return ListView(
              padding: const EdgeInsets.all(AppSpacing.md),
              children: [
                Row(
                  children: [
                    const Expanded(
                      child: CalmSectionLabel(
                        'My restaurants',
                        subtitle: 'Select your current branch',
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.add),
                      tooltip: 'Add branch',
                      onPressed: () => context.push(AppRoutes.branchAdd),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),
                for (final b in branches)
                  Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                    child: AppCard(
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: AppColors.calmViolet.withValues(alpha: 0.12),
                              borderRadius: AppRadius.lgAll,
                            ),
                            child: const Icon(Icons.store_outlined, color: AppColors.calmViolet),
                          ),
                          const SizedBox(width: AppSpacing.md),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  b.name,
                                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                        fontWeight: FontWeight.w600,
                                      ),
                                ),
                                if (b.city != null || b.address != null)
                                  Text(
                                    b.city ?? b.address ?? '',
                                    style: Theme.of(context).textTheme.bodySmall,
                                  ),
                              ],
                            ),
                          ),
                          PopupMenuButton<String>(
                            icon: const Icon(Icons.more_vert, color: AppColors.calmWarmGray),
                            itemBuilder: (_) => const [
                              PopupMenuItem(value: 'edit', child: Text('Edit')),
                              PopupMenuItem(value: 'switch', child: Text('Switch to branch')),
                              PopupMenuItem(value: 'delete', child: Text('Delete')),
                            ],
                            onSelected: (v) async {
                              if (v == 'edit') context.push(AppRoutes.branchEdit(b.id));
                              if (v == 'switch') {
                                ref.read(selectedBranchIdProvider.notifier).state = b.id;
                                await ref.read(sessionBootstrapProvider).saveBranchId(b.id);
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text('Switched to ${b.name}')),
                                  );
                                }
                              }
                              if (v == 'delete') {
                                await ref.read(businessApiClientProvider).deleteBranch(b.id);
                                ref.invalidate(branchesProvider);
                              }
                            },
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class BranchFormScreen extends ConsumerStatefulWidget {
  const BranchFormScreen({super.key, this.branchId});

  final String? branchId;

  @override
  ConsumerState<BranchFormScreen> createState() => _BranchFormScreenState();
}

class _BranchFormScreenState extends ConsumerState<BranchFormScreen> {
  final _name = TextEditingController();
  final _city = TextEditingController();
  final _address = TextEditingController();
  bool _loading = false;
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    if (widget.branchId != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _loadBranch());
    }
  }

  Future<void> _loadBranch() async {
    try {
      final branch = await ref.read(businessApiClientProvider).getBranch(widget.branchId!);
      if (!mounted) return;
      _name.text = branch.name;
      _city.text = branch.city ?? '';
      _address.text = branch.address ?? '';
      setState(() => _initialized = true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiExceptionMessage(e))));
      }
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _city.dispose();
    _address.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _loading = true);
    final api = ref.read(businessApiClientProvider);
    final businessId = ref.read(currentUserProvider)?.businessId;
    final body = {
      'name': _name.text.trim(),
      'city': _city.text.trim(),
      'address': _address.text.trim(),
      if (businessId != null) 'businessId': businessId,
    };
    try {
      if (widget.branchId == null) {
        await api.createBranch(body);
      } else {
        await api.updateBranch(widget.branchId!, body);
      }
      ref.invalidate(branchesProvider);
      if (mounted) context.pop();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final loadingExisting = widget.branchId != null && !_initialized;
    return Scaffold(
      appBar: AppBar(title: Text(widget.branchId == null ? 'Add branch' : 'Edit branch')),
      body: loadingExisting
          ? const PageLoading()
          : Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                children: [
                  AppCard(
                    child: Column(
                      children: [
                        TextField(controller: _name, decoration: const InputDecoration(labelText: 'Name')),
                        const SizedBox(height: AppSpacing.md),
                        TextField(controller: _city, decoration: const InputDecoration(labelText: 'City')),
                        const SizedBox(height: AppSpacing.md),
                        TextField(controller: _address, decoration: const InputDecoration(labelText: 'Address')),
                      ],
                    ),
                  ),
                  const Spacer(),
                  AppButton(
                    label: _loading ? 'Saving…' : 'Save',
                    fullWidth: true,
                    isLoading: _loading,
                    onPressed: _loading ? null : _save,
                  ),
                ],
              ),
            ),
    );
  }
}
