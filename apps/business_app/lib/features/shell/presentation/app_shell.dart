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
import '../../customers/presentation/customers_screen.dart';
import '../../dashboard/presentation/dashboard_screen.dart';
import '../../notifications/presentation/notifications_screen.dart';
import '../../queues/presentation/queues_screen.dart';
import '../../reports/presentation/reports_screen.dart';
import '../../restaurant_demo/presentation/demo_simulator_screen.dart';
import '../../restaurant_demo/presentation/qr_center_screen.dart';
import '../../restaurant_demo/presentation/table_floor_screen.dart';
import '../../settings/presentation/settings_screen.dart';

class AppShell extends ConsumerStatefulWidget {
  const AppShell({super.key, required this.child});

  final Widget child;

  static final destinations = [
    (icon: Icons.home_outlined, selectedIcon: Icons.home, label: 'Home', route: AppRoutes.dashboard),
    (icon: Icons.queue_outlined, selectedIcon: Icons.queue, label: 'Queues', route: AppRoutes.queues),
    (icon: Icons.qr_code_2_outlined, selectedIcon: Icons.qr_code_2, label: 'QR', route: AppRoutes.restaurantQr),
    (icon: Icons.badge_outlined, selectedIcon: Icons.badge, label: 'Staff', route: AppRoutes.staff),
    (icon: Icons.bar_chart_outlined, selectedIcon: Icons.bar_chart, label: 'Reports', route: AppRoutes.reports),
    (icon: Icons.store_outlined, selectedIcon: Icons.store, label: 'Branches', route: AppRoutes.branches),
    (icon: Icons.people_outline, selectedIcon: Icons.people, label: 'Customers', route: AppRoutes.customers),
    (icon: Icons.notifications_outlined, selectedIcon: Icons.notifications, label: 'Alerts', route: AppRoutes.notifications),
    (icon: Icons.settings_outlined, selectedIcon: Icons.settings, label: 'Settings', route: AppRoutes.settings),
  ];

  static final developerDestinations = [
    (icon: Icons.science_outlined, selectedIcon: Icons.science, label: 'Demo Simulator', route: AppRoutes.restaurantSimulator),
    (icon: Icons.table_restaurant_outlined, selectedIcon: Icons.table_restaurant, label: 'Table Floor', route: AppRoutes.restaurantTables),
  ];

  @override
  ConsumerState<AppShell> createState() => _AppShellState();
}

class _AppShellState extends ConsumerState<AppShell> {
  int _index = 0;
  final _scaffoldKey = GlobalKey<ScaffoldState>();

  static final _destinations = AppShell.destinations;

  @override
  Widget build(BuildContext context) {
    final isTablet = Breakpoints.isTablet(context);
    final location = GoRouterState.of(context).uri.path;
    final product = context.productTheme;
    final branchesAsync = ref.watch(branchesProvider);
    final selectedBranchId = ref.watch(selectedBranchIdProvider);
    final selected = _indexFor(location);
    final brightness = Theme.of(context).brightness;

    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: AppColors.calmIvory,
      drawer: isTablet
          ? null
          : Drawer(
              child: SafeArea(
                child: ListView(
                  padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      child: Text(
                        'More',
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                    ),
                    for (final d in _destinations.skip(5))
                      ListTile(
                        leading: Icon(d.icon),
                        title: Text(d.label),
                        selected: location.startsWith(d.route),
                        onTap: () {
                          Navigator.pop(context);
                          context.go(d.route);
                        },
                      ),
                  ],
                ),
              ),
            ),
      appBar: AppBar(
        elevation: 0,
        scrolledUnderElevation: 0,
        backgroundColor: AppColors.calmIvory,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: product.accent,
                borderRadius: AppRadius.mdAll,
              ),
              child: const Icon(Icons.storefront_outlined, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 12),
            Text(
              _titleFor(location),
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: product.accent.withValues(alpha: 0.1),
                borderRadius: AppRadius.fullAll,
              ),
              child: Text(
                'OWNER',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: product.accent,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.8,
                    ),
              ),
            ),
          ],
        ),
        actions: [
          if (!isTablet)
            IconButton(
              icon: const Icon(Icons.menu),
              tooltip: 'More',
              onPressed: () => _scaffoldKey.currentState?.openDrawer(),
            ),
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
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: AppColors.calmBorder),
        ),
      ),
      body: OfflineBanner(
        child: isTablet
            ? Row(
                children: [
                  _PremiumNavRail(
                    selectedIndex: selected,
                    onDestinationSelected: (i) {
                      setState(() => _index = i);
                      context.go(_destinations[i].route);
                    },
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
              selectedIndex: selected.clamp(0, 4),
              indicatorColor: product.accent.withValues(alpha: 0.12),
              onDestinationSelected: (i) => context.go(_destinations[i].route),
              destinations: [
                for (final d in _destinations.take(5))
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
    if (path == AppRoutes.dashboard) return 0;
    for (var i = 0; i < _destinations.length; i++) {
      final route = _destinations[i].route;
      if (route == AppRoutes.dashboard) continue;
      if (path.startsWith(route)) return i;
    }
    return 0;
  }

  String _titleFor(String path) {
    if (path == AppRoutes.dashboard) return 'Home';
    for (final d in AppShell.developerDestinations) {
      if (path.startsWith(d.route)) return d.label;
    }
    for (final d in _destinations) {
      if (d.route == AppRoutes.dashboard) continue;
      if (path.startsWith(d.route)) return d.label;
    }
    return 'QueueFlow';
  }
}

class _PremiumNavRail extends StatelessWidget {
  const _PremiumNavRail({
    required this.selectedIndex,
    required this.onDestinationSelected,
  });

  final int selectedIndex;
  final ValueChanged<int> onDestinationSelected;

  @override
  Widget build(BuildContext context) {
    final product = context.productTheme;
    final brightness = Theme.of(context).brightness;
    final destinations = AppShell.destinations;

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
          Container(
            width: 3,
            decoration: const BoxDecoration(gradient: AppGradients.primary),
          ),
          NavigationRailTheme(
            data: NavigationRailThemeData(
              backgroundColor: Colors.transparent,
              indicatorColor: product.accent.withValues(alpha: 0.12),
              selectedIconTheme: IconThemeData(color: product.accent),
              selectedLabelTextStyle: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: product.accent,
                    fontWeight: FontWeight.w600,
                  ),
              unselectedLabelTextStyle: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: AppColors.neutral500,
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
                    color: product.accent,
                    borderRadius: AppRadius.lgAll,
                  ),
                  child: const Icon(Icons.queue, color: Colors.white, size: 24),
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

Widget shellChildForRoute(String path) {
  if (path.startsWith(AppRoutes.restaurantQr)) return const QrCenterScreen();
  if (path.startsWith(AppRoutes.restaurantSimulator)) return const DemoSimulatorScreen();
  if (path.startsWith(AppRoutes.restaurantTables)) return const TableFloorScreen();
  if (path.startsWith(AppRoutes.queues)) return const QueuesScreen();
  if (path.startsWith(AppRoutes.branches)) return const BranchesScreen();
  if (path.startsWith(AppRoutes.customers)) return const CustomersScreen();
  if (path.startsWith(AppRoutes.reports)) return const ReportsScreen();
  if (path.startsWith(AppRoutes.notifications)) return const NotificationsScreen();
  if (path.startsWith(AppRoutes.settings)) return const SettingsScreen();
  return const DashboardScreen();
}
