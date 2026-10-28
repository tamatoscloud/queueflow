import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../../core/models/platform_models.dart';
import '../../core/network/api_error_message.dart';
import '../../core/network/platform_api_client.dart';
import '../../core/routing/app_routes.dart';
import '../tenants/tenants_screen.dart' show businessStatusPill;

/// Businesses matching a search (server-side, so it isn't capped at 100).
final branchBusinessSearchProvider =
    FutureProvider.autoDispose.family<List<BusinessSummary>, String>((ref, query) async {
  final api = ref.watch(platformApiClientProvider);
  final page = await api.listBusinesses(pageSize: 12, search: query.isEmpty ? null : query);
  return page.items;
});

final branchesProvider = FutureProvider.autoDispose.family<List<BranchSummary>, String>((ref, businessId) async {
  return ref.watch(platformApiClientProvider).listBranches(businessId);
});

class BranchesScreen extends ConsumerStatefulWidget {
  const BranchesScreen({super.key});

  @override
  ConsumerState<BranchesScreen> createState() => _BranchesScreenState();
}

class _BranchesScreenState extends ConsumerState<BranchesScreen> {
  final _search = TextEditingController();
  String _query = '';
  BusinessSummary? _selected;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final businesses = ref.watch(branchBusinessSearchProvider(_query));
    final selected = _selected;
    return QuykPage(
      title: 'Branches',
      subtitle: 'Pick a business to see its locations.',
      children: [
        QuykSearchField(
          controller: _search,
          hint: 'Find a business',
          onSubmitted: (v) => setState(() => _query = v.trim()),
          trailing: FilledButton(
            onPressed: () => setState(() => _query = _search.text.trim()),
            child: const Text('Search'),
          ),
        ),
        const SizedBox(height: 14),
        businesses.when(
          loading: () => const LinearProgressIndicator(),
          error: (e, _) => Text(apiExceptionMessage(e), style: const TextStyle(color: QuykColors.danger)),
          data: (list) => list.isEmpty
              ? const Text('No businesses match.', style: TextStyle(color: QuykColors.muted))
              : Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final b in list)
                      QuykFilterChip(
                        label: b.name,
                        selected: selected?.id == b.id,
                        onTap: () => setState(() => _selected = b),
                      ),
                  ],
                ),
        ),
        const SizedBox(height: 20),
        if (selected == null)
          const QuykMessageCard(
            icon: Icons.location_on_outlined,
            title: 'Choose a business',
            subtitle: 'Its branches, lines and team sizes show here.',
          )
        else
          _BranchList(business: selected),
      ],
    );
  }
}

class _BranchList extends ConsumerWidget {
  const _BranchList({required this.business});

  final BusinessSummary business;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(branchesProvider(business.id));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        QuykSectionTitle(
          business.name,
          trailing: TextButton(
            onPressed: () => context.go(AppRoutes.tenantDetail(business.id)),
            child: const Text('Open business'),
          ),
        ),
        async.when(
          loading: () => const QuykLoadingBlock(height: 140),
          error: (e, _) => QuykMessageCard(
            icon: Icons.cloud_off_rounded,
            title: 'We couldn’t load branches',
            subtitle: apiExceptionMessage(e),
            actionLabel: 'Try again',
            onAction: () => ref.invalidate(branchesProvider(business.id)),
          ),
          data: (branches) => branches.isEmpty
              ? const QuykMessageCard(
                  icon: Icons.location_off_outlined,
                  title: 'No branches yet',
                  subtitle: 'This business hasn’t added a location.',
                )
              : QuykTable(
                  columns: const [
                    QuykColumn('Branch', flex: 4),
                    QuykColumn('Code', flex: 2),
                    QuykColumn('City', flex: 3),
                    QuykColumn('Lines', flex: 1),
                    QuykColumn('Team', flex: 1),
                    QuykColumn('Status', flex: 2, alignEnd: true),
                  ],
                  rows: [
                    for (final b in branches)
                      [
                        QuykCellText(b.name, strong: true),
                        QuykCellText(b.code ?? '—', green: true, strong: true),
                        QuykCellText(b.city ?? '—'),
                        QuykCellText('${b.queueCount}'),
                        QuykCellText('${b.staffCount}'),
                        businessStatusPill(b.status),
                      ],
                  ],
                ),
        ),
      ],
    );
  }
}
