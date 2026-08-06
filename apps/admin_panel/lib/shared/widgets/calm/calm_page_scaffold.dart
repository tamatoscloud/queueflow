import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import 'calm_card.dart';
import 'calm_primary_button.dart';

class CalmPageScaffold extends StatelessWidget {
  const CalmPageScaffold({
    super.key,
    this.child = const SizedBox.shrink(),
    this.title,
    this.subtitle,
    this.onRefresh,
    this.isLoading = false,
    this.errorMessage,
    this.onRetry,
  });

  final Widget child;
  final String? title;
  final String? subtitle;
  final Future<void> Function()? onRefresh;
  final bool isLoading;
  final String? errorMessage;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          if (title != null) _header(context),
          const SizedBox(height: AppSpacing.md),
          for (var i = 0; i < 4; i++) ...[
            CalmCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(height: 14, width: 120, color: AppColors.calmLilac),
                  const SizedBox(height: 8),
                  Container(height: 10, width: double.infinity, color: AppColors.calmLilac.withValues(alpha: 0.6)),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
          ],
        ],
      );
    }

    if (errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(errorMessage!, textAlign: TextAlign.center),
              if (onRetry != null) ...[
                const SizedBox(height: AppSpacing.md),
                CalmPrimaryButton(label: 'Try again', onPressed: onRetry),
              ],
            ],
          ),
        ),
      );
    }

    final body = ListView(
      padding: const EdgeInsets.all(AppSpacing.md),
      children: [
        if (title != null) _header(context),
        if (title != null) const SizedBox(height: AppSpacing.lg),
        child,
      ],
    );

    if (onRefresh == null) return body;
    return RefreshIndicator(onRefresh: onRefresh!, color: AppColors.calmViolet, child: body);
  }

  Widget _header(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (title != null)
          Text(
            title!,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: AppColors.calmCharcoal,
                ),
          ),
        if (subtitle != null) ...[
          const SizedBox(height: 4),
          Text(subtitle!, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.calmWarmGray)),
        ],
      ],
    );
  }
}
