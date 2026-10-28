import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../shared/widgets/quyk/quyk_widgets.dart';
import '../../theme/quyk_staff_theme.dart';

/// Guest shown in the "Who's next" hero card.
class LiveBoardGuest {
  const LiveBoardGuest({
    required this.displayCode,
    required this.name,
    this.phone,
    this.contextLabel,
    this.waitingMinutes,
    this.estimatedMinutes,
  });

  final String displayCode;
  final String name;
  final String? phone;

  /// "Party of 4", "Order #4821", "Black Toyota".
  final String? contextLabel;
  final int? waitingMinutes;
  final double? estimatedMinutes;
}

/// One line (queue) in the right-hand "Lines" panel.
class LiveBoardLine {
  const LiveBoardLine({
    required this.id,
    required this.name,
    required this.serviceMode,
    required this.waiting,
    required this.selected,
  });

  final String id;
  final String name;

  /// DINE_IN, TAKEAWAY or DRIVE_IN.
  final String serviceMode;
  final int waiting;
  final bool selected;
}

String liveBoardModeLabel(String mode) => switch (mode) {
      'TAKEAWAY' => 'Takeaway',
      'DRIVE_IN' => 'Drive-in',
      _ => 'Dine-in',
    };

String _formatMinutes(double minutes) =>
    minutes == minutes.roundToDouble() ? minutes.toInt().toString() : minutes.toStringAsFixed(1);

/// Presentational Live queue (Figma "Quyk Redesign Staff", screen 1).
class LiveQueueBoard extends StatelessWidget {
  const LiveQueueBoard({
    super.key,
    required this.waitingCount,
    required this.lines,
    required this.callLabel,
    this.hero,
    this.heroBadge = "Who's next",
    this.heroLineLabel,
    this.heroMessage,
    this.callBusy = false,
    this.actionsEnabled = true,
    this.onCallNext,
    this.onHold,
    this.onSkip,
    this.onMove,
    this.onHeroTap,
    this.onWalkIn,
    this.onFullList,
    this.onSelectLine,
    this.notice,
  });

  final int waitingCount;
  final LiveBoardGuest? hero;
  final String heroBadge;

  /// "Dine-in · VIP Guests" (top-right of the hero).
  final String? heroLineLabel;

  /// Shown in the hero when there is no guest (e.g. queue empty).
  final String? heroMessage;
  final List<LiveBoardLine> lines;
  final String callLabel;
  final bool callBusy;
  final bool actionsEnabled;
  final VoidCallback? onCallNext;
  final VoidCallback? onHold;
  final VoidCallback? onSkip;
  final VoidCallback? onMove;
  final VoidCallback? onHeroTap;
  final VoidCallback? onWalkIn;
  final VoidCallback? onFullList;
  final ValueChanged<String>? onSelectLine;

  /// Optional banner above the board (offline notice).
  final Widget? notice;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 900;
        final main = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (notice != null) ...[notice!, const SizedBox(height: 12)],
            _WaitingChip(count: waitingCount),
            const SizedBox(height: 16),
            _HeroCard(
              guest: hero,
              badge: heroBadge,
              lineLabel: heroLineLabel,
              message: heroMessage,
              callLabel: callLabel,
              callBusy: callBusy,
              actionsEnabled: actionsEnabled,
              large: wide,
              onCallNext: onCallNext,
              onHold: onHold,
              onSkip: onSkip,
              onMove: onMove,
              onTap: onHeroTap,
            ),
            const SizedBox(height: 16),
            _ActionTiles(
              wide: constraints.maxWidth >= 600,
              onWalkIn: actionsEnabled ? onWalkIn : null,
              onFullList: onFullList,
              fullListSubtitle: actionsEnabled
                  ? 'Hold, skip, or move guests'
                  : 'Read-only while offline',
            ),
          ],
        );
        final linesPanel = _LinesPanel(lines: lines, onSelect: onSelectLine);

        if (!wide) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              main,
              if (lines.length > 1) ...[const SizedBox(height: 16), linesPanel],
            ],
          );
        }
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: main),
            const SizedBox(width: 24),
            SizedBox(width: 372, child: linesPanel),
          ],
        );
      },
    );
  }
}

