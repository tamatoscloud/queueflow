import 'package:flutter/material.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

export 'package:queueflow_ui/queueflow_ui.dart'
    show
        QuykBranchPill,
        QuykLogoTile,
        QuykNavItem,
        quykContentMaxWidth,
        quykGreetingForTime,
        quykRailBreakpoint;

/// Staff destinations in rail order (Figma: Live queue, Guests, Reviews, Alerts, Profile).
const List<QuykNavItem> quykStaffNavItems = [
  QuykNavItem(icon: Icons.campaign_outlined, label: 'Live queue'),
  QuykNavItem(icon: Icons.people_outline_rounded, label: 'Guests'),
  QuykNavItem(icon: Icons.star_outline_rounded, label: 'Reviews'),
  QuykNavItem(icon: Icons.notifications_none_rounded, label: 'Alerts'),
  QuykNavItem(icon: Icons.person_outline_rounded, label: 'Profile'),
];

/// Staff chrome from the Quyk redesign: the shared [QuykAppFrame] with the
/// staff destinations and a "Good morning, {name}" header.
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
  final Widget? banner;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return QuykAppFrame(
      items: quykStaffNavItems,
      selectedIndex: selectedIndex,
      onSelect: onSelect,
      title: '${quykGreetingForTime()}, $greetingName',
      subtitle: venueName,
      actions: [if (branchPicker != null) branchPicker!],
      liveLabel: liveLabel,
      liveOk: liveOk,
      onSignOut: onSignOut,
      banner: banner,
      child: child,
    );
  }
}
