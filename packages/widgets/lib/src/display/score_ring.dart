import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

/// Circular health/score indicator with animated fill.
class ScoreRing extends StatelessWidget {
  const ScoreRing({
    required this.score,
    required this.label,
    super.key,
    this.size = 96,
    this.color,
  });

  final double score;
  final String label;
  final double size;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final accent = color ?? AppColors.primary;
    final clamped = score.clamp(0, 100) / 100;

    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          SizedBox(
            width: size,
            height: size,
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: clamped),
              duration: AppMotion.counter,
              curve: AppMotion.easeOut,
              builder: (context, value, _) => CircularProgressIndicator(
                value: value,
                strokeWidth: 8,
                backgroundColor: accent.withValues(alpha: 0.12),
                color: accent,
                strokeCap: StrokeCap.round,
              ),
            ),
          ),
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '${score.round()}',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: accent,
                    ),
              ),
              Text(
                label,
                style: Theme.of(context).textTheme.labelSmall,
              ),
            ],
          ),
        ],
      ),
    );
  }
}
