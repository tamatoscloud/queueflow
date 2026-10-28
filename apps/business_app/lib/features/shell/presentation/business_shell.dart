import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../../../core/models/branch_model.dart';
import '../../../core/persona/user_persona.dart';
import '../../../core/realtime/realtime_client.dart';
import '../../../core/routing/app_routes.dart';
import '../../../core/session/session_providers.dart';
import '../../../features/auth/presentation/auth_controller.dart';
import '../../../shared/widgets/offline_banner.dart';
import '../../branches/presentation/branches_screen.dart';

typedef BusinessDestination = ({IconData icon, String label, String route});

/// Owner / manager destinations, most-used first (phones show four + More).
const List<BusinessDestination> ownerDestinations = [
  (icon: Icons.space_dashboard_outlined, label: 'Home', route: AppRoutes.dashboard),
  (icon: Icons.format_list_numbered_rounded, label: 'Lines', route: AppRoutes.queues),
  (icon: Icons.people_outline_rounded, label: 'Guests', route: AppRoutes.customers),
  (icon: Icons.star_outline_rounded, label: 'Reviews', route: AppRoutes.reviews),
  (icon: Icons.insights_outlined, label: 'Reports', route: AppRoutes.reports),
  (icon: Icons.qr_code_2_rounded, label: 'Guest codes', route: AppRoutes.restaurantQr),
  (icon: Icons.restaurant_menu_rounded, label: 'Menu', route: AppRoutes.menu),
  (icon: Icons.badge_outlined, label: 'Team', route: AppRoutes.staff),
  (icon: Icons.storefront_outlined, label: 'Locations', route: AppRoutes.branches),
  (icon: Icons.notifications_none_rounded, label: 'Alerts', route: AppRoutes.notifications),
  (icon: Icons.settings_outlined, label: 'Settings', route: AppRoutes.settings),
];

/// Front-desk roles (receptionist / staff) who sign in to the business app.
const List<BusinessDestination> frontDeskDestinations = [
  (icon: Icons.format_list_numbered_rounded, label: 'Lines', route: AppRoutes.queues),
  (icon: Icons.people_outline_rounded, label: 'Guests', route: AppRoutes.customers),
  (icon: Icons.star_outline_rounded, label: 'Reviews', route: AppRoutes.reviews),
  (icon: Icons.notifications_none_rounded, label: 'Alerts', route: AppRoutes.notifications),
];

/// Index of the destination that owns [path], or -1.
int businessDestinationIndex(List<BusinessDestination> items, String path) {
  if (path == AppRoutes.dashboard) {
    return items.indexWhere((d) => d.route == AppRoutes.dashboard);
  }
  var best = -1;
  var bestLength = 0;
  for (var i = 0; i < items.length; i++) {
    final route = items[i].route;
    if (route == AppRoutes.dashboard) continue;
    if ((path == route || path.startsWith('$route/')) && route.length > bestLength) {
      best = i;
      bestLength = route.length;
    }
  }
  return best;
}

/// Quyk business chrome: green rail, greeting header with branch picker and
/// live pill, cream content area capped at a readable width.
class BusinessShell extends ConsumerWidget {
  const BusinessShell({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = GoRouterState.of(context).uri.path;
    final user = ref.watch(currentUserProvider);
    final owner = personaFromUser(user) == BusinessPersona.owner;
    final items = owner ? ownerDestinations : frontDeskDestinations;
    final branches = ref.watch(branchesProvider).valueOrNull ?? const <BranchModel>[];
    final selectedBranchId = ref.watch(selectedBranchIdProvider);
    final status = ref.watch(realtimeStatusProvider).valueOrNull;

    final (liveLabel, liveOk) = switch (status) {
      RealtimeStatus.connected => ('Live', true),
      RealtimeStatus.connecting => ('Connecting…', false),
      RealtimeStatus.reconnecting => ('Reconnecting…', false),
      RealtimeStatus.disconnected => ('Offline', false),
      null => ('Connecting…', false),
    };

    String? venue;
    for (final b in branches) {
      if (b.id == selectedBranchId) venue = b.name;
    }
    venue ??= branches.length == 1 ? branches.first.name : (branches.isEmpty ? null : 'All locations');

    final firstName = (user?.fullName ?? '').trim().split(RegExp(r'\s+')).first;

    return QuykAppFrame(
      items: [for (final d in items) QuykNavItem(icon: d.icon, label: d.label)],
      selectedIndex: businessDestinationIndex(items, location),
      onSelect: (i) => context.go(items[i].route),
      title: firstName.isEmpty ? quykGreetingForTime() : '${quykGreetingForTime()}, $firstName',
      subtitle: venue,
      actions: [
        if (branches.length > 1)
          QuykBranchPicker(
            branches: [for (final b in branches) (id: b.id, name: b.name)],
            selectedId: selectedBranchId,
            allLabel: 'All locations',
            onChanged: (id) async {
              ref.read(selectedBranchIdProvider.notifier).state = id;
              await ref.read(sessionBootstrapProvider).saveBranchId(id);
            },
          ),
      ],
      liveLabel: liveLabel,
      liveOk: liveOk,
      onSignOut: () async {
        await ref.read(authControllerProvider.notifier).logout();
        if (context.mounted) context.go(AppRoutes.login);
      },
      child: OfflineBanner(
        child: ColoredBox(
          color: QuykColors.cream,
          child: QuykContentWidth(child: child),
        ),
      ),
    );
  }
}
