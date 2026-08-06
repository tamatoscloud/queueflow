import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

String staffGreetingForTime([DateTime? now]) {
  final hour = (now ?? DateTime.now()).hour;
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/// Calm header — greeting, venue, live status. No KPI clutter.
class StaffGreetingHeader extends StatelessWidget {
  const StaffGreetingHeader({
    super.key,
    required this.name,
    this.venueName,
    this.trailing,
  });

  final String name;
  final String? venueName;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${staffGreetingForTime()}, $name',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: AppColors.calmCharcoal,
                      fontWeight: FontWeight.w600,
                    ),
              ),
              if (venueName != null) ...[
                const SizedBox(height: 4),
                Text(
                  venueName!,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: AppColors.calmWarmGray,
                        fontWeight: FontWeight.w500,
                      ),
                ),
              ],
            ],
          ),
        ),
        if (trailing != null) trailing!,
      ],
    );
  }
}
