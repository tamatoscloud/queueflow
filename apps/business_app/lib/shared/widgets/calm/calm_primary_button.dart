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
    this.height = 56,
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
      CalmPrimaryVariant.violet => (QuykColors.green, QuykColors.lime),
      CalmPrimaryVariant.success => (QuykColors.green, QuykColors.lime),
      CalmPrimaryVariant.danger => (QuykColors.danger, Colors.white),
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
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        ),
        child: isLoading
            ? SizedBox(
                height: 22,
                width: 22,
                child: CircularProgressIndicator(strokeWidth: 2.5, color: fg),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (icon != null) ...[Icon(icon, size: 22), const SizedBox(width: 10)],
                  Text(label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                ],
              ),
      ),
    );
  }
}

enum CalmPrimaryVariant { violet, success, danger }
