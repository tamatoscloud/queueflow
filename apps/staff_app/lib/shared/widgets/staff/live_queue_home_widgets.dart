import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../../core/models/queue_entry_model.dart';
import '../../../core/models/queue_model.dart';
import 'service_mode_helpers.dart';

String _formatWaitMinutes(double minutes) {
  if (minutes == minutes.roundToDouble()) {
    return minutes.toInt().toString();
  }
  return minutes.toStringAsFixed(1);
}

/// Soft pill showing how many guests are waiting — plain language for hosts.
class WaitingCountBanner extends StatelessWidget {
  const WaitingCountBanner({
    super.key,
    required this.count,
  });

  final int count;

  @override
  Widget build(BuildContext context) {
    final empty = count <= 0;
    final bg = empty
        ? AppColors.successLight
        : AppColors.calmLilac.withValues(alpha: 0.85);
    final fg = empty ? AppColors.success : AppColors.primaryDark;
    final icon = empty ? Icons.celebration_outlined : Icons.groups_rounded;
    final text = empty
        ? 'No one is waiting right now'
        : count == 1
            ? '1 guest is waiting'
            : '$count guests are waiting';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.md,
      ),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: AppRadius.lgAll,
        border: Border.all(color: fg.withValues(alpha: 0.18)),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.85),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: fg, size: 26),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Text(
              text,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppColors.calmCharcoal,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Big, friendly “who to call” card — the only thing hosts must understand.
class WhosNextHeroCard extends StatelessWidget {
  const WhosNextHeroCard({
    super.key,
    required this.entry,
    required this.serviceMode,
    required this.detailLine,
    this.estimatedWaitMinutes,
    this.badgeLabel,
    this.footerHint,
  });

  final QueueEntryModel entry;
  final String serviceMode;
  final String detailLine;
  final double? estimatedWaitMinutes;
  /// Defaults to "WHO'S NEXT". Use e.g. "CALLED" for the active guest.
  final String? badgeLabel;
  final String? footerHint;

  @override
  Widget build(BuildContext context) {
    final mode = ServiceModeInfo.forMode(serviceMode);
    final code = entry.displayCode.isNotEmpty
        ? entry.displayCode
        : (entry.customerName ?? 'Guest');
    final name = entry.customerName ?? 'Guest';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.calmLilacLight.withValues(alpha: 0.95),
            AppColors.calmLilac.withValues(alpha: 0.75),
            Colors.white,
          ],
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: AppColors.calmViolet.withValues(alpha: 0.28),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.calmViolet.withValues(alpha: 0.14),
            blurRadius: 24,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.primaryDark,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(mode.icon, size: 16, color: Colors.white),
                    const SizedBox(width: 6),
                    Text(
                      badgeLabel ?? "WHO'S NEXT",
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.6,
                          ),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              Text(
                mode.label,
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      color: AppColors.primaryDark,
                      fontWeight: FontWeight.w600,
                    ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(
            code,
            style: Theme.of(context).textTheme.displayMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                  color: AppColors.primaryDark,
                  letterSpacing: 1.2,
                  height: 1,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            name,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: AppColors.calmCharcoal,
                ),
          ),
          if (entry.customerPhone != null &&
              entry.customerPhone!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Row(
              children: [
                const Icon(
                  Icons.phone_outlined,
                  size: 18,
                  color: AppColors.calmWarmGray,
                ),
                const SizedBox(width: 6),
                Text(
                  entry.customerPhone!,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: AppColors.calmWarmGray,
                        fontWeight: FontWeight.w500,
                      ),
                ),
              ],
            ),
          ],
          const SizedBox(height: AppSpacing.md),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _InfoChip(icon: Icons.people_outline, label: detailLine),
              if (estimatedWaitMinutes != null && estimatedWaitMinutes! > 0)
                _InfoChip(
                  icon: Icons.schedule_outlined,
                  label: 'About ${_formatWaitMinutes(estimatedWaitMinutes!)} min',
                ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            footerHint ?? 'Tap the big button below to call them.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.calmWarmGray,
                  fontWeight: FontWeight.w500,
                ),
          ),
        ],
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  const _InfoChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppColors.calmBorder),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: AppColors.primaryDark),
          const SizedBox(width: 6),
          Text(
            label,
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  color: AppColors.calmCharcoal,
                  fontWeight: FontWeight.w600,
                ),
          ),
        ],
      ),
    );
  }
}

/// Soft secondary action used under the hero.
class FriendlyActionTile extends StatelessWidget {
  const FriendlyActionTile({
    super.key,
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.onTap,
    this.tint = AppColors.waitingSoft,
    this.iconColor = AppColors.primaryDark,
  });

  final IconData icon;
  final String label;
  final String subtitle;
  final VoidCallback onTap;
  final Color tint;
  final Color iconColor;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Ink(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppColors.calmBorder),
            boxShadow: [
              BoxShadow(
                color: AppColors.calmCharcoal.withValues(alpha: 0.04),
                blurRadius: 10,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: tint,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(icon, color: iconColor, size: 24),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: AppColors.calmCharcoal,
                          ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppColors.calmWarmGray,
                          ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded, color: AppColors.calmWarmGray),
            ],
          ),
        ),
      ),
    );
  }
}

/// Waiting guest card for the Live Queue grid — high-contrast text on white.
class OtherWaitingTile extends StatelessWidget {
  const OtherWaitingTile({
    super.key,
    required this.entry,
    required this.onTap,
  });

  final QueueEntryModel entry;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final code = entry.displayCode.isNotEmpty ? entry.displayCode : '—';
    final name = entry.customerName?.trim().isNotEmpty == true
        ? entry.customerName!
        : 'Guest';

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Ink(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppColors.calmBorder),
            boxShadow: [
              BoxShadow(
                color: AppColors.calmCharcoal.withValues(alpha: 0.05),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.waitingSoft,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      code,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w800,
                            color: AppColors.primaryDark,
                          ),
                    ),
                  ),
                  const Spacer(),
                  const Icon(
                    Icons.chevron_right_rounded,
                    color: AppColors.neutral400,
                    size: 22,
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                name,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: AppColors.calmCharcoal,
                      height: 1.2,
                    ),
              ),
              const SizedBox(height: 4),
              Text(
                'Party of ${entry.partySize}',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppColors.neutral700,
                      fontWeight: FontWeight.w600,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Compact queue switcher with friendly labels.
class QueuePickerCard extends StatelessWidget {
  const QueuePickerCard({
    super.key,
    required this.queue,
    required this.selected,
    required this.onTap,
  });

  final QueueModel queue;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final mode = ServiceModeInfo.forMode(queue.serviceMode);
    final waiting = queue.waitingCount;
    final waitingText = waiting == 0
        ? 'Empty'
        : waiting == 1
            ? '1 waiting'
            : '$waiting waiting';

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Ink(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            color: selected
                ? AppColors.calmLilac.withValues(alpha: 0.55)
                : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: selected
                  ? AppColors.calmViolet.withValues(alpha: 0.45)
                  : AppColors.calmBorder,
              width: selected ? 1.5 : 1,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: mode.color.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(mode.icon, color: mode.color, size: 22),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      queue.name,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    Text(
                      '${mode.label} · $waitingText',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppColors.calmWarmGray,
                          ),
                    ),
                  ],
                ),
              ),
              if (selected)
                const Icon(Icons.check_circle, color: AppColors.primaryDark)
              else
                const Icon(Icons.chevron_right_rounded, color: AppColors.neutral400),
            ],
          ),
        ),
      ),
    );
  }
}
