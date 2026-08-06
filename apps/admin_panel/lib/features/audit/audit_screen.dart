import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../core/network/api_error_message.dart';
import '../../core/network/platform_api_client.dart';
import '../../shared/widgets/admin_widgets.dart';

final auditLogsProvider = FutureProvider.autoDispose.family((ref, ({int page, String? search}) args) async {
  final api = ref.watch(platformApiClientProvider);
  return api.listAuditLogs(page: args.page, search: args.search);
});

class AuditScreen extends ConsumerStatefulWidget {
  const AuditScreen({super.key});

  @override
  ConsumerState<AuditScreen> createState() => _AuditScreenState();
}

class _AuditScreenState extends ConsumerState<AuditScreen> {
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
    final async = ref.watch(auditLogsProvider(args));

    return Column(
      children: [
        AdminToolbar(
          children: [
            AdminSearchField(
              controller: _searchCtrl,
              label: 'Search audit logs',
              onSubmitted: (v) => setState(() {
                _search = v.trim();
                _page = 1;
              }),
            ),
          ],
        ),
        Expanded(
          child: async.when(
            loading: () => const PageLoading(),
            error: (e, _) => PageError(
              message: apiExceptionMessage(e),
              onRetry: () => ref.invalidate(auditLogsProvider(args)),
            ),
            data: (page) => Column(
              children: [
                Expanded(
                  child: ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                    itemCount: page.items.length,
                    separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
                    itemBuilder: (_, i) {
                      final log = page.items[i];
                      final timestamp = log.createdAt.length > 19
                          ? log.createdAt.substring(0, 19)
                          : log.createdAt;
                      return AdminDataCard(
                        title: log.action,
                        subtitle:
                            '${log.entityType} · ${log.businessName ?? 'Platform'} · ${log.actorEmail ?? 'system'}',
                        leading: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: AppColors.neutral100,
                            borderRadius: AppRadius.lgAll,
                          ),
                          child: const Icon(Icons.history, size: 20, color: AppColors.neutral600),
                        ),
                        trailing: Text(
                          timestamp,
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: AppColors.neutral500,
                              ),
                        ),
                      );
                    },
                  ),
                ),
                AdminPagination(
                  page: _page,
                  totalPages: page.totalPages,
                  onPrevious: _page > 1 ? () => setState(() => _page--) : null,
                  onNext: _page < page.totalPages ? () => setState(() => _page++) : null,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
