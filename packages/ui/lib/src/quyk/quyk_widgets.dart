import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

/// Building blocks for the Quyk staff redesign. Presentational only.

/// White rounded card with a hairline border.
class QuykCard extends StatelessWidget {
  const QuykCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.color = Colors.white,
    this.radius = 20,
    this.borderColor = QuykColors.line,
    this.onTap,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color color;
  final double radius;
  final Color? borderColor;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(radius),
      side: borderColor == null
          ? BorderSide.none
          : BorderSide(color: borderColor!),
    );
    return Material(
      color: color,
      shape: shape,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(padding: padding, child: child),
      ),
    );
  }
}

/// Rounded pill label.
class QuykPill extends StatelessWidget {
  const QuykPill({
    super.key,
    required this.label,
    this.background = QuykColors.lime,
    this.foreground = QuykColors.green,
    this.icon,
    this.fontSize = 12,
    this.padding = const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
  });

  final String label;
  final Color background;
  final Color foreground;
  final IconData? icon;
  final double fontSize;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text.rich(
        TextSpan(
          children: [
            if (icon != null) ...[
              WidgetSpan(
                alignment: PlaceholderAlignment.middle,
                child: Padding(
                  padding: const EdgeInsets.only(right: 4),
                  child: Icon(icon, size: fontSize + 2, color: foreground),
                ),
              ),
            ],
            TextSpan(text: label),
          ],
        ),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          color: foreground,
          fontSize: fontSize,
          fontWeight: FontWeight.w600,
          height: 1.1,
        ),
      ),
    );
  }
}

/// Status pill used in tables: Called (lime), Waiting (mist), Failed (red).
class QuykStatusPill extends StatelessWidget {
  const QuykStatusPill({super.key, required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final s = status.toUpperCase();
    final (Color bg, Color fg, String label) = switch (s) {
      'CALLED' => (QuykColors.lime, QuykColors.green, 'Called'),
      'WAITING' => (QuykColors.mist, QuykColors.greenMuted, 'Waiting'),
      'HOLDING' => (QuykColors.warningTint, const Color(0xFF7A4B0C), 'On hold'),
      'COMPLETED' || 'SERVED' => (QuykColors.limeTint, QuykColors.green, 'Served'),
      'FAILED' => (QuykColors.dangerTint, QuykColors.danger, 'Failed'),
      'SENT' || 'DELIVERED' => (QuykColors.limeTint, QuykColors.green, 'Sent'),
      'PENDING' || 'QUEUED' => (QuykColors.mist, QuykColors.greenMuted, 'Pending'),
      'NO_SHOW' => (QuykColors.dangerTint, QuykColors.danger, 'No show'),
      'CANCELLED' => (QuykColors.dangerTint, QuykColors.danger, 'Cancelled'),
      'SKIPPED' => (QuykColors.mist, QuykColors.greenMuted, 'Skipped'),
      _ => (QuykColors.mist, QuykColors.greenMuted, _titleCase(s)),
    };
    return QuykPill(label: label, background: bg, foreground: fg, fontSize: 11);
  }
}

String _titleCase(String raw) {
  final words = raw.toLowerCase().replaceAll('_', ' ').split(' ');
  return words
      .where((w) => w.isNotEmpty)
      .map((w) => w[0].toUpperCase() + w.substring(1))
      .join(' ');
}

/// Circle holding a small icon (action tiles, settings rows, lines list).
class QuykIconBubble extends StatelessWidget {
  const QuykIconBubble({
    super.key,
    required this.icon,
    this.background = QuykColors.limeSoft,
    this.foreground = QuykColors.green,
    this.size = 36,
  });

  final IconData icon;
  final Color background;
  final Color foreground;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: background, shape: BoxShape.circle),
      child: Icon(icon, size: size * 0.5, color: foreground),
    );
  }
}

/// Initials avatar: lime on dark green by default, inverted with [lime].
class QuykAvatar extends StatelessWidget {
  const QuykAvatar({
    super.key,
    required this.name,
    this.size = 32,
    this.lime = false,
    this.initialsCount = 2,
  });

  final String name;
  final double size;
  final bool lime;
  final int initialsCount;

  @override
  Widget build(BuildContext context) {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty);
    final initials = parts.isEmpty
        ? '?'
        : parts.take(initialsCount).map((p) => p[0].toUpperCase()).join();
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: lime ? QuykColors.lime : QuykColors.green,
        shape: BoxShape.circle,
      ),
      child: Text(
        initials,
        style: TextStyle(
          color: lime ? QuykColors.green : QuykColors.lime,
          fontWeight: FontWeight.w700,
          fontSize: size * 0.36,
        ),
      ),
    );
  }
}

