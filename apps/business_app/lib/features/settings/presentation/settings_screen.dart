import 'package:flutter/foundation.dart';
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
          const SizedBox(height: 4),
          Text(
            'Manage your restaurant, team, and guest experience',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.calmWarmGray,
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
                  subtitle: user?.email ?? '',
                ),
              ),
              CalmSettingsTile(
                icon: Icons.location_on_outlined,
                title: 'Locations',
                subtitle: 'Add or edit restaurant locations',
                onTap: () => context.push(AppRoutes.branches),
              ),
              CalmSettingsTile(
                icon: Icons.restaurant_outlined,
                title: 'Waiting lines',
                subtitle: 'Dine-in, takeaway, and drive-thru',
                onTap: () => context.push(AppRoutes.queues),
              ),
              CalmSettingsTile(
                icon: Icons.restaurant_menu_outlined,
                title: 'Guest menu',
                subtitle: 'Dishes guests browse while waiting',
                onTap: () => context.push(AppRoutes.menu),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          CalmSettingsSection(
            title: 'Team',
            children: [
              CalmSettingsTile(
                icon: Icons.badge_outlined,
                title: 'Invite team members',
                subtitle: 'Send access so hosts can serve the line',
                onTap: () => context.push(AppRoutes.staff),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          CalmSettingsSection(
            title: 'Guest experience',
            children: [
              CalmSettingsTile(
                icon: Icons.qr_code_2_outlined,
                title: 'Guest join codes',
                subtitle: 'Print or share codes for guests to scan',
                onTap: () => context.push(AppRoutes.restaurantQr),
              ),
              CalmSettingsTile(
                icon: Icons.notifications_outlined,
                title: 'Alerts',
                subtitle: 'Messages sent to guests',
                onTap: () => context.push(AppRoutes.notifications),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          CalmSettingsSection(
            title: 'Account',
            children: [
              CalmSettingsTile(
                icon: Icons.person_outline,
                title: 'Signed in as',
                subtitle: user?.email ?? '',
              ),
            ],
          ),
          if (kDebugMode) ...[
            const SizedBox(height: AppSpacing.lg),
            CalmSettingsSection(
              title: 'Testing tools',
              subtitle: 'Only visible while developing',
              children: [
                CalmSettingsTile(
                  icon: Icons.science_outlined,
                  title: 'Demo tools',
                  subtitle: 'Simulator and table layout demos',
                  onTap: () => _showDeveloperTools(context),
                ),
              ],
            ),
          ],
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
                'Demo tools',
                style: Theme.of(ctx).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                'For testing presentations only — not needed for daily service.',
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
                  subtitle: Text('Fill a demo line for testing'),
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
                  title: Text('Table layout'),
                  subtitle: Text('Dine-in seating demo'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
