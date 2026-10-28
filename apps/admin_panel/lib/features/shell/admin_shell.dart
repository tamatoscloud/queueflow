import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../../core/routing/app_routes.dart';
import '../../shared/widgets/admin_command_palette.dart';
import '../auth/presentation/auth_controller.dart';
import '../health/health_screen.dart';

typedef AdminDestination = ({IconData icon, String label, String route});

/// Platform admin destinations, most-used first (phones show four + More).
const List<AdminDestination> adminDestinations = [
  (icon: Icons.space_dashboard_outlined, label: 'Overview', route: AppRoutes.dashboard),
  (icon: Icons.storefront_outlined, label: 'Businesses', route: AppRoutes.tenants),
  (icon: Icons.people_outline_rounded, label: 'Users', route: AppRoutes.users),
  (icon: Icons.support_agent_outlined, label: 'Support', route: AppRoutes.support),
  (icon: Icons.notifications_none_rounded, label: 'Alerts', route: AppRoutes.notifications),
  (icon: Icons.card_membership_outlined, label: 'Plans', route: AppRoutes.subscriptions),
  (icon: Icons.location_on_outlined, label: 'Branches', route: AppRoutes.branches),
  (icon: Icons.star_outline_rounded, label: 'Reviews', route: AppRoutes.reviews),
  (icon: Icons.insights_outlined, label: 'Analytics', route: AppRoutes.analytics),
  (icon: Icons.monitor_heart_outlined, label: 'Health', route: AppRoutes.health),
  (icon: Icons.history_rounded, label: 'Audit log', route: AppRoutes.audit),
  (icon: Icons.flag_outlined, label: 'Flags', route: AppRoutes.featureFlags),
  (icon: Icons.settings_outlined, label: 'Settings', route: AppRoutes.settings),
];

int adminDestinationIndex(String path) {
  var best = -1;
  var bestLength = 0;
  for (var i = 0; i < adminDestinations.length; i++) {
    final route = adminDestinations[i].route;
    if ((path == route || path.startsWith('$route/')) && route.length > bestLength) {
      best = i;
      bestLength = route.length;
    }
  }
  return best;
}

/// Quyk platform-admin chrome: green rail, greeting header with a search
/// button (⌘K) and a live health pill.
class AdminShell extends ConsumerWidget {
  const AdminShell({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = GoRouterState.of(context).uri.path;
    final user = ref.watch(currentUserProvider);
    final health = ref.watch(systemHealthProvider);
    final issues = health.valueOrNull == null ? null : healthIssueCount(health.valueOrNull!);
    final firstName = (user?.fullName ?? '').trim().split(RegExp(r'\s+')).first;

    final (liveLabel, liveOk) = switch (issues) {
      null when health.hasError => ('Health unknown', false),
      null => ('Checking…', false),
      0 => ('All systems OK', true),
      final n => ('$n need${n == 1 ? 's' : ''} attention', false),
    };

    return AdminCommandPaletteShortcuts(
      child: QuykAppFrame(
        items: [for (final d in adminDestinations) QuykNavItem(icon: d.icon, label: d.label)],
        selectedIndex: adminDestinationIndex(location),
        onSelect: (i) => context.go(adminDestinations[i].route),
        title: firstName.isEmpty ? quykGreetingForTime() : '${quykGreetingForTime()}, $firstName',
        subtitle: 'Quyk platform',
        actions: [
          OutlinedButton.icon(
            onPressed: () => showAdminCommandPalette(context),
            icon: const Icon(Icons.search_rounded, size: 18),
            label: const Text('Search  ⌘K'),
            style: OutlinedButton.styleFrom(
              backgroundColor: Colors.white,
              side: const BorderSide(color: QuykColors.line),
            ),
          ),
        ],
        liveLabel: liveLabel,
        liveOk: liveOk,
        onSignOut: () async {
          await ref.read(authControllerProvider.notifier).logout();
          if (context.mounted) context.go(AppRoutes.login);
        },
        child: ColoredBox(color: QuykColors.cream, child: QuykContentWidth(child: child)),
      ),
    );
  }
}
