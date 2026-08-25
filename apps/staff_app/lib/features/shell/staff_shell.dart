import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../core/providers/branches_provider.dart';
import '../../core/routing/staff_routes.dart';
import '../../core/session/session_providers.dart';
import '../../features/auth/presentation/auth_controller.dart';
import '../../shared/widgets/common_widgets.dart';
import '../../shared/widgets/offline_banner.dart';
import '../../shared/widgets/staff/staff_content_width.dart';

class StaffShell extends ConsumerWidget {
  const StaffShell({super.key, required this.child});

  final Widget child;

  static const _destinations = [
    (icon: Icons.campaign_outlined, label: 'Live Queue', route: StaffRoutes.today),
    (icon: Icons.people_outline, label: 'Guests', route: StaffRoutes.customers),
    (icon: Icons.star_outline, label: 'Reviews', route: StaffRoutes.reviews),
    (icon: Icons.notifications_outlined, label: 'Alerts', route: StaffRoutes.notifications),
    (icon: Icons.person_outline, label: 'Profile', route: StaffRoutes.profile),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = GoRouterState.of(context).uri.path;
    final product = context.productTheme;
    final selected = _indexFor(location);
    final branchesAsync = ref.watch(branchesProvider);
    final selectedBranchId = ref.watch(selectedBranchIdProvider);

    return Scaffold(
      backgroundColor: AppColors.calmIvory,
      appBar: AppBar(
        backgroundColor: AppColors.calmIvory,
        surfaceTintColor: Colors.transparent,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                gradient: product.gradient,
                borderRadius: AppRadius.mdAll,
              ),
              child: const Icon(Icons.bolt, color: Colors.white, size: 22),
            ),
            const SizedBox(width: 12),
            Text(
              'Staff',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: AppColors.calmCharcoal,
                  ),
            ),
          ],
        ),
        actions: [
          branchesAsync.when(
            data: (branches) => BranchSwitcher(
              branches: branches.map((b) => (id: b.id, name: b.name)).toList(),
              selectedId: selectedBranchId,
              onChanged: (id) async {
                ref.read(selectedBranchIdProvider.notifier).state = id;
                if (id != null) {
                  await ref.read(sessionBootstrapProvider).saveBranchId(id);
                }
              },
            ),
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
          ),
          const RealtimeStatusChip(),
          IconButton(
            icon: const Icon(Icons.logout_outlined, color: AppColors.calmCharcoal),
            onPressed: () async {
              await ref.read(authControllerProvider.notifier).logout();
              if (context.mounted) context.go(StaffRoutes.login);
            },
          ),
        ],
      ),
      // SizedBox.expand keeps OfflineBanner's Expanded child bounded on web;
      // without it the scaffold can collapse to only the bottom nav.
      body: OfflineBanner(
        child: SizedBox.expand(
          child: ColoredBox(
            color: AppColors.calmIvory,
            child: StaffContentWidth.constrain(context, child: child),
          ),
        ),
      ),
      bottomNavigationBar: NavigationBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        indicatorColor: product.accent.withValues(alpha: 0.14),
        selectedIndex: selected,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        onDestinationSelected: (i) => context.go(_destinations[i].route),
        destinations: [
          for (final d in _destinations)
            NavigationDestination(
              icon: Icon(d.icon, color: AppColors.neutral500),
              selectedIcon: Icon(d.icon, color: product.accent),
              label: d.label,
            ),
        ],
      ),
    );
  }

  int _indexFor(String path) {
    for (var i = 0; i < _destinations.length; i++) {
      if (path == _destinations[i].route ||
          (i == 1 && path.startsWith('/customers')) ||
          (i == 2 && path.startsWith('/reviews'))) {
        return i;
      }
    }
    return 0;
  }
}
