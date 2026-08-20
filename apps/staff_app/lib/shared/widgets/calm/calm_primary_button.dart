import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

/// Dominant staff action — CALL NEXT, COMPLETE, etc.
/// Default height 80 for touchscreen / tablet host stands.
class CalmPrimaryButton extends StatelessWidget {
  const CalmPrimaryButton({
    required this.label,
    required this.onPressed,
    super.key,
    this.icon,
    this.isLoading = false,
    this.variant = CalmPrimaryVariant.violet,
    this.height = 80,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool isLoading;
  final CalmPrimaryVariant variant;
  final double height;

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = switch (variant) {
      CalmPrimaryVariant.violet => (AppColors.primaryDark, Colors.white),
      CalmPrimaryVariant.success => (AppColors.success, Colors.white),
      CalmPrimaryVariant.danger => (AppColors.danger, Colors.white),
    };

    return SizedBox(
      width: double.infinity,
      height: height,
      child: FilledButton(
        onPressed: isLoading ? null : onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: bg,
          foregroundColor: fg,
          disabledBackgroundColor: bg.withValues(alpha: 0.5),
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          textStyle: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w800,
                letterSpacing: 0.6,
              ),
        ),
        child: isLoading
            ? SizedBox(
                height: 26,
                width: 26,
                child: CircularProgressIndicator(strokeWidth: 2.5, color: fg),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (icon != null) ...[
                    Icon(icon, size: 28),
                    const SizedBox(width: 12),
                  ],
                  Flexible(
                    child: Text(
                      label.toUpperCase(),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}

enum CalmPrimaryVariant { violet, success, danger }
