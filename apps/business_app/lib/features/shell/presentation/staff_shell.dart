import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../../core/routing/app_routes.dart';
import '../../../core/session/session_providers.dart';
import '../../../features/auth/presentation/auth_controller.dart';
import '../../../shared/widgets/common_widgets.dart';
import '../../../shared/widgets/offline_banner.dart';
import '../../branches/presentation/branches_screen.dart';

typedef ShellDestination = ({
  IconData icon,
  IconData selectedIcon,
  String label,
  String route,
});

/// Toast POS–style shell for front-desk staff — operational speed first.
class StaffShell extends ConsumerStatefulWidget {
  const StaffShell({super.key, required this.child});

  final Widget child;

  static final destinations = <ShellDestination>[
    (
      icon: Icons.queue_outlined,
      selectedIcon: Icons.queue,
      label: 'Queues',
      route: AppRoutes.queues,
    ),
    (
      icon: Icons.people_outline,
      selectedIcon: Icons.people,
      label: 'Customers',
      route: AppRoutes.customers,
    ),
    (
      icon: Icons.star_outline,
      selectedIcon: Icons.star,
      label: 'Reviews',
      route: AppRoutes.reviews,
    ),
    (
      icon: Icons.notifications_outlined,
      selectedIcon: Icons.notifications,
      label: 'Alerts',
      route: AppRoutes.notifications,
    ),
  ];

  @override
  ConsumerState<StaffShell> createState() => _StaffShellState();
}

class _StaffShellState extends ConsumerState<StaffShell> {
  @override
  Widget build(BuildContext context) {
    final isTablet = Breakpoints.isTablet(context);
    final location = GoRouterState.of(context).uri.path;
    final branchesAsync = ref.watch(branchesProvider);
    final selectedBranchId = ref.watch(selectedBranchIdProvider);
    final selected = _indexFor(location);
    final brightness = Theme.of(context).brightness;
    final product = context.productTheme;
    final destinations = StaffShell.destinations;

    return Scaffold(
      backgroundColor: brightness == Brightness.light
          ? AppColors.lightBackground
          : AppColors.darkBackground,
      appBar: AppBar(
        elevation: 0,
        scrolledUnderElevation: 0,
        backgroundColor: brightness == Brightness.light
            ? AppColors.lightSurface
            : AppColors.darkSurface,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                gradient: product.gradient,
                borderRadius: AppRadius.mdAll,
                boxShadow: AppShadows.glow(product.accent),
              ),
              child: const Icon(Icons.bolt, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _titleFor(location),
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
                Text(
                  'Staff Console',
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: product.accent,
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ],
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
          const SizedBox(width: 4),
          IconButton(
            icon: const Icon(Icons.logout_outlined),
            tooltip: 'Sign out',
            onPressed: () async {
              await ref.read(authControllerProvider.notifier).logout();
              if (context.mounted) context.go(AppRoutes.login);
            },
          ),
          const SizedBox(width: 8),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(2),
          child: Container(
            height: 2,
            decoration: BoxDecoration(gradient: product.gradient),
          ),
        ),
      ),
      body: OfflineBanner(
        child: isTablet
            ? Row(
                children: [
                  _StaffNavRail(
                    destinations: destinations,
                    selectedIndex: selected,
                    accent: product.accent,
                    gradient: product.gradient,
                    onDestinationSelected: (i) => context.go(destinations[i].route),
                  ),
                  Container(
                    width: 1,
                    color: brightness == Brightness.light
                        ? AppColors.lightBorder
                        : AppColors.darkBorder,
                  ),
                  Expanded(child: widget.child),
                ],
              )
            : widget.child,
      ),
      bottomNavigationBar: isTablet
          ? null
          : NavigationBar(
              selectedIndex: selected.clamp(0, destinations.length - 1),
              indicatorColor: product.accent.withValues(alpha: 0.14),
              onDestinationSelected: (i) => context.go(destinations[i].route),
              destinations: [
                for (final d in destinations)
                  NavigationDestination(
                    icon: Icon(d.icon),
                    selectedIcon: Icon(d.selectedIcon, color: product.accent),
                    label: d.label,
                  ),
              ],
            ),
    );
  }

  int _indexFor(String path) {
    final destinations = StaffShell.destinations;
    for (var i = 0; i < destinations.length; i++) {
      if (path.startsWith(destinations[i].route)) return i;
    }
    return 0;
  }

  String _titleFor(String path) {
    for (final d in StaffShell.destinations) {
      if (path.startsWith(d.route)) return d.label;
    }
    return 'QueueFlow';
  }
}

class _StaffNavRail extends StatelessWidget {
  const _StaffNavRail({
    required this.destinations,
    required this.selectedIndex,
    required this.accent,
    required this.gradient,
    required this.onDestinationSelected,
  });

  final List<ShellDestination> destinations;
  final int selectedIndex;
  final Color accent;
  final Gradient gradient;
  final ValueChanged<int> onDestinationSelected;

  @override
  Widget build(BuildContext context) {
    final brightness = Theme.of(context).brightness;

    return Container(
      decoration: BoxDecoration(
        color: brightness == Brightness.light
            ? AppColors.lightSurface
            : AppColors.darkSurface,
        boxShadow: AppShadows.sm(brightness),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(width: 3, decoration: BoxDecoration(gradient: gradient)),
          NavigationRailTheme(
            data: NavigationRailThemeData(
              backgroundColor: Colors.transparent,
              indicatorColor: accent.withValues(alpha: 0.12),
              selectedIconTheme: IconThemeData(color: accent),
              selectedLabelTextStyle:
                  Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: accent,
                        fontWeight: FontWeight.w600,
                      ),
            ),
            child: NavigationRail(
              extended: true,
              selectedIndex: selectedIndex,
              onDestinationSelected: onDestinationSelected,
              leading: Padding(
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    gradient: gradient,
                    borderRadius: AppRadius.lgAll,
                  ),
                  child: const Icon(Icons.bolt, color: Colors.white, size: 24),
                ),
              ),
              destinations: [
                for (final d in destinations)
                  NavigationRailDestination(
                    icon: Icon(d.icon),
                    selectedIcon: Icon(d.selectedIcon),
                    label: Text(d.label),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
