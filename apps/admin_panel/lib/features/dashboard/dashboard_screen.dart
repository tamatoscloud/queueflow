import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../../core/models/platform_models.dart';
import '../../core/network/api_error_message.dart';
import '../../core/network/platform_api_client.dart';
import '../../core/routing/app_routes.dart';
import '../health/health_screen.dart';

final dashboardProvider = FutureProvider.autoDispose<PlatformDashboard>((ref) async {
  return ref.watch(platformApiClientProvider).getDashboard();
});

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(dashboardProvider);
    final today = DateFormat('EEEE, d MMMM').format(DateTime.now());

    return QuykPage(
      title: 'Platform overview',
      subtitle: today,
      onRefresh: () async {
        ref
          ..invalidate(dashboardProvider)
          ..invalidate(systemHealthProvider);
      },
      action: FilledButton.icon(
        onPressed: () => context.go(AppRoutes.tenants),
        icon: const Icon(Icons.storefront_outlined, size: 18),
        label: const Text('Businesses'),
      ),
      children: [
        async.when(
          loading: () => const QuykLoadingBlock(),
          error: (e, _) => QuykMessageCard(
            icon: Icons.cloud_off_rounded,
            title: 'We couldn’t load the platform overview',
            subtitle: apiExceptionMessage(e),
            actionLabel: 'Try again',
            onAction: () => ref.invalidate(dashboardProvider),
          ),
          data: (data) => _Body(data: data),
        ),
      ],
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({required this.data});

  final PlatformDashboard data;

  @override
  Widget build(BuildContext context) {
    final k = data.kpis;
    final issues = healthIssueCount(data.systemHealth);
    final attention = <(String, String, String, String)>[
      if (k.failedNotifications > 0)
        (
          'Guest alerts failing',
          '${k.failedNotifications} message${k.failedNotifications == 1 ? '' : 's'} couldn’t be delivered.',
          'Review',
          AppRoutes.notifications,
        ),
      if (issues > 0)
        (
          'Platform services',
          '$issues service${issues == 1 ? ' needs' : 's need'} attention.',
          'View health',
          AppRoutes.health,
        ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        QuykGrid(
          minTileWidth: 200,
          children: [
            QuykStatTile(
              label: 'Businesses',
              value: '${k.businesses}',
              icon: Icons.storefront_outlined,
              hint: '${k.activeBranches} active branches',
              highlight: true,
              onTap: () => context.go(AppRoutes.tenants),
            ),
            QuykStatTile(
              label: 'Live waiting lines',
              value: '${k.activeQueues}',
              icon: Icons.format_list_numbered_rounded,
              hint: 'Open right now',
            ),
            QuykStatTile(
              label: 'Guests served today',
              value: NumberFormat.decimalPattern().format(k.customersServedToday),
              icon: Icons.check_circle_outline_rounded,
              hint: 'Across all businesses',
            ),
            QuykStatTile(
              label: 'Guest alerts sent',
              value: NumberFormat.decimalPattern().format(k.notificationsSent),
              icon: Icons.send_outlined,
              hint: k.failedNotifications > 0 ? '${k.failedNotifications} failed' : 'No failures',
              onTap: () => context.go(AppRoutes.notifications),
            ),
          ],
        ),
        const SizedBox(height: 20),
        if (attention.isEmpty)
          const QuykCard(
            padding: EdgeInsets.all(18),
            child: Row(
              children: [
                QuykIconBubble(icon: Icons.check_rounded, size: 36),
                SizedBox(width: 12),
                Text(
                  'Nothing needs your attention right now.',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: QuykColors.ink),
                ),
              ],
            ),
          )
        else
          for (final a in attention) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
              decoration: BoxDecoration(color: QuykColors.warningTint, borderRadius: BorderRadius.circular(18)),
              child: Row(
                children: [
                  const QuykIconBubble(
                    icon: Icons.priority_high_rounded,
                    background: QuykColors.warning,
                    foreground: QuykColors.ink,
                    size: 34,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(a.$1, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: QuykColors.ink)),
                        Text(a.$2, style: const TextStyle(fontSize: 13, color: QuykColors.muted)),
                      ],
                    ),
                  ),
                  TextButton(onPressed: () => context.go(a.$4), child: Text(a.$3)),
                ],
              ),
            ),
            const SizedBox(height: 10),
          ],
        const SizedBox(height: 14),
        LayoutBuilder(
          builder: (context, constraints) {
            final health = Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                QuykSectionTitle(
                  'Services',
                  trailing: TextButton(onPressed: () => context.go(AppRoutes.health), child: const Text('Details')),
                ),
                QuykCard(
                  padding: EdgeInsets.zero,
                  child: Column(
                    children: [
                      for (final (i, e) in data.systemHealth.entries.indexed) ...[
                        if (i > 0) const Divider(height: 1),
                        ListTile(
                          title: Text(serviceLabel(e.key), style: const TextStyle(fontWeight: FontWeight.w600)),
                          trailing: serviceStatePill(serviceState(e.value)),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            );
            final shortcuts = Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const QuykSectionTitle('Shortcuts'),
                QuykActionTile(
                  icon: Icons.support_agent_outlined,
                  title: 'Support requests',
                  subtitle: 'Help restaurants that are stuck',
                  onTap: () => context.go(AppRoutes.support),
                ),
                const SizedBox(height: 10),
                QuykActionTile(
                  icon: Icons.people_outline_rounded,
                  title: 'Users',
                  subtitle: 'Find accounts, suspend or reset access',
                  onTap: () => context.go(AppRoutes.users),
                ),
                const SizedBox(height: 10),
                QuykActionTile(
                  icon: Icons.insights_outlined,
                  title: 'Analytics',
                  subtitle: 'Growth, wait times and alert delivery',
                  onTap: () => context.go(AppRoutes.analytics),
                ),
                if (k.revenueMrr == null) ...[
                  const SizedBox(height: 10),
                  Text(
                    k.revenueNote ?? 'Billing isn’t connected yet, so revenue isn’t shown.',
                    style: const TextStyle(fontSize: 12, color: QuykColors.subtle),
                  ),
                ],
              ],
            );
            if (constraints.maxWidth < 820) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [health, const SizedBox(height: 24), shortcuts],
              );
            }
            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(flex: 3, child: health),
                const SizedBox(width: 20),
                Expanded(flex: 2, child: shortcuts),
              ],
            );
          },
        ),
      ],
    );
  }
}
