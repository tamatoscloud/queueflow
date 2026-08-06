import 'package:flutter/material.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

/// Wraps a screen's content with a dimmed, non-interactive overlay while
/// `isLoading` is true. Generic infra, no feature-specific state handling.
class LoadingOverlay extends StatelessWidget {
  const LoadingOverlay({
    required this.isLoading,
    required this.child,
    super.key,
  });

  final bool isLoading;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        child,
        if (isLoading)
          Positioned.fill(
            child: AbsorbPointer(
              child: Container(
                color: Colors.black.withValues(alpha: 0.2),
                child: const Center(child: AppLoadingIndicator(size: 32)),
              ),
            ),
          ),
      ],
    );
  }
}
