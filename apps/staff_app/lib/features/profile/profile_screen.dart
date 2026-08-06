import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../../features/auth/presentation/auth_controller.dart';
import '../../features/settings/settings_screen.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final product = context.productTheme;

    return ListView(
      padding: const EdgeInsets.all(AppSpacing.md),
      children: [
        GlassPanel(
          child: Row(
            children: [
              CircleAvatar(
                radius: 32,
                backgroundColor: product.accent.withValues(alpha: 0.15),
                child: Text(
                  user?.fullName.substring(0, 1).toUpperCase() ?? '?',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    color: product.accent,
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      user?.fullName ?? 'Staff',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    Text(user?.email ?? '', style: Theme.of(context).textTheme.bodySmall),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        const SettingsScreen(),
      ],
    );
  }
}
