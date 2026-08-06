import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

class CalmPrimaryButton extends StatelessWidget {
  const CalmPrimaryButton({
    required this.label,
    required this.onPressed,
    super.key,
    this.icon,
    this.isLoading = false,
    this.variant = CalmPrimaryVariant.violet,
    this.compact = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool isLoading;
  final CalmPrimaryVariant variant;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = switch (variant) {
      CalmPrimaryVariant.violet => (AppColors.calmViolet, Colors.white),
      CalmPrimaryVariant.success => (AppColors.success, Colors.white),
      CalmPrimaryVariant.danger => (AppColors.danger, Colors.white),
      CalmPrimaryVariant.outline => (Colors.transparent, AppColors.calmViolet),
    };

    final child = isLoading
        ? SizedBox(height: 22, width: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: fg))
        : Row(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: compact ? MainAxisSize.min : MainAxisSize.max,
            children: [
              if (icon != null) ...[Icon(icon, size: 20), const SizedBox(width: 8)],
              Text(label, style: TextStyle(fontWeight: FontWeight.w700, fontSize: compact ? 14 : 16, color: fg)),
            ],
          );

    if (variant == CalmPrimaryVariant.outline) {
      return OutlinedButton(
        onPressed: isLoading ? null : onPressed,
        style: OutlinedButton.styleFrom(
          minimumSize: Size(compact ? 0 : double.infinity, compact ? 40 : 48),
          foregroundColor: fg,
          side: const BorderSide(color: AppColors.calmBorder),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        ),
        child: child,
      );
    }

    return SizedBox(
      width: compact ? null : double.infinity,
      height: compact ? 40 : 48,
      child: FilledButton(
        onPressed: isLoading ? null : onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: bg,
          foregroundColor: fg,
          disabledBackgroundColor: bg.withValues(alpha: 0.5),
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        ),
        child: child,
      ),
    );
  }
}

enum CalmPrimaryVariant { violet, success, danger, outline }
