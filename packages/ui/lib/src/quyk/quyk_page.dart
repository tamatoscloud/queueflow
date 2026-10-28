import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import 'quyk_widgets.dart';

/// Standard scrolling page body inside a Quyk app frame: optional back
/// button, title + subtitle, a primary action on the right, then content.
class QuykPage extends StatelessWidget {
  const QuykPage({
    super.key,
    required this.title,
    required this.children,
    this.subtitle,
    this.action,
    this.back = false,
    this.onBack,
    this.onRefresh,
    this.maxWidth,
    this.controller,
  });

  final String title;
  final String? subtitle;

  /// Primary page action (e.g. a "New line" button).
  final Widget? action;

  /// Shows a back arrow that pops the route (or calls [onBack]).
  final bool back;
  final VoidCallback? onBack;
  final Future<void> Function()? onRefresh;

  /// Caps the content width (forms read better narrower).
  final double? maxWidth;
  final ScrollController? controller;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final compact = MediaQuery.sizeOf(context).width < 720;
    final header = Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (back) ...[
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: IconButton.filledTonal(
              tooltip: 'Back',
              style: IconButton.styleFrom(backgroundColor: Colors.white, foregroundColor: QuykColors.green),
              onPressed: onBack ??
                  () {
                    final nav = Navigator.of(context);
                    if (nav.canPop()) nav.pop();
                  },
              icon: const Icon(Icons.arrow_back_rounded),
            ),
          ),
          const SizedBox(width: 12),
        ],
        Expanded(child: QuykPageHeading(title: title, subtitle: subtitle)),
        if (action != null) ...[const SizedBox(width: 12), action!],
      ],
    );

    Widget body = ListView(
      controller: controller,
      physics: const AlwaysScrollableScrollPhysics(),
      padding: EdgeInsets.fromLTRB(compact ? 16 : 32, 8, compact ? 16 : 32, 40),
      children: [
        header,
        const SizedBox(height: 20),
        if (maxWidth == null)
          ...children
        else
          Align(
            alignment: Alignment.topLeft,
            child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: maxWidth!),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: children),
            ),
          ),
      ],
    );
    if (onRefresh != null) {
      body = RefreshIndicator(
        color: QuykColors.green,
        backgroundColor: Colors.white,
        onRefresh: onRefresh!,
        child: body,
      );
    }
    return Material(type: MaterialType.transparency, child: body);
  }
}

/// Responsive grid: as many columns as fit [minTileWidth], equal heights per row.
class QuykGrid extends StatelessWidget {
  const QuykGrid({
    super.key,
    required this.children,
    this.minTileWidth = 280,
    this.spacing = 14,
  });

  final List<Widget> children;
  final double minTileWidth;
  final double spacing;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = (constraints.maxWidth / minTileWidth).floor().clamp(1, 4);
        final rows = <Widget>[];
        for (var i = 0; i < children.length; i += columns) {
          final slice = children.skip(i).take(columns).toList();
          rows.add(
            Padding(
              padding: EdgeInsets.only(bottom: i + columns < children.length ? spacing : 0),
              child: IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (var c = 0; c < columns; c++) ...[
                      if (c > 0) SizedBox(width: spacing),
                      Expanded(child: c < slice.length ? slice[c] : const SizedBox.shrink()),
                    ],
                  ],
                ),
              ),
            ),
          );
        }
        return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: rows);
      },
    );
  }
}

/// White metric tile: icon bubble, big value, label, optional hint.
class QuykStatTile extends StatelessWidget {
  const QuykStatTile({
    super.key,
    required this.label,
    required this.value,
    this.icon,
    this.hint,
    this.highlight = false,
    this.onTap,
  });

  final String label;
  final String value;
  final IconData? icon;
  final String? hint;

  /// Dark green tile with lime value, for the headline metric.
  final bool highlight;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final fg = highlight ? Colors.white : QuykColors.ink;
    return QuykCard(
      onTap: onTap,
      color: highlight ? QuykColors.green : Colors.white,
      borderColor: highlight ? null : QuykColors.line,
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (icon != null) ...[
                QuykIconBubble(
                  icon: icon!,
                  size: 32,
                  background: highlight ? QuykColors.greenPanel : QuykColors.limeSoft,
                  foreground: highlight ? QuykColors.lime : QuykColors.green,
                ),
                const SizedBox(width: 10),
              ],
              Expanded(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: highlight ? Colors.white.withValues(alpha: 0.8) : QuykColors.muted,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            value,
            style: TextStyle(
              fontSize: 30,
              height: 1.05,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.8,
              color: highlight ? QuykColors.lime : fg,
            ),
          ),
          if (hint != null) ...[
            const SizedBox(height: 6),
            Text(
              hint!,
              style: TextStyle(
                fontSize: 12,
                color: highlight ? Colors.white.withValues(alpha: 0.7) : QuykColors.subtle,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Small section title above a group of cards.
class QuykSectionTitle extends StatelessWidget {
  const QuykSectionTitle(this.title, {super.key, this.trailing});

  final String title;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Expanded(
            child: Text(
              title,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: QuykColors.ink),
            ),
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}

/// Centered card for empty, error and info states.
class QuykMessageCard extends StatelessWidget {
  const QuykMessageCard({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return QuykCard(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
      child: Column(
        children: [
          QuykIconBubble(icon: icon, size: 52),
          const SizedBox(height: 14),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: QuykColors.ink),
          ),
          if (subtitle != null && subtitle!.isNotEmpty) ...[
            const SizedBox(height: 6),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 460),
              child: Text(
                subtitle!,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 14, height: 1.4, color: QuykColors.muted),
              ),
            ),
          ],
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: 18),
            FilledButton(onPressed: onAction, child: Text(actionLabel!)),
          ],
        ],
      ),
    );
  }
}

/// Loading placeholder for a page section.
class QuykLoadingBlock extends StatelessWidget {
  const QuykLoadingBlock({super.key, this.height = 220});

  final double height;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: height,
      child: const Center(
        child: SizedBox(
          width: 30,
          height: 30,
          child: CircularProgressIndicator(strokeWidth: 2.6, color: QuykColors.green),
        ),
      ),
    );
  }
}

/// Inline search field with a leading icon, used above lists.
class QuykSearchField extends StatelessWidget {
  const QuykSearchField({
    super.key,
    required this.controller,
    required this.hint,
    this.onSubmitted,
    this.onChanged,
    this.trailing,
  });

  final TextEditingController controller;
  final String hint;
  final ValueChanged<String>? onSubmitted;
  final ValueChanged<String>? onChanged;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(18, 4, trailing == null ? 18 : 6, 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: QuykColors.line),
      ),
      child: Row(
        children: [
          const Icon(Icons.search_rounded, color: QuykColors.muted),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              controller: controller,
              textInputAction: TextInputAction.search,
              onSubmitted: onSubmitted,
              onChanged: onChanged,
              style: const TextStyle(fontSize: 15, color: QuykColors.ink),
              decoration: InputDecoration(
                hintText: hint,
                filled: false,
                isDense: true,
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}
