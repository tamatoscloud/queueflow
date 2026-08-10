import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_shared/queueflow_shared.dart';

import '../../core/routing/app_routes.dart';
import '../../shared/widgets/calm/calm_card.dart';
import '../../shared/widgets/calm/calm_primary_button.dart';
import '../../shared/widgets/calm/calm_section_label.dart';
import '../auth/presentation/auth_controller.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final config = ref.watch(appConfigProvider);
    final user = ref.watch(currentUserProvider);

    return ListView(
      padding: const EdgeInsets.all(AppSpacing.md),
      children: [
        Text('Settings', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
        const SizedBox(height: AppSpacing.lg),
        CalmSettingsSection(
          title: 'Account',
          children: [
            CalmSettingsTile(icon: Icons.person_outline, title: 'Profile', subtitle: user?.email ?? '—'),
            const CalmSettingsTile(icon: Icons.lock_outline, title: 'Security', subtitle: 'JWT session with refresh token'),
          ],
        ),
        const SizedBox(height: AppSpacing.lg),
        CalmSettingsSection(
          title: 'Platform',
          children: [
            CalmSettingsTile(
              icon: Icons.notifications_outlined,
              title: 'Notifications',
              subtitle: 'Delivery monitoring',
              onTap: () => context.push(AppRoutes.notifications),
            ),
            CalmSettingsTile(
              icon: Icons.flag_outlined,
              title: 'Feature flags',
              subtitle: 'Global platform toggles',
              onTap: () => context.push(AppRoutes.featureFlags),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.lg),
        CalmSettingsSection(
          title: 'Advanced',
          subtitle: 'Technical configuration',
          children: [
            CalmSettingsTile(icon: Icons.cloud_outlined, title: 'API base URL', subtitle: config.apiBaseUrl),
            CalmSettingsTile(icon: Icons.hub_outlined, title: 'WebSocket URL', subtitle: config.wsBaseUrl),
            CalmSettingsTile(icon: Icons.layers_outlined, title: 'Environment', subtitle: config.flavor.label),
          ],
        ),
        const SizedBox(height: AppSpacing.xl),
        CalmPrimaryButton(
          label: 'Sign out',
          icon: Icons.logout,
          variant: CalmPrimaryVariant.danger,
          onPressed: () async {
            await ref.read(authControllerProvider.notifier).logout();
            if (context.mounted) context.go(AppRoutes.login);
          },
        ),
      ],
    );
  }
}

// Settings section widgets (admin-local, calm-styled)
class CalmSettingsSection extends StatelessWidget {
  const CalmSettingsSection({required this.title, required this.children, super.key, this.subtitle});

  final String title;
  final String? subtitle;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CalmSectionLabel(title, subtitle: subtitle),
        const SizedBox(height: AppSpacing.sm),
        CalmCard(
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              for (var i = 0; i < children.length; i++) ...[
                if (i > 0) const Divider(height: 1, color: AppColors.calmBorder),
                children[i],
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class CalmSettingsTile extends StatelessWidget {
  const CalmSettingsTile({
    required this.icon,
    required this.title,
    super.key,
    this.subtitle,
    this.onTap,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      onTap: onTap,
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(color: AppColors.calmLilac, borderRadius: BorderRadius.circular(12)),
        child: Icon(icon, color: AppColors.calmViolet, size: 20),
      ),
      title: Text(title, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
      subtitle: subtitle != null ? Text(subtitle!) : null,
      trailing: onTap != null ? const Icon(Icons.chevron_right, color: AppColors.calmWarmGray) : null,
    );
  }
}
