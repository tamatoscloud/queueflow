import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

/// One destination in a Quyk navigation rail / bottom bar.
class QuykNavItem {
  const QuykNavItem({required this.icon, required this.label, this.badge});

  final IconData icon;
  final String label;

  /// Optional small count shown on the item (e.g. failed alerts).
  final int? badge;
}

/// Max width of page content next to the rail.
const double quykContentMaxWidth = 1240;

/// Width at which Quyk apps switch from bottom bar to side rail.
const double quykRailBreakpoint = 720;

String quykGreetingForTime([DateTime? now]) {
  final hour = (now ?? DateTime.now()).hour;
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/// Quyk app chrome: green rail with the Q tile and a lime active item, a
/// header (title, subtitle, actions, live pill) and a cream content area.
/// Under [quykRailBreakpoint] it becomes a green bottom bar; when there are
/// more than five items the bar shows four plus "More".
class QuykAppFrame extends StatelessWidget {
  const QuykAppFrame({
    super.key,
    required this.items,
    required this.selectedIndex,
    required this.onSelect,
    required this.title,
    required this.child,
    this.subtitle,
    this.actions = const [],
    this.liveLabel,
    this.liveOk = true,
    this.onSignOut,
    this.banner,
    this.showHeader = true,
  });

  final List<QuykNavItem> items;

  /// Index into [items]; -1 when the current page isn't a nav destination.
  final int selectedIndex;
  final ValueChanged<int> onSelect;
  final String title;
  final String? subtitle;

  /// Header widgets placed before the live pill (branch picker, buttons).
  final List<Widget> actions;

  /// Live pill text; null hides the pill.
  final String? liveLabel;
  final bool liveOk;
  final VoidCallback? onSignOut;

  /// Optional strip under the header (offline / realtime feedback).
  final Widget? banner;
  final bool showHeader;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= quykRailBreakpoint;
    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (showHeader)
          // Same max width as page content so the header's right edge
          // (branch picker, live pill) lines up with the page below.
          Align(
            alignment: Alignment.topLeft,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: quykContentMaxWidth),
              child: _Header(
                title: title,
                subtitle: subtitle,
                actions: actions,
                liveLabel: liveLabel,
                liveOk: liveOk,
                compact: !wide,
              ),
            ),
          ),
        if (banner != null) banner!,
        Expanded(child: child),
      ],
    );

    if (!wide) {
      return Scaffold(
        backgroundColor: QuykColors.cream,
        body: SafeArea(bottom: false, child: content),
        bottomNavigationBar: _BottomBar(
          items: items,
          selectedIndex: selectedIndex,
          onSelect: onSelect,
          onSignOut: onSignOut,
        ),
      );
    }

    return Scaffold(
      backgroundColor: QuykColors.cream,
      body: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _Rail(
            items: items,
            selectedIndex: selectedIndex,
            onSelect: onSelect,
            onSignOut: onSignOut,
          ),
          Expanded(child: SafeArea(left: false, child: content)),
        ],
      ),
    );
  }
}

/// Centers page content at [quykContentMaxWidth] on wide screens.
class QuykContentWidth extends StatelessWidget {
  const QuykContentWidth({super.key, required this.child, this.maxWidth = quykContentMaxWidth});

  final Widget child;
  final double maxWidth;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.topLeft,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxWidth),
        child: SizedBox.expand(child: child),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({
    required this.title,
    required this.subtitle,
    required this.actions,
    required this.liveLabel,
    required this.liveOk,
    required this.compact,
  });

  final String title;
  final String? subtitle;
  final List<Widget> actions;
  final String? liveLabel;
  final bool liveOk;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        compact ? 16 : 32,
        compact ? 12 : 24,
        compact ? 16 : 32,
        compact ? 8 : 12,
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: compact ? 19 : 24,
                    fontWeight: FontWeight.w600,
                    letterSpacing: -0.4,
                    color: QuykColors.green,
                  ),
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    subtitle!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 13, color: QuykColors.subtle),
                  ),
                ],
              ],
            ),
          ),
          for (final a in actions) ...[a, const SizedBox(width: 10)],
          if (liveLabel != null) QuykLivePill(label: liveLabel!, ok: liveOk),
        ],
      ),
    );
  }
}

