import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

class CalmSectionLabel extends StatelessWidget {
  const CalmSectionLabel(this.label, {super.key, this.subtitle});

  final String label;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                fontWeight: FontWeight.w700,
                letterSpacing: 1.2,
                color: QuykColors.muted,
              ),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 4),
          Text(
            subtitle!,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: QuykColors.muted,
                ),
          ),
        ],
      ],
    );
  }
}
