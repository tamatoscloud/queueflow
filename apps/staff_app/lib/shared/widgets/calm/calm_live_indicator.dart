import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

class CalmLiveIndicator extends StatelessWidget {
  const CalmLiveIndicator({super.key, required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final isLive = label == 'Live' || label == 'Online';
    final color = isLive ? AppColors.success : AppColors.calmWarmGray;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            boxShadow: isLive
                ? [
                    BoxShadow(
                      color: AppColors.success.withValues(alpha: 0.4),
                      blurRadius: 6,
                    ),
                  ]
                : null,
          ),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: AppColors.calmWarmGray,
                fontWeight: FontWeight.w600,
              ),
        ),
      ],
    );
  }
}
