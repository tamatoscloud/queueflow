import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../../core/routing/app_routes.dart';
import '../auth/data/auth_user.dart';
import '../auth/presentation/auth_controller.dart';
import '../../shared/widgets/admin_command_palette.dart';
import '../../shared/widgets/calm/admin_calm_helpers.dart';
import '../../shared/widgets/calm/calm_status_dot.dart';

class AdminShell extends ConsumerStatefulWidget {
  const AdminShell({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<AdminShell> createState() => _AdminShellState();
}

class _AdminShellState extends ConsumerState<AdminShell> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();

  static const _primaryDestinations = [
    (icon: Icons.home_outlined, selectedIcon: Icons.home, label: 'Overview', route: AppRoutes.dashboard),
    (icon: Icons.business_outlined, selectedIcon: Icons.business, label: 'Businesses', route: AppRoutes.tenants),
    (icon: Icons.notifications_outlined, selectedIcon: Icons.notifications, label: 'Alerts', route: AppRoutes.notifications),
    (icon: Icons.support_agent_outlined, selectedIcon: Icons.support_agent, label: 'Support', route: AppRoutes.support),
    (icon: Icons.analytics_outlined, selectedIcon: Icons.analytics, label: 'Analytics', route: AppRoutes.analytics),
    (icon: Icons.monitor_heart_outlined, selectedIcon: Icons.monitor_heart, label: 'Health', route: AppRoutes.health),
    (icon: Icons.timeline_outlined, selectedIcon: Icons.timeline, label: 'Activity', route: AppRoutes.activity),
    (icon: Icons.flag_outlined, selectedIcon: Icons.flag, label: 'Feature Flags', route: AppRoutes.featureFlags),
    (icon: Icons.settings_outlined, selectedIcon: Icons.settings, label: 'Settings', route: AppRoutes.settings),
  ];

  static const _moreDestinations = [
    (icon: Icons.store_outlined, selectedIcon: Icons.store, label: 'Branches', route: AppRoutes.branches),
    (icon: Icons.people_outline, selectedIcon: Icons.people, label: 'Users', route: AppRoutes.users),
    (icon: Icons.card_membership_outlined, selectedIcon: Icons.card_membership, label: 'Subscriptions', route: AppRoutes.subscriptions),
    (icon: Icons.history, selectedIcon: Icons.history, label: 'Audit log', route: AppRoutes.audit),
  ];

  static const _mobilePrimaryRoutes = [
    AppRoutes.dashboard,
    AppRoutes.tenants,
    AppRoutes.notifications,
  ];

  static const _mobileNavLabels = ['Overview', 'Businesses', 'Alerts', 'More'];

  int _indexFor(String path) {
    final all = [..._primaryDestinations, ..._moreDestinations];
    for (var i = 0; i < all.length; i++) {
      if (path.startsWith(all[i].route)) return i;
    }
    return 0;
  }

  int _mobileNavIndex(String path) {
    for (var i = 0; i < _mobilePrimaryRoutes.length; i++) {
      if (path.startsWith(_mobilePrimaryRoutes[i])) return i;
    }
    return 3;
  }

  bool _isOverflowRoute(String path) =>
      !_mobilePrimaryRoutes.any(path.startsWith) && path != AppRoutes.support;

  String _titleFor(String path) {
    for (final d in [..._primaryDestinations, ..._moreDestinations]) {
      if (path.startsWith(d.route)) return d.label;
    }
    return 'QueueFlow';
  }

  void _openMoreMenu() => _scaffoldKey.currentState?.openDrawer();

  @override
  Widget build(BuildContext context) {
    final isWide = Breakpoints.isTablet(context);
    final isExtended = MediaQuery.sizeOf(context).width >= 1200;
    final location = GoRouterState.of(context).uri.path;
    final user = ref.watch(currentUserProvider);
    final selected = _indexFor(location);
    final mobileSelected = _mobileNavIndex(location);
    final allDestinations = [..._primaryDestinations, ..._moreDestinations];

    return AdminCommandPaletteShortcuts(
      child: Scaffold(
        key: _scaffoldKey,
        backgroundColor: AppColors.calmIvory,
        body: isWide
            ? Row(
                children: [
                  _CalmNavRail(
                    extended: isExtended,
                    selected: selected,
                    onSelected: (i) => context.go(allDestinations[i].route),
                    primary: _primaryDestinations,
                    more: _moreDestinations,
                  ),
                  Expanded(
                    child: Column(
                      children: [
                        _CalmTopBar(
                          title: _titleFor(location),
                          user: user,
                          onSearch: () => showAdminCommandPalette(context),
                          onLogout: () async {
                            await ref.read(authControllerProvider.notifier).logout();
                            if (context.mounted) context.go(AppRoutes.login);
                          },
                        ),
                        Expanded(child: widget.child),
                      ],
                    ),
                  ),
                ],
              )
            : Column(
                children: [
                  _CalmTopBar(
                    title: _titleFor(location),
                    user: user,
                    showMenu: _isOverflowRoute(location),
                    onMenu: _openMoreMenu,
                    onSearch: () => showAdminCommandPalette(context),
                    onLogout: () async {
                      await ref.read(authControllerProvider.notifier).logout();
                      if (context.mounted) context.go(AppRoutes.login);
                    },
                  ),
                  Expanded(child: widget.child),
                ],
              ),
        bottomNavigationBar: isWide
            ? null
            : NavigationBar(
                backgroundColor: AppColors.lightSurface,
                indicatorColor: AppColors.calmLilac,
                selectedIndex: mobileSelected,
                onDestinationSelected: (i) {
                  if (i == 3) {
                    _openMoreMenu();
                    return;
                  }
                  context.go(_mobilePrimaryRoutes[i]);
                },
                destinations: [
                  for (var i = 0; i < _mobileNavLabels.length; i++)
                    NavigationDestination(
                      icon: Icon(
                        i < 3
                            ? _primaryDestinations[i].icon
                            : Icons.more_horiz,
                      ),
                      label: _mobileNavLabels[i],
                    ),
                ],
              ),
        drawer: isWide
            ? null
            : Drawer(
                backgroundColor: AppColors.calmIvory,
                child: SafeArea(
                  child: ListView(
                    padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                    children: [
                      Padding(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'QueueFlow',
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                            ),
                            Text('Platform administration', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.calmWarmGray)),
                          ],
                        ),
                      ),
                      const Divider(color: AppColors.calmBorder),
                      for (final d in allDestinations)
                        ListTile(
                          leading: Icon(d.icon, color: location.startsWith(d.route) ? AppColors.calmViolet : AppColors.calmWarmGray),
                          title: Text(d.label),
                          selected: location.startsWith(d.route),
                          selectedTileColor: AppColors.calmLilac.withValues(alpha: 0.5),
                          onTap: () {
                            Navigator.pop(context);
                            context.go(d.route);
                          },
                        ),
                    ],
                  ),
                ),
              ),
      ),
    );
  }
}

