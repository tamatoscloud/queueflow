import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

/// One destination in the staff navigation rail.
class QuykNavItem {
  const QuykNavItem({required this.icon, required this.label});

  final IconData icon;
  final String label;
}

/// Staff destinations in rail order (Figma: Live queue, Guests, Reviews, Alerts, Profile).
const List<QuykNavItem> quykStaffNavItems = [
  QuykNavItem(icon: Icons.campaign_outlined, label: 'Live queue'),
  QuykNavItem(icon: Icons.people_outline_rounded, label: 'Guests'),
  QuykNavItem(icon: Icons.star_outline_rounded, label: 'Reviews'),
  QuykNavItem(icon: Icons.notifications_none_rounded, label: 'Alerts'),
  QuykNavItem(icon: Icons.person_outline_rounded, label: 'Profile'),
];

/// Max width of page content next to the rail (Figma iPad Pro 12.9").
const double quykContentMaxWidth = 1240;

/// Width at which the staff app switches from bottom bar to side rail.
const double quykRailBreakpoint = 720;

String quykGreetingForTime([DateTime? now]) {
  final hour = (now ?? DateTime.now()).hour;
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/// Presentational staff chrome from the Quyk redesign: green rail with the
/// Q tile and lime active item, greeting header with branch picker and
/// live pill, cream content area. Phones get a green bottom bar instead.
class QuykStaffFrame extends StatelessWidget {
  const QuykStaffFrame({
    super.key,
    required this.selectedIndex,
    required this.onSelect,
    required this.greetingName,
    required this.child,
    this.venueName,
    this.branchPicker,
    this.liveLabel = 'Live',
    this.liveOk = true,
    this.onSignOut,
    this.banner,
  });

  final int selectedIndex;
  final ValueChanged<int> onSelect;
  final String greetingName;
  final String? venueName;
  final Widget? branchPicker;
  final String liveLabel;
  final bool liveOk;
  final VoidCallback? onSignOut;

  /// Optional strip under the header (offline / realtime feedback).
  final Widget? banner;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= quykRailBreakpoint;
    final header = _Header(
      greeting: '${quykGreetingForTime()}, $greetingName',
      venueName: venueName,
      branchPicker: branchPicker,
      liveLabel: liveLabel,
      liveOk: liveOk,
      compact: !wide,
    );
    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        header,
        if (banner != null) banner!,
        Expanded(child: child),
      ],
    );

    if (!wide) {
      return Scaffold(
        backgroundColor: QuykColors.cream,
        body: SafeArea(bottom: false, child: content),
        bottomNavigationBar: _BottomBar(
          selectedIndex: selectedIndex,
          onSelect: onSelect,
        ),
      );
    }

    return Scaffold(
      backgroundColor: QuykColors.cream,
      body: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _Rail(
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

class _Header extends StatelessWidget {
  const _Header({
    required this.greeting,
    required this.venueName,
    required this.branchPicker,
    required this.liveLabel,
    required this.liveOk,
    required this.compact,
  });

  final String greeting;
  final String? venueName;
  final Widget? branchPicker;
  final String liveLabel;
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
                  greeting,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: compact ? 19 : 24,
                    fontWeight: FontWeight.w600,
                    letterSpacing: -0.4,
                    color: QuykColors.green,
                  ),
                ),
                if (venueName != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    venueName!,
                    style: const TextStyle(fontSize: 13, color: QuykColors.subtle),
                  ),
                ],
              ],
            ),
          ),
          if (branchPicker != null) ...[
            branchPicker!,
            const SizedBox(width: 10),
          ],
          _LivePill(label: liveLabel, ok: liveOk),
        ],
      ),
    );
  }
}

class _LivePill extends StatelessWidget {
  const _LivePill({required this.label, required this.ok});

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

class _Rail extends StatelessWidget {
  const _Rail({
    required this.selectedIndex,
    required this.onSelect,
    required this.onSignOut,
  });

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
            const SizedBox(height: 22),
            const QuykLogoTile(),
            const SizedBox(height: 28),
            for (var i = 0; i < quykStaffNavItems.length; i++) ...[
              _RailItem(
                item: quykStaffNavItems[i],
                selected: i == selectedIndex,
                onTap: () => onSelect(i),
              ),
              const SizedBox(height: 10),
            ],
            const SizedBox(height: 6),
            IconButton(
              tooltip: 'Sign out',
              onPressed: onSignOut,
              icon: const Icon(Icons.logout_rounded, color: Colors.white70, size: 22),
            ),
          ],
        ),
      ),
    );
  }
}

class _RailItem extends StatelessWidget {
  const _RailItem({required this.item, required this.selected, required this.onTap});

  final QuykNavItem item;
  final bool selected;
  final VoidCallback onTap;

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
            height: 70,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(item.icon, size: 22, color: fg),
                const SizedBox(height: 5),
                Text(
                  item.label,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 12,
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
  const _BottomBar({required this.selectedIndex, required this.onSelect});

  final int selectedIndex;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: QuykColors.green,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(8, 8, 8, 6),
          child: Row(
            children: [
              for (var i = 0; i < quykStaffNavItems.length; i++)
                Expanded(
                  child: _RailItem(
                    item: quykStaffNavItems[i],
                    selected: i == selectedIndex,
                    onTap: () => onSelect(i),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
