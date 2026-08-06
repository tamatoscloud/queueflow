import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../core/models/platform_models.dart';
import '../../core/network/api_error_message.dart';
import '../../core/network/platform_api_client.dart';
import '../../shared/widgets/admin_widgets.dart';

final businessesForBranchesProvider = FutureProvider.autoDispose((ref) async {
  final api = ref.watch(platformApiClientProvider);
  final page = await api.listBusinesses(pageSize: 100);
  return page.items;
});

final branchesProvider = FutureProvider.autoDispose.family((ref, String? businessId) async {
  if (businessId == null) return <BranchSummary>[];
  final api = ref.watch(platformApiClientProvider);
  return api.listBranches(businessId);
});

class BranchesScreen extends ConsumerStatefulWidget {
  const BranchesScreen({super.key});

  @override
  ConsumerState<BranchesScreen> createState() => _BranchesScreenState();
}

class _BranchesScreenState extends ConsumerState<BranchesScreen> {
  String? _selectedBusinessId;

  @override
  Widget build(BuildContext context) {
    final businessesAsync = ref.watch(businessesForBranchesProvider);
    final branchesAsync = ref.watch(branchesProvider(_selectedBusinessId));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AdminToolbar(
          children: [
            SizedBox(
              width: 360,
              child: businessesAsync.when(
                loading: () => const LinearProgressIndicator(),
                error: (e, _) => Text(apiExceptionMessage(e)),
                data: (businesses) => DropdownButtonFormField<String>(
                  decoration: InputDecoration(
                    labelText: 'Select business',
                    filled: true,
                    fillColor: Theme.of(context).colorScheme.surface,
                    border: OutlineInputBorder(borderRadius: AppRadius.lgAll),
                  ),
                  value: _selectedBusinessId,
                  items: [
                    for (final b in businesses)
                      DropdownMenuItem(value: b.id, child: Text(b.name)),
                  ],
                  onChanged: (v) => setState(() => _selectedBusinessId = v),
                ),
              ),
            ),
          ],
        ),
        Expanded(
          child: _selectedBusinessId == null
              ? const AdminEmptyHint(
                  message: 'Select a business to view branches',
                  icon: Icons.store_outlined,
                )
              : branchesAsync.when(
                  loading: () => const PageLoading(),
                  error: (e, _) => PageError(
                    message: apiExceptionMessage(e),
                    onRetry: () => ref.invalidate(branchesProvider(_selectedBusinessId)),
                  ),
                  data: (branches) => ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                    itemCount: branches.length,
                    separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
                    itemBuilder: (_, i) {
                      final b = branches[i];
                      return AdminDataCard(
                        title: b.name,
                        subtitle:
                            '${b.city ?? b.code ?? ''} · ${b.queueCount} queues · ${b.staffCount} staff',
                        leading: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: AppColors.secondary.withValues(alpha: 0.1),
                            borderRadius: AppRadius.lgAll,
                          ),
                          child: const Icon(Icons.store_outlined, size: 20, color: AppColors.secondary),
                        ),
                        trailing: StatusBadge(status: b.status),
                      );
                    },
                  ),
                ),
        ),
      ],
    );
  }
}
