import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

enum AppButtonVariant { primary, secondary, outline, ghost, danger }

enum AppButtonSize { sm, md, lg, xl }

/// Unified button primitive with variants, loading state, and icon support.
///
/// Use [AppButtonSize.xl] (min height 80) for touchscreen staff actions
/// such as CALL NEXT / COMPLETE.
class AppButton extends StatelessWidget {
  const AppButton({
    required this.label,
    required this.onPressed,
    super.key,
    this.variant = AppButtonVariant.primary,
    this.size = AppButtonSize.md,
    this.isLoading = false,
    this.icon,
    this.fullWidth = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final AppButtonVariant variant;
  final AppButtonSize size;
  final bool isLoading;
  final IconData? icon;
  final bool fullWidth;

  double get _minHeight => switch (size) {
        AppButtonSize.sm => 40,
        AppButtonSize.md => 48,
        AppButtonSize.lg => 56,
        AppButtonSize.xl => 80,
      };

  @override
  Widget build(BuildContext context) {
    final padding = switch (size) {
      AppButtonSize.sm => const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      AppButtonSize.md => const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      AppButtonSize.lg => const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      AppButtonSize.xl => const EdgeInsets.symmetric(horizontal: 28, vertical: 22),
    };

    final textStyle = switch (size) {
      AppButtonSize.sm => Theme.of(context).textTheme.labelMedium,
      AppButtonSize.md => Theme.of(context).textTheme.labelLarge,
      AppButtonSize.lg => Theme.of(context).textTheme.titleSmall?.copyWith(
          fontWeight: FontWeight.w700,
          letterSpacing: 0.4,
        ),
      AppButtonSize.xl => Theme.of(context).textTheme.titleMedium?.copyWith(
          fontWeight: FontWeight.w800,
          letterSpacing: 0.8,
        ),
    };

    final iconSize = switch (size) {
      AppButtonSize.sm => 16.0,
      AppButtonSize.md => 18.0,
      AppButtonSize.lg => 22.0,
      AppButtonSize.xl => 28.0,
    };

    final spinnerSize = size == AppButtonSize.sm ? 16.0 : (size == AppButtonSize.xl ? 24.0 : 20.0);

    final child = isLoading
        ? SizedBox(
            height: spinnerSize,
            width: spinnerSize,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: variant == AppButtonVariant.primary ||
                      variant == AppButtonVariant.danger
                  ? Colors.white
                  : AppColors.primary,
            ),
          )
        : Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[
                Icon(icon, size: iconSize),
                SizedBox(width: size == AppButtonSize.xl ? 12 : 8),
              ],
              Flexible(
                // Drop the text theme's colour so the label follows the
                // button's foreground (white on primary, primary on ghost…).
                child: Text(
                  label,
                  style: textStyle == null
                      ? null
                      : TextStyle(
                          fontFamily: textStyle.fontFamily,
                          fontSize: textStyle.fontSize,
                          fontWeight: textStyle.fontWeight,
                          letterSpacing: textStyle.letterSpacing,
                          height: textStyle.height,
                        ),
                  textAlign: TextAlign.center,
                ),
              ),
            ],
          );

    ButtonStyle mergeMinHeight(ButtonStyle base) {
      return base.merge(
        ButtonStyle(
          minimumSize: WidgetStatePropertyAll(Size(0, _minHeight)),
          tapTargetSize: MaterialTapTargetSize.padded,
        ),
      );
    }

    final button = switch (variant) {
      AppButtonVariant.primary => FilledButton(
          onPressed: isLoading ? null : onPressed,
          style: mergeMinHeight(
            FilledButton.styleFrom(
              padding: padding,
              backgroundColor: size == AppButtonSize.xl ? AppColors.primaryDark : null,
            ),
          ),
          child: child,
        ),
      AppButtonVariant.secondary => FilledButton(
          onPressed: isLoading ? null : onPressed,
          style: mergeMinHeight(
            FilledButton.styleFrom(
              padding: padding,
              backgroundColor: AppColors.primary.withValues(alpha: 0.12),
              foregroundColor: AppColors.primary,
            ),
          ),
          child: child,
        ),
      AppButtonVariant.outline => OutlinedButton(
          onPressed: isLoading ? null : onPressed,
          style: mergeMinHeight(OutlinedButton.styleFrom(padding: padding)),
          child: child,
        ),
      AppButtonVariant.ghost => TextButton(
          onPressed: isLoading ? null : onPressed,
          style: mergeMinHeight(TextButton.styleFrom(padding: padding)),
          child: child,
        ),
      AppButtonVariant.danger => FilledButton(
          onPressed: isLoading ? null : onPressed,
          style: mergeMinHeight(
            FilledButton.styleFrom(
              padding: padding,
              backgroundColor: AppColors.danger,
              foregroundColor: Colors.white,
            ),
          ),
          child: child,
        ),
    };

    if (fullWidth) {
      return SizedBox(width: double.infinity, child: button);
    }
    return button;
  }
}

/// Legacy alias — prefer [AppButton].
class AppPrimaryButton extends StatelessWidget {
  const AppPrimaryButton({
    required this.label,
    required this.onPressed,
    super.key,
    this.isLoading = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    return AppButton(
      label: label,
      onPressed: onPressed,
      isLoading: isLoading,
      fullWidth: true,
    );
  }
}
