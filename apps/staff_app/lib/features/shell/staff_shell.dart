import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../core/models/branch_model.dart';
import '../../core/providers/branches_provider.dart';
import '../../core/realtime/realtime_client.dart';
import '../../core/routing/staff_routes.dart';
import '../../core/session/session_providers.dart';
import '../../features/auth/presentation/auth_controller.dart';
import '../../shared/widgets/offline_banner.dart';
import '../../shared/widgets/quyk/quyk_frame.dart';
import '../../shared/widgets/staff/staff_realtime_feedback.dart';

/// Staff app chrome (Quyk redesign): rail + greeting header around each tab.
class StaffShell extends ConsumerWidget {
  const StaffShell({super.key, required this.child});

  final Widget child;

  static const _routes = [
    StaffRoutes.today,
    StaffRoutes.customers,
    StaffRoutes.reviews,
    StaffRoutes.notifications,
    StaffRoutes.profile,
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = GoRouterState.of(context).uri.path;
    final user = ref.watch(currentUserProvider);
    final branches = ref.watch(branchesProvider).valueOrNull ?? const <BranchModel>[];
    final selectedBranchId = ref.watch(selectedBranchIdProvider);
    final status = ref.watch(realtimeStatusProvider).valueOrNull;
    final authorized = ref.watch(realtimeAuthorizedProvider).valueOrNull ?? false;
    final live = status == RealtimeStatus.connected && authorized;

    String? branchName;
    for (final b in branches) {
      if (b.id == selectedBranchId) branchName = b.name;
    }
    final venueName = branchName ?? (branches.isNotEmpty ? branches.first.name : null);

    Future<void> selectBranch(String? id) async {
      ref.read(selectedBranchIdProvider.notifier).state = id;
      if (id != null) {
        await ref.read(sessionBootstrapProvider).saveBranchId(id);
      }
    }

    final branchPicker = branches.length < 2
        ? null
        : PopupMenuButton<String>(
            tooltip: 'Choose branch',
            color: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            onSelected: (value) => selectBranch(value == '*' ? null : value),
            itemBuilder: (_) => [
              const PopupMenuItem(value: '*', child: Text('All branches')),
              for (final b in branches)
                PopupMenuItem(value: b.id, child: Text(b.name)),
            ],
            child: IgnorePointer(
              child: QuykBranchPill(label: branchName ?? 'All branches'),
            ),
          );

    return QuykStaffFrame(
      selectedIndex: _indexFor(location),
      onSelect: (i) => context.go(_routes[i]),
      greetingName: user?.fullName.split(' ').first ?? 'there',
      venueName: venueName,
      branchPicker: branchPicker,
      liveLabel: live ? 'Live' : 'Updating',
      liveOk: live,
      onSignOut: () async {
        await ref.read(authControllerProvider.notifier).logout();
        if (context.mounted) context.go(StaffRoutes.login);
      },
      child: StaffRealtimeFeedback(
        child: OfflineBanner(
          child: ColoredBox(
            color: QuykColors.cream,
            child: Align(
              alignment: Alignment.topCenter,
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: quykContentMaxWidth),
                child: SizedBox.expand(child: child),
              ),
            ),
          ),
        ),
      ),
    );
  }

  int _indexFor(String path) {
    if (path.startsWith('/customers')) return 1;
    if (path.startsWith('/reviews')) return 2;
    if (path.startsWith('/notifications')) return 3;
    if (path.startsWith('/profile')) return 4;
    return 0;
  }
}
