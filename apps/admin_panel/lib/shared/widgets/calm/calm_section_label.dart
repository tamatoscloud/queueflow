import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

class CalmSectionLabel extends StatelessWidget {
  const CalmSectionLabel(this.title, {super.key, this.subtitle});

  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title.toUpperCase(),
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: AppColors.calmWarmGray,
                fontWeight: FontWeight.w700,
                letterSpacing: 1.1,
              ),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 2),
          Text(subtitle!, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.calmWarmGray)),
        ],
      ],
    );
  }
}
