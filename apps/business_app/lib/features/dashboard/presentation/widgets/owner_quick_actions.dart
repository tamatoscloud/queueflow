import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../../../core/routing/app_routes.dart';

void showOwnerQuickActions(BuildContext context) {
  showModalBottomSheet<void>(
    context: context,
    backgroundColor: Colors.transparent,
    builder: (ctx) => const _OwnerQuickActionsSheet(),
  );
}

class OwnerQuickActionsFab extends StatelessWidget {
  const OwnerQuickActionsFab({super.key});

  @override
  Widget build(BuildContext context) {
    final product = context.productTheme;
    return FloatingActionButton.extended(
      onPressed: () => showOwnerQuickActions(context),
      backgroundColor: product.accent,
      foregroundColor: Colors.white,
      elevation: 2,
      icon: const Icon(Icons.add),
      label: const Text('Quick actions'),
    );
  }
}

class _OwnerQuickActionsSheet extends StatelessWidget {
  const _OwnerQuickActionsSheet();

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.lightSurface,
        borderRadius: AppRadius.xlAll,
        border: Border.all(color: AppColors.calmBorder),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Quick actions',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppColors.calmCharcoal,
                    ),
              ),
              const SizedBox(height: AppSpacing.lg),
              _ActionTile(
                icon: Icons.add,
                label: 'Add waiting line',
                onTap: () {
                  Navigator.pop(context);
                  context.push(AppRoutes.queues);
                },
              ),
              _ActionTile(
                icon: Icons.store_mall_directory_outlined,
                label: 'Add location',
                onTap: () {
                  Navigator.pop(context);
                  context.push(AppRoutes.branchAdd);
                },
              ),
              _ActionTile(
                icon: Icons.person_add_outlined,
                label: 'Invite team member',
                onTap: () {
                  Navigator.pop(context);
                  context.push(AppRoutes.staff);
                },
              ),
              _ActionTile(
                icon: Icons.qr_code_2,
                label: 'Guest join codes',
                onTap: () {
                  Navigator.pop(context);
                  context.push(AppRoutes.restaurantQr);
                },
              ),
              _ActionTile(
                icon: Icons.bar_chart_outlined,
                label: 'View today’s numbers',
                onTap: () {
                  Navigator.pop(context);
                  context.push(AppRoutes.reports);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ActionTile extends StatelessWidget {
  const _ActionTile({required this.icon, required this.label, required this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: AppColors.calmViolet),
      title: Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
      trailing: const Icon(Icons.chevron_right, color: AppColors.calmWarmGray),
      onTap: onTap,
    );
  }
}
