import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

class SkeletonBox extends StatelessWidget {
  const SkeletonBox({super.key, this.height = 16, this.width, this.radius = 8});

  final double height;
  final double? width;
  final double radius;

  @override
  Widget build(BuildContext context) {
    return AppSkeleton(
      height: height,
      width: width,
      borderRadius: BorderRadius.circular(radius),
    );
  }
}

class DashboardSkeleton extends StatelessWidget {
  const DashboardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        children: [
          Row(
            children: const [
              Expanded(child: AppSkeletonCard()),
              SizedBox(width: 12),
              Expanded(child: AppSkeletonCard()),
            ],
          ),
          const SizedBox(height: 12),
          const AppSkeletonCard(),
          const SizedBox(height: 12),
          AppSkeleton(height: 200, borderRadius: AppRadius.xlAll),
        ],
      ),
    );
  }
}

class ListTileSkeleton extends StatelessWidget {
  const ListTileSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          AppSkeleton(height: 48, width: 48, borderRadius: AppRadius.lgAll),
          const SizedBox(width: 12),
          const Expanded(child: AppSkeleton(height: 40)),
        ],
      ),
    );
  }
}
