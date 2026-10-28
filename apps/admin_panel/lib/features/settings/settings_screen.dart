import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_shared/queueflow_shared.dart';

import '../../core/routing/app_routes.dart';
import '../auth/presentation/auth_controller.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final config = ref.watch(appConfigProvider);
    final user = ref.watch(currentUserProvider);

    Widget row(IconData icon, String title, String subtitle, {String? route}) => ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 6),
          leading: QuykIconBubble(icon: icon, size: 40),
          title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
          subtitle: Text(subtitle, style: const TextStyle(fontSize: 12.5, color: QuykColors.subtle)),
          trailing: route == null ? null : const Icon(Icons.chevron_right_rounded, color: QuykColors.subtle),
          onTap: route == null ? null : () => context.go(route),
        );

    return QuykPage(
      title: 'Settings',
      subtitle: 'Your account and this environment.',
      maxWidth: 820,
      children: [
        QuykCard(
          padding: const EdgeInsets.all(18),
          child: Row(
            children: [
              QuykAvatar(name: user?.fullName ?? '?', size: 48),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      user?.fullName ?? 'Platform admin',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: QuykColors.ink),
                    ),
                    Text(
                      '${user?.email ?? ''} · Platform admin',
                      style: const TextStyle(fontSize: 12.5, color: QuykColors.subtle),
                    ),
                  ],
                ),
              ),
              OutlinedButton.icon(
                onPressed: () async {
                  await ref.read(authControllerProvider.notifier).logout();
                  if (context.mounted) context.go(AppRoutes.login);
                },
                icon: const Icon(Icons.logout_rounded, size: 18),
                label: const Text('Sign out'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        const QuykSectionTitle('Platform'),
        QuykCard(
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              row(
                Icons.notifications_none_rounded,
                'Guest alerts',
                'Delivery across every business',
                route: AppRoutes.notifications,
              ),
              const Divider(height: 1, indent: 70),
              row(Icons.flag_outlined, 'Feature flags', 'Platform-wide toggles', route: AppRoutes.featureFlags),
              const Divider(height: 1, indent: 70),
              row(Icons.monitor_heart_outlined, 'Health', 'Service status', route: AppRoutes.health),
            ],
          ),
        ),
        const SizedBox(height: 20),
        const QuykSectionTitle('Environment'),
        QuykCard(
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              row(Icons.layers_outlined, 'Environment', config.flavor.label),
              const Divider(height: 1, indent: 70),
              row(Icons.cloud_outlined, 'API', config.apiBaseUrl),
              const Divider(height: 1, indent: 70),
              row(Icons.hub_outlined, 'Realtime', config.wsBaseUrl),
            ],
          ),
        ),
      ],
    );
  }
}
