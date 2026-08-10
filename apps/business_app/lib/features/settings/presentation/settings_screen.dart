import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../../core/network/business_api_client.dart';
import '../../../core/routing/app_routes.dart';
import '../../../features/auth/presentation/auth_controller.dart';
import '../../../shared/widgets/calm/calm_card.dart';
import '../../../shared/widgets/calm/calm_primary_button.dart';
import '../../../shared/widgets/calm/calm_settings_section.dart';
import '../../../theme/theme_mode_provider.dart';

final businessProfileProvider = FutureProvider.autoDispose((ref) async {
  final businessId = ref.watch(currentUserProvider)?.businessId;
  if (businessId == null) return null;
  return ref.watch(businessApiClientProvider).getBusiness(businessId);
});

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final profile = ref.watch(businessProfileProvider);
    final themeMode = ref.watch(themeModeProvider);

    return Scaffold(
      backgroundColor: AppColors.calmIvory,
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          Text(
            'Settings',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: AppColors.calmCharcoal,
                ),
          ),
          const SizedBox(height: AppSpacing.lg),
          CalmSettingsSection(
            title: 'Restaurant',
            children: [
              profile.when(
                loading: () => const ListTile(
                  leading: SizedBox(
                    width: 40,
                    height: 40,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.calmViolet),
                  ),
                  title: Text('Loading restaurant details…'),
                ),
                error: (_, __) => CalmSettingsTile(
                  icon: Icons.store_outlined,
                  title: 'Restaurant details',
                  subtitle: user?.email ?? '',
                ),
                data: (business) => CalmSettingsTile(
                  icon: Icons.store_outlined,
                  title: business?['name'] as String? ?? 'Restaurant details',
                  subtitle: business?['slug'] as String? ?? user?.email ?? '',
                ),
              ),
              CalmSettingsTile(
                icon: Icons.location_on_outlined,
                title: 'Branches',
                subtitle: 'Manage your locations',
                onTap: () => context.push(AppRoutes.branches),
              ),
              CalmSettingsTile(
                icon: Icons.restaurant_outlined,
                title: 'Service modes',
                subtitle: 'Dine-in, takeaway, and drive-in queues',
                onTap: () => context.push(AppRoutes.queues),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          CalmSettingsSection(
            title: 'Team',
            children: [
              CalmSettingsTile(
                icon: Icons.badge_outlined,
                title: 'Staff',
                subtitle: 'Manage your team',
                onTap: () => context.push(AppRoutes.staff),
              ),
              const CalmSettingsTile(
                icon: Icons.mail_outline,
                title: 'Invitations',
                subtitle: 'Invite team members — coming soon',
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          CalmSettingsSection(
            title: 'Customer experience',
            children: [
              CalmSettingsTile(
                icon: Icons.notifications_outlined,
                title: 'Notifications',
                subtitle: 'SMS and customer alerts',
                onTap: () => context.push(AppRoutes.notifications),
              ),
              CalmSettingsTile(
                icon: Icons.queue_outlined,
                title: 'Queue settings',
                subtitle: 'Configure queues from the Queues screen',
                onTap: () => context.push(AppRoutes.queues),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          CalmSettingsSection(
            title: 'Account',
            children: [
              CalmSettingsTile(
                icon: Icons.person_outline,
                title: 'Profile',
                subtitle: user?.email ?? '',
              ),
              const CalmSettingsTile(
                icon: Icons.lock_outline,
                title: 'Security',
                subtitle: 'Password and sign-in — coming soon',
              ),
              const CalmSettingsTile(
                icon: Icons.credit_card_outlined,
                title: 'Subscription',
                subtitle: 'Manage your plan — coming soon',
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          CalmSettingsSection(
            title: 'Advanced',
            subtitle: 'For testing and development only',
            children: [
              CalmSettingsTile(
                icon: Icons.science_outlined,
                title: 'Developer tools',
                subtitle: 'Demo simulator and table floor',
                onTap: () => _showDeveloperTools(context),
              ),
              CalmSettingsTile(
                icon: Icons.dark_mode_outlined,
                title: 'Dark mode',
                subtitle: themeMode == ThemeMode.dark ? 'On' : 'Off',
                trailing: Switch(
                  value: themeMode == ThemeMode.dark,
                  activeThumbColor: AppColors.calmViolet,
                  onChanged: (v) {
                    ref.read(themeModeProvider.notifier).state = v ? ThemeMode.dark : ThemeMode.light;
                  },
                ),
              ),
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
          const SizedBox(height: AppSpacing.md),
        ],
      ),
    );
  }

  void _showDeveloperTools(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppColors.lightSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Developer tools',
                style: Theme.of(ctx).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                'These tools are for testing only and won\'t appear in everyday workflows.',
                style: Theme.of(ctx).textTheme.bodySmall?.copyWith(color: AppColors.calmWarmGray),
              ),
              const SizedBox(height: AppSpacing.md),
              CalmCard(
                onTap: () {
                  Navigator.pop(ctx);
                  context.push(AppRoutes.restaurantSimulator);
                },
                child: const ListTile(
                  leading: Icon(Icons.science_outlined, color: AppColors.calmViolet),
                  title: Text('Demo simulator'),
                  subtitle: Text('Populate a demo queue for testing'),
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              CalmCard(
                onTap: () {
                  Navigator.pop(ctx);
                  context.push(AppRoutes.restaurantTables);
                },
                child: const ListTile(
                  leading: Icon(Icons.table_restaurant_outlined, color: AppColors.calmViolet),
                  title: Text('Table floor'),
                  subtitle: Text('Dine-in table layout demo'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
