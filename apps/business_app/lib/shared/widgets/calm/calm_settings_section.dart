import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import 'calm_card.dart';
import 'calm_section_label.dart';

class CalmSettingsSection extends StatelessWidget {
  const CalmSettingsSection({
    required this.title,
    required this.children,
    super.key,
    this.subtitle,
  });

  final String title;
  final String? subtitle;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CalmSectionLabel(title, subtitle: subtitle),
        const SizedBox(height: AppSpacing.sm),
        CalmCard(
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              for (var i = 0; i < children.length; i++) ...[
                if (i > 0) const Divider(height: 1, color: AppColors.calmBorder),
                children[i],
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class CalmSettingsTile extends StatelessWidget {
  const CalmSettingsTile({
    required this.icon,
    required this.title,
    super.key,
    this.subtitle,
    this.onTap,
    this.trailing,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback? onTap;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      onTap: onTap,
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: AppColors.calmLilac,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(icon, color: AppColors.calmViolet, size: 20),
      ),
      title: Text(
        title,
        style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
      ),
      subtitle: subtitle != null
          ? Text(subtitle!, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.calmWarmGray))
          : null,
      trailing: trailing ?? (onTap != null ? const Icon(Icons.chevron_right, color: AppColors.calmWarmGray) : null),
    );
  }
}