/// Page title + subtitle ("Guests", "Reviews", "Guest messages").
class QuykPageHeading extends StatelessWidget {
  const QuykPageHeading({super.key, required this.title, this.subtitle});

  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 26,
            fontWeight: FontWeight.w600,
            letterSpacing: -0.6,
            color: QuykColors.green,
            height: 1.1,
          ),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 6),
          Text(
            subtitle!,
            style: const TextStyle(fontSize: 13, color: QuykColors.muted),
          ),
        ],
      ],
    );
  }
}

/// Filter chip row item: dark green when selected, white outline otherwise.
class QuykFilterChip extends StatelessWidget {
  const QuykFilterChip({
    super.key,
    required this.label,
    required this.selected,
    required this.onTap,
    this.trailingStar = false,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;
  final bool trailingStar;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? QuykColors.green : Colors.white,
      shape: StadiumBorder(
        side: selected
            ? BorderSide.none
            : const BorderSide(color: QuykColors.field),
      ),
      child: InkWell(
        customBorder: const StadiumBorder(),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: selected ? QuykColors.lime : QuykColors.green,
                ),
              ),
              if (trailingStar) ...[
                const SizedBox(width: 4),
                const Icon(Icons.star_rounded, size: 15, color: QuykColors.star),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// White card with tappable action rows (icon bubble + title + subtitle + chevron).
class QuykActionTile extends StatelessWidget {
  const QuykActionTile({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return QuykCard(
      onTap: onTap,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      child: Row(
        children: [
          QuykIconBubble(icon: icon),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: QuykColors.ink,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(fontSize: 12, color: QuykColors.subtle),
                ),
              ],
            ),
          ),
          const Icon(Icons.chevron_right_rounded, color: QuykColors.subtle),
        ],
      ),
    );
  }
}

/// Column definition for [QuykTable].
class QuykColumn {
  const QuykColumn(this.label, {this.flex = 1, this.alignEnd = false});

  final String label;
  final int flex;
  final bool alignEnd;
}

/// Simple card table: uppercase header row, divided rows, optional row tap.
class QuykTable extends StatelessWidget {
  const QuykTable({
    super.key,
    required this.columns,
    required this.rows,
    this.onRowTap,
  });

  final List<QuykColumn> columns;
  final List<List<Widget>> rows;
  final void Function(int index)? onRowTap;

  Widget _cells(List<Widget> cells) {
    return Row(
      children: [
        for (var i = 0; i < columns.length; i++)
          Expanded(
            flex: columns[i].flex,
            child: Align(
              alignment: columns[i].alignEnd
                  ? Alignment.centerRight
                  : Alignment.centerLeft,
              child: i < cells.length ? cells[i] : const SizedBox.shrink(),
            ),
          ),
      ],
    );
  }

  /// Below this width rows render as stacked cards instead of columns.
  static const double stackedBreakpoint = 560;

  Widget _stacked(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var r = 0; r < rows.length; r++) ...[
          if (r > 0) const SizedBox(height: 10),
          QuykCard(
            onTap: onRowTap == null ? null : () => onRowTap!(r),
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (rows[r].isNotEmpty) rows[r].first,
                const SizedBox(height: 6),
                for (var i = 1; i < rows[r].length && i < columns.length; i++)
                  if (rows[r][i] is! SizedBox)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        children: [
                          SizedBox(
                            width: 96,
                            child: Text(
                              columns[i].label.toUpperCase(),
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                letterSpacing: 0.6,
                                color: QuykColors.subtle,
                              ),
                            ),
                          ),
                          Expanded(
                            child: Align(alignment: Alignment.centerLeft, child: rows[r][i]),
                          ),
                        ],
                      ),
                    ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) =>
          constraints.maxWidth < stackedBreakpoint ? _stacked(context) : _table(context),
    );
  }

  Widget _table(BuildContext context) {
    return QuykCard(
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 14, 18, 12),
            child: _cells([
              for (final c in columns)
                Text(
                  c.label.toUpperCase(),
                  style: const TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.6,
                    color: QuykColors.subtle,
                  ),
                ),
            ]),
          ),
          for (var r = 0; r < rows.length; r++) ...[
            const Divider(height: 1, thickness: 1, color: QuykColors.line),
            InkWell(
              onTap: onRowTap == null ? null : () => onRowTap!(r),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 15),
                child: _cells(rows[r]),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Plain-text table cell helpers.
class QuykCellText extends StatelessWidget {
  const QuykCellText(this.text, {super.key, this.strong = false, this.green = false});

  final String text;
  final bool strong;
  final bool green;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: TextStyle(
        fontSize: 13.5,
        fontWeight: strong ? FontWeight.w700 : FontWeight.w400,
        color: green ? QuykColors.green : QuykColors.ink,
      ),
    );
  }
}
