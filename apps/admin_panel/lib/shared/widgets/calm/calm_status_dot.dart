import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import 'admin_calm_helpers.dart';

class CalmStatusDot extends StatelessWidget {
  const CalmStatusDot({required this.status, super.key, this.label, this.showText = true});

  final CalmPlatformStatus status;
  final String? label;
  final bool showText;

  @override
  Widget build(BuildContext context) {
    final text = label ?? calmStatusLabel(status);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: calmStatusColor(status), shape: BoxShape.circle),
        ),
        if (showText) ...[
          const SizedBox(width: 6),
          Text(
            text,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppColors.calmCharcoal,
                  fontWeight: FontWeight.w600,
                ),
          ),
        ],
      ],
    );
  }
}
