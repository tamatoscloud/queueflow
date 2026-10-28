import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../../core/network/api_error_message.dart';
import '../../core/network/platform_api_client.dart';
import '../../shared/widgets/admin_pager.dart';
import '../tenants/tenants_screen.dart' show formatDate;

final auditLogsProvider = FutureProvider.autoDispose.family((ref, ({int page, String? search}) args) async {
  final api = ref.watch(platformApiClientProvider);
  return api.listAuditLogs(page: args.page, search: args.search);
});

/// "business.update" / "STAFF_INVITED" → "Business update" / "Staff invited".
String friendlyAction(String raw) {
  final words = raw.replaceAll(RegExp(r'[._:-]+'), ' ').trim().toLowerCase();
  return words.isEmpty ? 'Event' : '${words[0].toUpperCase()}${words.substring(1)}';
}

/// Audit log and recent activity (the old Activity page showed the same
/// data, so they're one screen now).
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

  void _apply() => setState(() {
        _search = _searchCtrl.text.trim();
        _page = 1;
      });

  @override
  Widget build(BuildContext context) {
    final args = (page: _page, search: _search.isEmpty ? null : _search);
    final async = ref.watch(auditLogsProvider(args));
    return QuykPage(
      title: 'Audit log',
      subtitle: 'Who changed what, across the platform. Times are in your time zone.',
      onRefresh: () async => ref.invalidate(auditLogsProvider(args)),
      children: [
        QuykSearchField(
          controller: _searchCtrl,
          hint: 'Search actions, people or businesses',
          onSubmitted: (_) => _apply(),
          trailing: FilledButton(onPressed: _apply, child: const Text('Search')),
        ),
        const SizedBox(height: 16),
        async.when(
          loading: () => const QuykLoadingBlock(),
          error: (e, _) => QuykMessageCard(
            icon: Icons.cloud_off_rounded,
            title: 'We couldn’t load the audit log',
            subtitle: apiExceptionMessage(e),
            actionLabel: 'Try again',
            onAction: () => ref.invalidate(auditLogsProvider(args)),
          ),
          data: (page) {
            if (page.items.isEmpty) {
              return QuykMessageCard(
                icon: Icons.history_rounded,
                title: _search.isEmpty ? 'No activity yet' : 'Nothing matches “$_search”',
                subtitle: _search.isEmpty ? 'Changes made on the platform are recorded here.' : 'Try a different search.',
              );
            }
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                QuykTable(
                  columns: const [
                    QuykColumn('When', flex: 3),
                    QuykColumn('Action', flex: 4),
                    QuykColumn('Record', flex: 2),
                    QuykColumn('Business', flex: 3),
                    QuykColumn('By', flex: 4),
                  ],
                  rows: [
                    for (final log in page.items)
                      [
                        QuykCellText(formatDate(log.createdAt, time: true)),
                        QuykCellText(friendlyAction(log.action), strong: true),
                        QuykCellText(friendlyAction(log.entityType)),
                        QuykCellText(log.businessName ?? 'Platform'),
                        QuykCellText(log.actorEmail ?? 'System'),
                      ],
                  ],
                ),
                const SizedBox(height: 12),
                AdminPager(
                  page: _page,
                  totalPages: page.totalPages,
                  totalItems: page.totalItems,
                  onPage: (p) => setState(() => _page = p),
                ),
              ],
            );
          },
        ),
      ],
    );
  }
}