/// Lime "Live" pill (mist when not connected).
class QuykLivePill extends StatelessWidget {
  const QuykLivePill({super.key, required this.label, this.ok = true});

  final String label;
  final bool ok;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
      decoration: BoxDecoration(
        color: ok ? QuykColors.lime : QuykColors.mist,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: ok ? QuykColors.green : QuykColors.greenMuted,
        ),
      ),
    );
  }
}

/// White "📍 All branches ⌄" pill used in the header.
class QuykBranchPill extends StatelessWidget {
  const QuykBranchPill({super.key, required this.label, this.onTap});

  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      shape: const StadiumBorder(side: BorderSide(color: QuykColors.line)),
      child: InkWell(
        customBorder: const StadiumBorder(),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.location_on_outlined, size: 16, color: QuykColors.green),
              const SizedBox(width: 6),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 180),
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: QuykColors.ink,
                  ),
                ),
              ),
              const SizedBox(width: 4),
              const Icon(Icons.keyboard_arrow_down_rounded, size: 18, color: QuykColors.ink),
            ],
          ),
        ),
      ),
    );
  }
}

/// Branch picker pill with a popup menu. `null` id means "All branches".
class QuykBranchPicker extends StatelessWidget {
  const QuykBranchPicker({
    super.key,
    required this.branches,
    required this.selectedId,
    required this.onChanged,
    this.allLabel = 'All branches',
  });

  final List<({String id, String name})> branches;
  final String? selectedId;
  final ValueChanged<String?> onChanged;
  final String allLabel;

  @override
  Widget build(BuildContext context) {
    var label = allLabel;
    for (final b in branches) {
      if (b.id == selectedId) label = b.name;
    }
    return PopupMenuButton<String>(
      tooltip: 'Choose branch',
      onSelected: (value) => onChanged(value == '*' ? null : value),
      itemBuilder: (_) => [
        PopupMenuItem(value: '*', child: Text(allLabel)),
        for (final b in branches) PopupMenuItem(value: b.id, child: Text(b.name)),
      ],
      child: IgnorePointer(child: QuykBranchPill(label: label)),
    );
  }
}

class _Rail extends StatelessWidget {
  const _Rail({
    required this.items,
    required this.selectedIndex,
    required this.onSelect,
    required this.onSignOut,
  });