class _WaitingChip extends StatelessWidget {
  const _WaitingChip({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    final text = count <= 0
        ? 'No one is waiting right now'
        : count == 1
            ? '1 guest is waiting'
            : '$count guests are waiting';
    return Container(
      padding: const EdgeInsets.fromLTRB(10, 10, 20, 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: QuykColors.line),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const QuykIconBubble(icon: Icons.people_outline_rounded, size: 36),
          const SizedBox(width: 10),
          Text(
            text,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: QuykColors.ink,
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroCard extends StatelessWidget {
  const _HeroCard({
    required this.guest,
    required this.badge,
    required this.lineLabel,
    required this.message,
    required this.callLabel,
    required this.callBusy,
    required this.actionsEnabled,
    required this.large,
    required this.onCallNext,
    required this.onHold,
    required this.onSkip,
    required this.onMove,
    required this.onTap,
  });

  final LiveBoardGuest? guest;
  final String badge;
  final String? lineLabel;
  final String? message;
  final String callLabel;
  final bool callBusy;
  final bool actionsEnabled;
  final bool large;
  final VoidCallback? onCallNext;
  final VoidCallback? onHold;
  final VoidCallback? onSkip;
  final VoidCallback? onMove;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final g = guest;
    final chips = <String>[
      if (g?.contextLabel != null) g!.contextLabel!,
      if (g?.waitingMinutes != null)
        g!.waitingMinutes! < 1 ? 'Waiting <1 min' : 'Waiting ${g.waitingMinutes} min',
      if (g?.estimatedMinutes != null && g!.estimatedMinutes! > 0)
        'Est. ${_formatMinutes(g.estimatedMinutes!)} min',
    ];

    return Material(
      color: QuykColors.green,
      borderRadius: BorderRadius.circular(large ? 36 : 28),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: EdgeInsets.all(large ? 32 : 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  QuykPill(label: badge, fontSize: 12),
                  const SizedBox(width: 12),
                  if (lineLabel != null)
                    Expanded(
                      child: Text(
                        lineLabel!,
                        textAlign: TextAlign.right,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                ],
              ),
              SizedBox(height: large ? 16 : 12),
              if (g == null)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Text(
                    message ?? 'No one is waiting right now',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: large ? 28 : 22,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                )
              else ...[
                FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Text(
                    g.displayCode,
                    semanticsLabel: 'Ticket ${g.displayCode}',
                    style: TextStyle(
                      color: QuykColors.lime,
                      fontSize: large ? 104 : 68,
                      fontWeight: FontWeight.w700,
                      height: 1,
                      letterSpacing: -2,
                    ),
                  ),
                ),
                SizedBox(height: large ? 14 : 10),
                Text(
                  g.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: large ? 32 : 24,
                    fontWeight: FontWeight.w700,
                    height: 1.1,
                  ),
                ),
                if (g.phone != null && g.phone!.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.phone_outlined, size: 16, color: Colors.white70),
                      const SizedBox(width: 6),
                      Text(
                        g.phone!,
                        style: const TextStyle(color: Colors.white70, fontSize: 15),
                      ),
                    ],
                  ),
                ],
                if (chips.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final c in chips)
                        QuykPill(
                          label: c,
                          background: QuykColors.greenPanel,
                          foreground: Colors.white,
                          fontSize: 12.5,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                        ),
                    ],
                  ),
                ],
              ],
              SizedBox(height: large ? 24 : 18),
              SizedBox(
                width: double.infinity,
                height: large ? 66 : 56,
                child: FilledButton.icon(
                  onPressed: actionsEnabled && !callBusy ? onCallNext : null,
                  style: FilledButton.styleFrom(
                    backgroundColor: QuykColors.lime,
                    foregroundColor: QuykColors.green,
                    disabledBackgroundColor: QuykColors.lime.withValues(alpha: 0.45),
                    disabledForegroundColor: QuykColors.green.withValues(alpha: 0.6),
                    textStyle: TextStyle(
                      fontFamily: quykFontFamily,
                      fontSize: large ? 17 : 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  icon: callBusy
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.2,
                            color: QuykColors.green,
                          ),
                        )
                      : const Icon(Icons.room_service_outlined, size: 22),
                  label: Text(callLabel),
                ),
              ),
              if (g != null) ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _GhostButton(
                        label: 'Hold',
                        onPressed: actionsEnabled ? onHold : null,
                        large: large,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _GhostButton(
                        label: 'Skip',
                        onPressed: actionsEnabled ? onSkip : null,
                        large: large,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _GhostButton(
                        label: 'Move',
                        onPressed: actionsEnabled ? onMove : null,
                        large: large,
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _GhostButton extends StatelessWidget {
  const _GhostButton({required this.label, required this.onPressed, required this.large});

  final String label;
  final VoidCallback? onPressed;
  final bool large;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: large ? 54 : 46,
      child: OutlinedButton(
        onPressed: onPressed,
        style: OutlinedButton.styleFrom(
          foregroundColor: Colors.white,
          disabledForegroundColor: Colors.white38,
          backgroundColor: QuykColors.green,
          side: BorderSide(color: Colors.white.withValues(alpha: 0.22)),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          textStyle: const TextStyle(fontFamily: quykFontFamily, fontSize: 15, fontWeight: FontWeight.w600),
        ),
        child: Text(label),
      ),
    );
  }
}

class _ActionTiles extends StatelessWidget {
  const _ActionTiles({
    required this.wide,
    required this.onWalkIn,
    required this.onFullList,
    required this.fullListSubtitle,
  });

  final bool wide;
  final VoidCallback? onWalkIn;
  final VoidCallback? onFullList;
  final String fullListSubtitle;

  @override
  Widget build(BuildContext context) {
    final walkIn = QuykActionTile(
      icon: Icons.person_add_alt_outlined,
      title: 'Add a walk-in guest',
      subtitle: 'Someone arrived without scanning the QR',
      onTap: onWalkIn,
    );
    final fullList = QuykActionTile(
      icon: Icons.format_list_bulleted_rounded,
      title: 'See the full waiting list',
      subtitle: fullListSubtitle,
      onTap: onFullList,
    );
    if (!wide) {
      return Column(children: [walkIn, const SizedBox(height: 10), fullList]);
    }
    return Row(
      children: [
        Expanded(child: walkIn),
        const SizedBox(width: 14),
        Expanded(child: fullList),
      ],
    );
  }
}

class _LinesPanel extends StatelessWidget {
  const _LinesPanel({required this.lines, required this.onSelect});

  final List<LiveBoardLine> lines;
  final ValueChanged<String>? onSelect;

  @override
  Widget build(BuildContext context) {
    return QuykCard(
      radius: 26,
      padding: const EdgeInsets.fromLTRB(18, 20, 18, 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Lines',
            style: TextStyle(
              fontSize: 21,
              fontWeight: FontWeight.w600,
              letterSpacing: -0.3,
              color: QuykColors.green,
            ),
          ),
          const SizedBox(height: 2),
          const Text(
            'Switch line if you run more than one.',
            style: TextStyle(fontSize: 12, color: QuykColors.subtle),
          ),
          const SizedBox(height: 14),
          for (final line in lines) ...[
            _LineRow(line: line, onTap: onSelect == null ? null : () => onSelect!(line.id)),
            const SizedBox(height: 10),
          ],
        ],
      ),
    );
  }
}