class _CalmNavRail extends StatelessWidget {
  const _CalmNavRail({
    required this.extended,
    required this.selected,
    required this.onSelected,
    required this.primary,
    required this.more,
  });

  final bool extended;
  final int selected;
  final ValueChanged<int> onSelected;
  final List<({IconData icon, IconData selectedIcon, String label, String route})> primary;
  final List<({IconData icon, IconData selectedIcon, String label, String route})> more;

  @override
  Widget build(BuildContext context) {
    final all = [...primary, ...more];
    return Container(
      width: extended ? 240 : 72,
      decoration: const BoxDecoration(
        color: AppColors.lightSurface,
        border: Border(right: BorderSide(color: AppColors.calmBorder)),
      ),
      child: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: EdgeInsets.all(extended ? AppSpacing.lg : AppSpacing.md),
              child: extended
                  ? Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('QueueFlow', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
                        Text('Admin', style: Theme.of(context).textTheme.labelSmall?.copyWith(color: AppColors.calmWarmGray)),
                      ],
                    )
                  : const Icon(Icons.admin_panel_settings, color: AppColors.calmViolet),
            ),
            const Divider(color: AppColors.calmBorder, height: 1),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm, horizontal: AppSpacing.sm),
                children: [
                  for (var i = 0; i < primary.length; i++)
                    _NavItem(
                      icon: i == selected ? primary[i].selectedIcon : primary[i].icon,
                      label: primary[i].label,
                      extended: extended,
                      selected: i == selected,
                      onTap: () => onSelected(i),
                    ),
                  if (extended)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(12, 16, 12, 8),
                      child: Text(
                        'MORE',
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                              color: AppColors.calmWarmGray,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 1,
                            ),
                      ),
                    ),
                  for (var i = 0; i < more.length; i++)
                    _NavItem(
                      icon: selected == primary.length + i ? more[i].selectedIcon : more[i].icon,
                      label: more[i].label,
                      extended: extended,
                      selected: selected == primary.length + i,
                      onTap: () => onSelected(primary.length + i),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.icon,
    required this.label,
    required this.extended,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool extended;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 2),
      child: Material(
        color: selected ? AppColors.calmLilac.withValues(alpha: 0.6) : Colors.transparent,
        borderRadius: AppRadius.lgAll,
        child: InkWell(
          onTap: onTap,
          borderRadius: AppRadius.lgAll,
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: extended ? AppSpacing.md : AppSpacing.sm, vertical: AppSpacing.sm),
            child: Row(
              children: [
                Icon(icon, size: 20, color: selected ? AppColors.calmViolet : AppColors.calmWarmGray),
                if (extended) ...[
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      label,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: selected ? AppColors.calmCharcoal : AppColors.calmWarmGray,
                            fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                          ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _CalmTopBar extends StatelessWidget {
  const _CalmTopBar({
    required this.title,
    required this.user,
    required this.onLogout,
    this.showMenu = false,
    this.onMenu,
    this.onSearch,
  });

  final String title;
  final AuthUser? user;
  final VoidCallback onLogout;
  final bool showMenu;
  final VoidCallback? onMenu;
  final VoidCallback? onSearch;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.md),
      decoration: const BoxDecoration(
        color: AppColors.lightSurface,
        border: Border(bottom: BorderSide(color: AppColors.calmBorder)),
      ),
      child: Row(
        children: [
          if (showMenu) IconButton(icon: const Icon(Icons.menu), onPressed: onMenu),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
                Text('Platform administration', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.calmWarmGray)),
              ],
            ),
          ),
          const CalmStatusDot(status: CalmPlatformStatus.healthy, label: 'Control center'),
          const SizedBox(width: AppSpacing.sm),
          IconButton(icon: const Icon(Icons.search), tooltip: 'Search (Ctrl+K)', onPressed: onSearch),
          if (user != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
              child: Text(user!.fullName, style: Theme.of(context).textTheme.bodySmall),
            ),
          IconButton(icon: const Icon(Icons.logout_outlined), tooltip: 'Sign out', onPressed: onLogout),
        ],
      ),
    );
  }
}