  final List<QuykNavItem> items;
  final int selectedIndex;
  final ValueChanged<int> onSelect;
  final VoidCallback? onSignOut;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 104,
      color: QuykColors.green,
      child: SafeArea(
        right: false,
        child: Column(
          children: [
            const SizedBox(height: 18),
            const QuykLogoTile(),
            const SizedBox(height: 14),
            Expanded(
              child: LayoutBuilder(
                builder: (context, constraints) {
                  // Shrink items on short windows (laptops) so every page
                  // stays reachable; scroll with a fade hint beyond that.
                  const fullExtent = 70.0 + 8.0;
                  const denseExtent = 46.0 + 2.0;
                  final dense = items.length * fullExtent > constraints.maxHeight - 12;
                  final overflow = items.length * denseExtent > constraints.maxHeight - 12;
                  final list = SingleChildScrollView(
                    padding: EdgeInsets.only(top: 4, bottom: overflow ? 28 : 8),
                    child: Column(
                      children: [
                        for (var i = 0; i < items.length; i++) ...[
                          _RailItem(
                            item: items[i],
                            selected: i == selectedIndex,
                            dense: dense,
                            onTap: () => onSelect(i),
                          ),
                          SizedBox(height: dense ? 2 : 8),
                        ],
                      ],
                    ),
                  );
                  if (!overflow) return list;
                  return ShaderMask(
                    blendMode: BlendMode.dstIn,
                    shaderCallback: (rect) => const LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Colors.white, Colors.white, Colors.transparent],
                      stops: [0, 0.94, 1],
                    ).createShader(rect),
                    child: Scrollbar(thumbVisibility: true, child: list),
                  );
                },
              ),
            ),
            if (onSignOut != null)
              Padding(
                padding: const EdgeInsets.only(top: 4, bottom: 12),
                child: IconButton(
                  tooltip: 'Sign out',
                  onPressed: onSignOut,
                  icon: const Icon(Icons.logout_rounded, color: Colors.white70, size: 22),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _RailItem extends StatelessWidget {
  const _RailItem({
    required this.item,
    required this.selected,
    required this.onTap,
    this.dense = false,
  });

  final QuykNavItem item;
  final bool selected;
  final VoidCallback onTap;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    final fg = selected ? QuykColors.green : Colors.white.withValues(alpha: 0.82);
    return Semantics(
      selected: selected,
      button: true,
      label: item.label,
      child: Material(
        color: selected ? QuykColors.lime : Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTap,
          child: SizedBox(
            width: 76,
            height: dense ? 46 : 70,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Badge(
                  isLabelVisible: (item.badge ?? 0) > 0,
                  label: Text('${item.badge ?? 0}'),
                  backgroundColor: QuykColors.danger,
                  child: Icon(item.icon, size: dense ? 20 : 22, color: fg),
                ),
                SizedBox(height: dense ? 2 : 5),
                Text(
                  item.label,
                  textAlign: TextAlign.center,
                  maxLines: dense ? 1 : 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: dense ? 11 : 12,
                    height: 1.1,
                    fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                    color: fg,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Lime tile holding the dark-green Q mark.
class QuykLogoTile extends StatelessWidget {
  const QuykLogoTile({super.key, this.size = 48});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      padding: EdgeInsets.all(size * 0.18),
      decoration: BoxDecoration(
        color: QuykColors.lime,
        borderRadius: BorderRadius.circular(size * 0.3),
      ),
      child: Image.asset(
        BrandAssets.mark,
        color: QuykColors.green,
        colorBlendMode: BlendMode.srcIn,
        fit: BoxFit.contain,
        errorBuilder: (_, __, ___) => const Icon(Icons.bolt, color: QuykColors.green),
      ),
    );
  }
}

class _BottomBar extends StatelessWidget {
  const _BottomBar({
    required this.items,
    required this.selectedIndex,
    required this.onSelect,
    required this.onSignOut,
  });

  final List<QuykNavItem> items;
  final int selectedIndex;
  final ValueChanged<int> onSelect;
  final VoidCallback? onSignOut;

  static const _maxVisible = 5;

  @override
  Widget build(BuildContext context) {
    final overflow = items.length > _maxVisible;
    final visibleCount = overflow ? _maxVisible - 1 : items.length;
    final moreSelected = overflow && selectedIndex >= visibleCount;
    return Container(
      color: QuykColors.green,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(8, 8, 8, 6),
          child: Row(
            children: [
              for (var i = 0; i < visibleCount; i++)
                Expanded(
                  child: _RailItem(
                    item: items[i],
                    selected: i == selectedIndex,
                    onTap: () => onSelect(i),
                  ),
                ),
              if (overflow)
                Expanded(
                  child: _RailItem(
                    item: QuykNavItem(
                      icon: Icons.more_horiz_rounded,
                      label: moreSelected ? items[selectedIndex].label : 'More',
                    ),
                    selected: moreSelected,
                    onTap: () => _openMore(context, visibleCount),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _openMore(BuildContext context, int from) async {
    final picked = await showModalBottomSheet<int>(
      context: context,
      showDragHandle: true,
      builder: (sheetContext) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.only(bottom: 12),
          children: [
            for (var i = from; i < items.length; i++)
              ListTile(
                leading: Icon(items[i].icon),
                title: Text(items[i].label),
                selected: i == selectedIndex,
                selectedColor: QuykColors.green,
                selectedTileColor: QuykColors.limeTint,
                onTap: () => Navigator.of(sheetContext).pop(i),
              ),
            if (onSignOut != null)
              ListTile(
                leading: const Icon(Icons.logout_rounded),
                title: const Text('Sign out'),
                onTap: () => Navigator.of(sheetContext).pop(-1),
              ),
          ],
        ),
      ),
    );
    if (picked == null) return;
    if (picked == -1) {
      onSignOut?.call();
    } else {
      onSelect(picked);
    }
  }
}
