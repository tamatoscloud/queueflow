import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/routing/staff_routes.dart';
import '../../features/auth/presentation/auth_controller.dart';
import '../../features/settings/break_mode_provider.dart';
import 'profile_view.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final onBreak = ref.watch(breakModeProvider);

    return ProfileView(
      name: user?.fullName.trim().isNotEmpty == true ? user!.fullName.trim() : 'Staff',
      email: user?.email ?? '',
      onBreak: onBreak,
      onToggleBreak: () => ref.read(breakModeProvider.notifier).state = !onBreak,
      onSignOut: () async {
        await ref.read(authControllerProvider.notifier).logout();
        if (context.mounted) context.go(StaffRoutes.login);
      },
    );
  }
}
