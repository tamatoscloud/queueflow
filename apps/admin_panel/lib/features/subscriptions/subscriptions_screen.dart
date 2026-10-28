import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../../core/models/platform_models.dart';
import '../../core/network/api_error_message.dart';
import '../../core/network/platform_api_client.dart';
import '../../shared/feedback.dart';
import '../tenants/tenants_screen.dart' show formatDate;

final subscriptionsProvider = FutureProvider.autoDispose((ref) async {
  final api = ref.watch(platformApiClientProvider);
  final results = await Future.wait<Object>([api.listSubscriptions(), api.listPlans()]);
  return (
    subscriptions: results[0] as List<SubscriptionSummary>,
    plans: results[1] as List<Map<String, dynamic>>,
  );
});

/// Subscription states the backend accepts.
const subscriptionStatuses = [
  (value: 'TRIALING', label: 'Trial'),
  (value: 'ACTIVE', label: 'Active'),
  (value: 'PAST_DUE', label: 'Past due'),
  (value: 'CANCELLED', label: 'Cancelled'),
  (value: 'EXPIRED', label: 'Expired'),
];

Widget subscriptionStatusPill(String status) {
  final (label, bg, fg) = switch (status.toUpperCase()) {
    'ACTIVE' => ('Active', QuykColors.lime, QuykColors.green),
    'TRIALING' => ('Trial', QuykColors.limeSoft, QuykColors.green),
    'PAST_DUE' => ('Past due', QuykColors.warningTint, const Color(0xFF7A4B0C)),
    'CANCELLED' => ('Cancelled', QuykColors.dangerTint, QuykColors.danger),
    'EXPIRED' => ('Expired', QuykColors.mist, QuykColors.greenMuted),
    final other => (other, QuykColors.mist, QuykColors.greenMuted),
  };
  return QuykPill(label: label, background: bg, foreground: fg, fontSize: 11);
}

class SubscriptionsScreen extends ConsumerWidget {
  const SubscriptionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(subscriptionsProvider);
    return QuykPage(
      title: 'Plans & subscriptions',
      subtitle: 'Which plan each business is on, and its billing state.',
      onRefresh: () async => ref.invalidate(subscriptionsProvider),
      children: [
        async.when(
          loading: () => const QuykLoadingBlock(),
          error: (e, _) => QuykMessageCard(
            icon: Icons.cloud_off_rounded,
            title: 'We couldn’t load subscriptions',
            subtitle: apiExceptionMessage(e),
            actionLabel: 'Try again',
            onAction: () => ref.invalidate(subscriptionsProvider),
          ),
          data: (data) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const QuykSectionTitle('Plans on offer'),
              if (data.plans.isEmpty)
                const Text('No active plans.', style: TextStyle(color: QuykColors.muted))
              else
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    for (final p in data.plans)
                      QuykCard(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              p['name']?.toString() ?? 'Plan',
                              style: const TextStyle(fontWeight: FontWeight.w600, color: QuykColors.ink),
                            ),
                            Text(
                              [p['code'], p['tier'], p['interval']].whereType<Object>().map((e) => '$e').join(' · ').ifEmpty('—'),
                              style: const TextStyle(fontSize: 12, color: QuykColors.subtle),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              const SizedBox(height: 24),
              QuykSectionTitle('Subscriptions · ${data.subscriptions.length}'),
              if (data.subscriptions.isEmpty)
                const QuykMessageCard(
                  icon: Icons.card_membership_outlined,
                  title: 'No subscriptions yet',
                  subtitle: 'Businesses get a subscription when they sign up for a plan.',
                )
              else
                QuykTable(
                  columns: const [
                    QuykColumn('Business', flex: 4),
                    QuykColumn('Plan', flex: 3),
                    QuykColumn('Trial ends', flex: 2),
                    QuykColumn('Period ends', flex: 2),
                    QuykColumn('Status', flex: 2),
                    QuykColumn('', flex: 2, alignEnd: true),
                  ],
                  rows: [
                    for (final s in data.subscriptions)
                      [
                        QuykCellText(s.businessName ?? '—', strong: true),
                        QuykCellText(s.planName ?? '—'),
                        QuykCellText(formatDate(s.trialEndsAt)),
                        QuykCellText(formatDate(s.currentPeriodEnd)),
                        subscriptionStatusPill(s.status),
                        TextButton(
                          onPressed: () => _change(context, ref, s),
                          child: const Text('Change'),
                        ),
                      ],
                  ],
                ),
            ],
          ),
        ),
      ],
    );
  }

  Future<void> _change(BuildContext context, WidgetRef ref, SubscriptionSummary s) async {
    final picked = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 8),
              child: Text(
                'Set ${s.businessName ?? 'subscription'} to…',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: QuykColors.green),
              ),
            ),
            for (final st in subscriptionStatuses)
              ListTile(
                title: Text(st.label),
                trailing: st.value == s.status.toUpperCase() ? const Icon(Icons.check_rounded) : null,
                onTap: () => Navigator.pop(ctx, st.value),
              ),
          ],
        ),
      ),
    );
    if (picked == null || picked == s.status.toUpperCase() || !context.mounted) return;
    final label = subscriptionStatuses.firstWhere((x) => x.value == picked).label;
    final ok = await confirmAction(
      context,
      title: 'Mark as $label?',
      message: 'This is a manual override — it doesn’t charge or refund anything.',
      confirmLabel: 'Update subscription',
      destructive: picked == 'CANCELLED' || picked == 'EXPIRED',
    );
    if (!ok || !context.mounted) return;
    final done = await runWithFeedback(
      context,
      () => ref.read(platformApiClientProvider).updateSubscription(s.id, {'status': picked}),
      success: '${s.businessName ?? 'Subscription'} is now $label',
      failure: 'Couldn’t update the subscription',
    );
    if (done) ref.invalidate(subscriptionsProvider);
  }
}

extension on String {
  String ifEmpty(String fallback) => isEmpty ? fallback : this;
}