class _LineRow extends StatelessWidget {
  const _LineRow({required this.line, required this.onTap});

  final LiveBoardLine line;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final (IconData icon, Color bubble) = switch (line.serviceMode) {
      'TAKEAWAY' => (Icons.shopping_bag_outlined, QuykColors.peach),
      'DRIVE_IN' => (Icons.directions_car_outlined, QuykColors.mist),
      _ => (Icons.restaurant_rounded, QuykColors.limeSoft),
    };
    final waitingText = line.waiting == 0
        ? 'Empty'
        : line.waiting == 1
            ? '1 waiting'
            : '${line.waiting} waiting';
    return Material(
      color: line.selected ? QuykColors.limeTint : const Color(0xFFFBFCF8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: line.selected ? QuykColors.green : QuykColors.line,
          width: line.selected ? 1.4 : 1,
        ),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          child: Row(
            children: [
              QuykIconBubble(icon: icon, background: bubble, size: 42),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      line.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: QuykColors.ink,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${liveBoardModeLabel(line.serviceMode)} · $waitingText',
                      style: const TextStyle(fontSize: 12, color: QuykColors.subtle),
                    ),
                  ],
                ),
              ),
              if (line.selected)
                Container(
                  width: 24,
                  height: 24,
                  decoration: const BoxDecoration(
                    color: QuykColors.green,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.check_rounded, size: 16, color: QuykColors.lime),
                )
              else
                const Icon(Icons.chevron_right_rounded, color: QuykColors.subtle),
            ],
          ),
        ),
      ),
    );
  }
}
