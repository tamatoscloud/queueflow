import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../core/network/platform_api_client.dart';
import '../../shared/widgets/admin_widgets.dart';
import '../../shared/widgets/calm/calm_card.dart';
import '../../shared/widgets/calm/calm_empty_state.dart';
import '../../shared/widgets/calm/calm_page_scaffold.dart';
import '../../shared/widgets/calm/calm_search_field.dart';
import '../../shared/widgets/calm/calm_section_label.dart';

final activityLogsProvider = FutureProvider.autoDispose.family((ref, ({int page, String? search}) args) async {
  return ref.watch(platformApiClientProvider).listAuditLogs(page: args.page, search: args.search);
});

/// Activity timeline — uses audit logs API (no dedicated /platform/activity endpoint).
class ActivityScreen extends ConsumerStatefulWidget {
  const ActivityScreen({super.key});

  @override
  ConsumerState<ActivityScreen> createState() => _ActivityScreenState();
}

class _ActivityScreenState extends ConsumerState<ActivityScreen> {
  int _page = 1;
  String _search = '';
  final _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final args = (page: _page, search: _search.isEmpty ? null : _search);
    final async = ref.watch(activityLogsProvider(args));

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: CalmSearchField(
            controller: _searchCtrl,
            hint: 'Search activity',
            onSubmitted: (v) => setState(() {
              _search = v.trim();
              _page = 1;
            }),
          ),
        ),
        Expanded(
          child: async.when(
            loading: () => const CalmPageScaffold(isLoading: true, title: 'Activity'),
            error: (_, __) => CalmPageScaffold(
              title: 'Activity',
              errorMessage: 'We couldn\'t load recent activity.',
              onRetry: () => ref.invalidate(activityLogsProvider(args)),
            ),
            data: (page) {
              if (page.items.isEmpty) {
                return const CalmEmptyState(
                  title: 'No recent activity',
                  message: 'Platform events will appear here as they happen.',
                  icon: Icons.timeline_outlined,
                );
              }

              return Column(
                children: [
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      children: [
                        const CalmSectionLabel('Recent events'),
                        const SizedBox(height: AppSpacing.sm),
                        for (final log in page.items)
                          Padding(
                            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                            child: CalmCard(
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  SizedBox(
                                    width: 56,
                                    child: Text(
                                      _timeLabel(log.createdAt),
                                      style: Theme.of(context).textTheme.labelSmall?.copyWith(color: AppColors.calmWarmGray),
                                    ),
                                  ),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          log.businessName ?? 'Platform',
                                          style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                                        ),
                                        Text(
                                          '${_humanAction(log.action)} · ${log.entityType}',
                                          style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.calmWarmGray),
                                        ),
                                        if (log.actorEmail != null)
                                          Text(
                                            log.actorEmail!,
                                            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.calmWarmGray),
                                          ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  AdminPagination(
                    page: _page,
                    totalPages: page.totalPages,
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

  String _timeLabel(String raw) {
    if (raw.length >= 16) return raw.substring(11, 16);
    return raw;
  }

  String _humanAction(String action) => action.replaceAll('_', ' ').toLowerCase();
}
