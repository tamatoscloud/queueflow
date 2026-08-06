import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

class CalmSectionLabel extends StatelessWidget {
  const CalmSectionLabel(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: Theme.of(context).textTheme.labelSmall?.copyWith(
            letterSpacing: 1.4,
            fontWeight: FontWeight.w700,
            color: AppColors.calmWarmGray,
          ),
    );
  }
}
