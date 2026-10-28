import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../../shared/widgets/quyk/quyk_frame.dart';

/// Quyk sign-in chrome: green brand panel beside a cream form column on
/// tablets, stacked brand header above the form on phones.
class QuykAuthLayout extends StatelessWidget {
  const QuykAuthLayout({
    super.key,
    required this.title,
    required this.subtitle,
    required this.child,
    this.onBack,
  });

  final String title;
  final String subtitle;
  final Widget child;
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 900;
    final form = Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (onBack != null)
                Align(
                  alignment: Alignment.centerLeft,
                  child: IconButton(
                    tooltip: 'Back',
                    onPressed: onBack,
                    icon: const Icon(Icons.arrow_back_rounded, color: QuykColors.green),
                  ),
                ),
              if (!wide) ...[
                const Align(alignment: Alignment.centerLeft, child: QuykLogoTile(size: 52)),
                const SizedBox(height: 20),
              ],
              Text(
                title,
                style: const TextStyle(
                  fontSize: 30,
                  fontWeight: FontWeight.w600,
                  letterSpacing: -0.6,
                  color: QuykColors.green,
                ),
              ),
              const SizedBox(height: 6),
              Text(subtitle, style: const TextStyle(fontSize: 15, color: QuykColors.muted)),
              const SizedBox(height: 28),
              child,
            ],
          ),
        ),
      ),
    );

    return Scaffold(
      backgroundColor: QuykColors.cream,
      body: SafeArea(
        child: wide
            ? Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Expanded(flex: 5, child: _BrandPanel()),
                  Expanded(flex: 6, child: form),
                ],
              )
            : form,
      ),
    );
  }
}

class _BrandPanel extends StatelessWidget {
  const _BrandPanel();

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(40),
      decoration: BoxDecoration(
        color: QuykColors.green,
        borderRadius: BorderRadius.circular(36),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const QuykLogoTile(size: 56),
          const Spacer(),
          const Text(
            'Run the floor\nwithout the shouting.',
            style: TextStyle(
              fontSize: 40,
              height: 1.1,
              fontWeight: FontWeight.w600,
              letterSpacing: -1,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Call the next guest, keep every line moving and see who is waiting — all from one screen.',
            style: TextStyle(fontSize: 16, height: 1.4, color: Colors.white.withValues(alpha: 0.72)),
          ),
          const SizedBox(height: 28),
          const Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _Chip('Live queue'),
              _Chip('Walk-ins'),
              _Chip('Guest alerts'),
            ],
          ),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: QuykColors.greenPanel,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: QuykColors.lime),
      ),
    );
  }
}

/// Lime-on-green primary action used on the auth screens.
class QuykAuthButton extends StatelessWidget {
  const QuykAuthButton({super.key, required this.label, required this.onPressed, this.loading = false});

  final String label;
  final VoidCallback? onPressed;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 56,
      child: FilledButton(
        onPressed: loading ? null : onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: QuykColors.green,
          foregroundColor: QuykColors.lime,
          disabledBackgroundColor: QuykColors.green.withValues(alpha: 0.7),
          disabledForegroundColor: QuykColors.lime,
          shape: const StadiumBorder(),
        ),
        child: loading
            ? const SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(strokeWidth: 2.4, color: QuykColors.lime),
              )
            : Text(label),
      ),
    );
  }
}

/// Inline error strip for the auth forms.
class QuykAuthError extends StatelessWidget {
  const QuykAuthError(this.message, {super.key});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: QuykColors.dangerTint,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline_rounded, size: 18, color: QuykColors.danger),
          const SizedBox(width: 8),
          Expanded(
            child: Text(message, style: const TextStyle(fontSize: 13, color: QuykColors.danger)),
          ),
        ],
      ),
    );
  }
}
