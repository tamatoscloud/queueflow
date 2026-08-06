import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../../core/network/api_error_message.dart';
import '../../core/network/platform_api_client.dart';
import '../../shared/widgets/admin_widgets.dart';

final subscriptionsProvider = FutureProvider.autoDispose((ref) async {
  final api = ref.watch(platformApiClientProvider);
  final subs = await api.listSubscriptions();
  final plans = await api.listPlans();
  return (subscriptions: subs, plans: plans);
});

class SubscriptionsScreen extends ConsumerWidget {
  const SubscriptionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(subscriptionsProvider);
    final dateFmt = DateFormat.yMMMd();

    return async.when(
      loading: () => const PageLoading(),
      error: (e, _) => PageError(
        message: apiExceptionMessage(e),
        onRetry: () => ref.invalidate(subscriptionsProvider),
      ),
      data: (data) => ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          const SectionHeader(title: 'Plans', subtitle: 'Available subscription tiers'),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: [
              for (final plan in data.plans)
                AppBadge(
                  label: '${plan['name']} — ${plan['code']}',
                  variant: AppBadgeVariant.primary,
                ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          const SectionHeader(title: 'Subscriptions', subtitle: 'Active tenant subscriptions'),
          const SizedBox(height: AppSpacing.sm),
          for (final sub in data.subscriptions)
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: AdminDataCard(
                title: sub.businessName ?? sub.id,
                subtitle:
                    'Plan: ${sub.planName ?? '—'} · Trial: ${_fmt(sub.trialEndsAt, dateFmt)} · '
                    'Period end: ${_fmt(sub.currentPeriodEnd, dateFmt)}',
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.accentPurple.withValues(alpha: 0.1),
                    borderRadius: AppRadius.lgAll,
                  ),
                  child: const Icon(Icons.card_membership_outlined, size: 20, color: AppColors.accentPurple),
                ),
                trailing: StatusBadge(status: sub.status),
                onTap: () => _showOverrideDialog(context, ref, sub.id),
              ),
            ),
        ],
      ),
    );
  }

  String _fmt(String? iso, DateFormat fmt) {
    if (iso == null) return '—';
    try {
      return fmt.format(DateTime.parse(iso));
    } catch (_) {
      return iso;
    }
  }

  Future<void> _showOverrideDialog(BuildContext context, WidgetRef ref, String id) async {
    final statusCtrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: AppRadius.xlAll),
        title: const Text('Manual override'),
        content: TextField(
          controller: statusCtrl,
          decoration: const InputDecoration(
            labelText: 'Status (e.g. ACTIVE, TRIALING, CANCELLED)',
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          AppButton(label: 'Save', onPressed: () => Navigator.pop(ctx, true)),
        ],
      ),
    );
    if (ok != true || statusCtrl.text.trim().isEmpty) return;
    try {
      await ref.read(platformApiClientProvider).updateSubscription(id, {
        'status': statusCtrl.text.trim(),
      });
      ref.invalidate(subscriptionsProvider);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiExceptionMessage(e))));
      }
    }
  }
}
