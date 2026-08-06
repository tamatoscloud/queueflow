import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../../core/models/platform_models.dart';
import '../../core/network/api_error_message.dart';
import '../../core/network/platform_api_client.dart';
import '../../shared/widgets/admin_widgets.dart';
import '../../shared/widgets/calm/admin_calm_helpers.dart';
import '../../shared/widgets/calm/calm_card.dart';
import '../../shared/widgets/calm/calm_empty_state.dart';
import '../../shared/widgets/calm/calm_page_scaffold.dart';
import '../../shared/widgets/calm/calm_primary_button.dart';
import '../../shared/widgets/calm/calm_search_field.dart';
import '../../shared/widgets/calm/calm_section_label.dart';
import '../../shared/widgets/calm/calm_status_dot.dart';

final supportTicketsProvider = FutureProvider.autoDispose((ref) async {
  return ref.watch(platformApiClientProvider).listSupportTickets();
});

class SupportScreen extends ConsumerStatefulWidget {
  const SupportScreen({super.key});

  @override
  ConsumerState<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends ConsumerState<SupportScreen> {
  final _search = TextEditingController();

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(supportTicketsProvider);
    final query = _search.text.trim().toLowerCase();

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Support', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
              const SizedBox(height: 4),
              Text('Help restaurants on the platform', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.calmWarmGray)),
              const SizedBox(height: AppSpacing.md),
              CalmSearchField(controller: _search, hint: 'Search businesses or requests', onSubmitted: (_) => setState(() {})),
            ],
          ),
        ),
        Expanded(
          child: async.when(
            loading: () => const CalmPageScaffold(isLoading: true),
            error: (_, __) => CalmPageScaffold(
              errorMessage: 'We couldn\'t load support requests.',
              onRetry: () => ref.invalidate(supportTicketsProvider),
            ),
            data: (tickets) {
              final filtered = query.isEmpty
                  ? tickets
                  : tickets.where((t) {
                      return t.subject.toLowerCase().contains(query) ||
                          (t.businessName?.toLowerCase().contains(query) ?? false);
                    }).toList();

              if (filtered.isEmpty) {
                return const CalmEmptyState(
                  title: 'No open support requests',
                  message: 'Support tickets will appear here when restaurants need help.',
                  icon: Icons.support_agent_outlined,
                );
              }

              final open = filtered.where((t) => t.status == 'OPEN').toList();
              final waiting = filtered.where((t) => t.status == 'IN_PROGRESS').toList();
              final resolved = filtered.where((t) => t.status == 'RESOLVED' || t.status == 'CLOSED').toList();

              return RefreshIndicator(
                onRefresh: () async => ref.invalidate(supportTicketsProvider),
                child: ListView(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  children: [
                    if (open.isNotEmpty) ...[_section(context, 'Open', open, ref)],
                    if (waiting.isNotEmpty) ...[_section(context, 'Waiting', waiting, ref)],
                    if (resolved.isNotEmpty) ...[_section(context, 'Resolved', resolved, ref)],
                  ],
                ),
              );
            },
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: CalmPrimaryButton(label: 'New ticket', icon: Icons.add, onPressed: () => _createTicket(context, ref)),
        ),
      ],
    );
  }

  Widget _section(BuildContext context, String title, List<SupportTicket> tickets, WidgetRef ref) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CalmSectionLabel(title),
        const SizedBox(height: AppSpacing.sm),
        for (final t in tickets)
          Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
            child: CalmCard(
              onTap: () => _updateTicket(context, ref, t.id, t.status),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(t.subject, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
                        Text(
                          t.businessName ?? 'Platform',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.calmWarmGray),
                        ),
                      ],
                    ),
                  ),
                  CalmStatusDot(status: calmStatusFromRaw(t.status), label: t.priority),
                ],
              ),
            ),
          ),
        const SizedBox(height: AppSpacing.md),
      ],
    );
  }

  Future<void> _createTicket(BuildContext context, WidgetRef ref) async {
    final subjectCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Create support ticket'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: subjectCtrl, decoration: const InputDecoration(labelText: 'Subject')),
            const SizedBox(height: AppSpacing.sm),
            TextField(controller: descCtrl, decoration: const InputDecoration(labelText: 'Description'), maxLines: 3),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          AppButton(label: 'Create', onPressed: () => Navigator.pop(ctx, true)),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ref.read(platformApiClientProvider).createSupportTicket({
        'subject': subjectCtrl.text.trim(),
        'description': descCtrl.text.trim(),
        'priority': 'MEDIUM',
      });
      ref.invalidate(supportTicketsProvider);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiExceptionMessage(e))));
      }
    }
  }

  Future<void> _updateTicket(BuildContext context, WidgetRef ref, String id, String currentStatus) async {
    const statuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    final next = statuses[(statuses.indexOf(currentStatus) + 1) % statuses.length];
    try {
      await ref.read(platformApiClientProvider).updateSupportTicket(id, {'status': next});
      ref.invalidate(supportTicketsProvider);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiExceptionMessage(e))));
      }
    }
  }
}
