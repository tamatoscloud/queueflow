import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../../core/network/api_error_message.dart';
import '../../core/network/platform_api_client.dart';
import '../../core/routing/app_routes.dart';
import '../../shared/widgets/calm/calm_attention_card.dart';
import '../../shared/widgets/calm/calm_card.dart';
import '../../shared/widgets/calm/calm_empty_state.dart';
import '../../shared/widgets/calm/calm_page_scaffold.dart';
import '../../shared/widgets/calm/calm_section_label.dart';

final notificationDashboardProvider = FutureProvider.autoDispose((ref) async {
  final api = ref.watch(platformApiClientProvider);
  final stats = await api.notificationStats();
  final failed = await api.listFailedNotifications();
  return (stats: stats, failed: failed);
});

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(notificationDashboardProvider);

    return async.when(
      loading: () => const CalmPageScaffold(isLoading: true, title: 'Alerts', subtitle: 'Platform-level issues'),
      error: (_, __) => CalmPageScaffold(
        title: 'Alerts',
        errorMessage: 'We couldn\'t load platform alerts.',
        onRetry: () => ref.invalidate(notificationDashboardProvider),
      ),
      data: (data) {
        final failed = data.failed;
        final hasCritical = failed.isNotEmpty;

        return CalmPageScaffold(
          title: 'Alerts',
          subtitle: 'Platform-level issues',
          onRefresh: () async => ref.invalidate(notificationDashboardProvider),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (hasCritical) ...[
                const CalmSectionLabel('Critical'),
                const SizedBox(height: AppSpacing.sm),
                CalmAttentionCard(
                  title: 'Notification delivery failures',
                  message: '${failed.length} message${failed.length == 1 ? '' : 's'} failed',
                  detail: 'Some customers may not receive updates.',
                  severity: CalmAttentionSeverity.critical,
                  actionLabel: 'Review below',
                  onAction: () {},
                ),
                const SizedBox(height: AppSpacing.lg),
              ],
              const CalmSectionLabel('Delivery summary'),
              const SizedBox(height: AppSpacing.sm),
              Wrap(
                spacing: AppSpacing.sm,
                runSpacing: AppSpacing.sm,
                children: [
                  for (final row in (data.stats['byStatus'] as List<dynamic>? ?? []))
                    CalmCard(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      child: Text('${row['status']}: ${row['_count']?['_all'] ?? 0}'),
                    ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              const CalmSectionLabel('Failed deliveries'),
              const SizedBox(height: AppSpacing.sm),
              if (failed.isEmpty)
                const CalmEmptyState(
                  title: 'Everything looks good',
                  message: 'No platform issues need your attention.',
                  icon: Icons.check_circle_outline,
                )
              else
                for (final n in failed)
                  Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                    child: CalmCard(
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  n['type']?.toString() ?? 'Notification',
                                  style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                                ),
                                Text(
                                  '${n['channel']} · ${n['business']?['name'] ?? 'Platform'}',
                                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.calmWarmGray),
                                ),
                                if (n['failureReason'] != null)
                                  Text(
                                    n['failureReason'].toString(),
                                    style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.calmWarmGray),
                                  ),
                              ],
                            ),
                          ),
                          AppButton(
                            label: 'Retry',
                            size: AppButtonSize.sm,
                            variant: AppButtonVariant.secondary,
                            onPressed: () async {
                              try {
                                await ref.read(platformApiClientProvider).retryNotification(n['id'] as String);
                                ref.invalidate(notificationDashboardProvider);
                              } catch (e) {
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text(apiExceptionMessage(e))),
                                  );
                                }
                              }
                            },
                          ),
                        ],
                      ),
                    ),
                  ),
            ],
          ),
        );
      },
    );
  }
}
