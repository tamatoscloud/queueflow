import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';
import 'package:queueflow_widgets/queueflow_widgets.dart';

class StaffQueueEmptyState extends StatelessWidget {
  const StaffQueueEmptyState({super.key, this.onAddCustomer});

  final VoidCallback? onAddCustomer;

  @override
  Widget build(BuildContext context) {
    return EmptyStateView(
      title: "You're all clear 🎉",
      message: 'Nobody is waiting. Take a breath — or add a walk-in guest.',
      icon: Icons.celebration_outlined,
      actionLabel: onAddCustomer == null ? null : 'Add a walk-in guest',
      onAction: onAddCustomer,
    );
  }
}

class StaffQueuePausedState extends StatelessWidget {
  const StaffQueuePausedState({super.key, required this.onResume});

  final VoidCallback onResume;

  @override
  Widget build(BuildContext context) {
    return EmptyStateView(
      title: 'Queue is paused',
      message: "New customers won't be added until you resume.",
      icon: Icons.pause_circle_outline,
      actionLabel: 'Resume queue',
      onAction: onResume,
    );
  }
}

class StaffQueueClosedState extends StatelessWidget {
  const StaffQueueClosedState({super.key});

  @override
  Widget build(BuildContext context) {
    return const EmptyStateView(
      title: "You're done for today",
      message: 'Great work. The queue is closed.',
      icon: Icons.nightlight_round,
    );
  }
}

class StaffSessionExpiredState extends StatelessWidget {
  const StaffSessionExpiredState({super.key, required this.onSignIn});

  final VoidCallback onSignIn;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.lock_clock_outlined, size: 56, color: AppColors.warning),
            const SizedBox(height: AppSpacing.md),
            Text(
              'Your session has expired',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Sign in again to continue serving customers.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.neutral600),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.lg),
            AppButton(label: 'Sign in again', icon: Icons.login, onPressed: onSignIn),
          ],
        ),
      ),
    );
  }
}

class StaffLoadErrorState extends StatelessWidget {
  const StaffLoadErrorState({super.key, required this.onRetry, this.message});

  final VoidCallback onRetry;
  final String? message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.cloud_off_outlined, size: 56, color: AppColors.warning),
            const SizedBox(height: AppSpacing.md),
            Text(
              "We couldn't load the queue",
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              message ?? 'Please try again. If this keeps happening, check with your manager.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.neutral600),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.lg),
            AppButton(label: 'Try again', icon: Icons.refresh, onPressed: onRetry),
          ],
        ),
      ),
    );
  }
}

class StaffOfflineState extends StatelessWidget {
  const StaffOfflineState({super.key, required this.onRetry, this.showCachedHint = false});

  final VoidCallback onRetry;
  final bool showCachedHint;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.wifi_off_rounded, size: 56, color: AppColors.neutral400),
            const SizedBox(height: AppSpacing.md),
            Text(
              "You're offline",
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Reconnect to see the live queue and call guests. Actions are paused while offline.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.neutral600),
              textAlign: TextAlign.center,
            ),
            if (showCachedHint) ...[
              const SizedBox(height: AppSpacing.sm),
              Text(
                'A saved queue snapshot is not available on this screen yet — reconnect to continue.',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.neutral500),
                textAlign: TextAlign.center,
              ),
            ],
            const SizedBox(height: AppSpacing.lg),
            AppButton(label: 'Retry', icon: Icons.refresh, onPressed: onRetry),
          ],
        ),
      ),
    );
  }
}
