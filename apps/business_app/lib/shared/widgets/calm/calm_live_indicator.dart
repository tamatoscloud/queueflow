import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

class CalmLiveIndicator extends StatelessWidget {
  const CalmLiveIndicator({super.key, this.label = 'Live'});

  final String label;

  @override
  Widget build(BuildContext context) {
    final isLive = label == 'Live';
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            color: isLive ? AppColors.success : AppColors.calmWarmGray,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                fontWeight: FontWeight.w600,
                color: AppColors.calmWarmGray,
              ),
        ),
      ],
    );
  }
}
