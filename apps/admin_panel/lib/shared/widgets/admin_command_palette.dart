import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../core/routing/app_routes.dart';

class AdminCommandPaletteEntry {
  const AdminCommandPaletteEntry({
    required this.label,
    required this.route,
    required this.icon,
    this.keywords = const [],
  });

  final String label;
  final String route;
  final IconData icon;
  final List<String> keywords;
}

const adminCommandPaletteEntries = [
  AdminCommandPaletteEntry(label: 'Overview', route: AppRoutes.dashboard, icon: Icons.home_outlined),
  AdminCommandPaletteEntry(label: 'Businesses', route: AppRoutes.tenants, icon: Icons.business_outlined, keywords: ['tenants']),
  AdminCommandPaletteEntry(label: 'Alerts', route: AppRoutes.notifications, icon: Icons.notifications_outlined),
  AdminCommandPaletteEntry(label: 'Support', route: AppRoutes.support, icon: Icons.support_agent_outlined),
  AdminCommandPaletteEntry(label: 'Analytics', route: AppRoutes.analytics, icon: Icons.analytics_outlined),
  AdminCommandPaletteEntry(label: 'Health', route: AppRoutes.health, icon: Icons.monitor_heart_outlined),
  AdminCommandPaletteEntry(label: 'Activity', route: AppRoutes.activity, icon: Icons.timeline_outlined),
  AdminCommandPaletteEntry(label: 'Feature flags', route: AppRoutes.featureFlags, icon: Icons.flag_outlined),
  AdminCommandPaletteEntry(label: 'Settings', route: AppRoutes.settings, icon: Icons.settings_outlined),
  AdminCommandPaletteEntry(label: 'Branches', route: AppRoutes.branches, icon: Icons.store_outlined),
  AdminCommandPaletteEntry(label: 'Users', route: AppRoutes.users, icon: Icons.people_outline),
  AdminCommandPaletteEntry(label: 'Subscriptions', route: AppRoutes.subscriptions, icon: Icons.card_membership_outlined),
  AdminCommandPaletteEntry(label: 'Audit log', route: AppRoutes.audit, icon: Icons.history),
];

Future<void> showAdminCommandPalette(BuildContext context) async {
  await showDialog<void>(
    context: context,
    builder: (ctx) => const _AdminCommandPaletteDialog(),
  );
}

class _AdminCommandPaletteDialog extends StatefulWidget {
  const _AdminCommandPaletteDialog();

  @override
  State<_AdminCommandPaletteDialog> createState() => _AdminCommandPaletteDialogState();
}

class _AdminCommandPaletteDialogState extends State<_AdminCommandPaletteDialog> {
  final _controller = TextEditingController();
  final _focus = FocusNode();
  int _selected = 0;
  String _query = '';

  @override
  void dispose() {
    _controller.dispose();
    _focus.dispose();
    super.dispose();
  }

  List<AdminCommandPaletteEntry> get _filtered {
    final q = _query.trim().toLowerCase();
    if (q.isEmpty) return adminCommandPaletteEntries;
    return adminCommandPaletteEntries.where((e) {
      if (e.label.toLowerCase().contains(q)) return true;
      if (e.route.toLowerCase().contains(q)) return true;
      return e.keywords.any((k) => k.toLowerCase().contains(q));
    }).toList();
  }

  void _go(String route) {
    Navigator.pop(context);
    context.go(route);
  }

  @override
  Widget build(BuildContext context) {
    final results = _filtered;
    if (_selected >= results.length) _selected = results.isEmpty ? 0 : results.length - 1;

    return Shortcuts(
      shortcuts: {
        const SingleActivator(LogicalKeyboardKey.arrowDown): const _MoveIntent(1),
        const SingleActivator(LogicalKeyboardKey.arrowUp): const _MoveIntent(-1),
      },
      child: Actions(
        actions: {
          _MoveIntent: CallbackAction<_MoveIntent>(
            onInvoke: (intent) {
              setState(() {
                if (results.isEmpty) return;
                _selected = (_selected + intent.delta).clamp(0, results.length - 1);
              });
              return null;
            },
          ),
        },
        child: Dialog(
          backgroundColor: AppColors.calmIvory,
          insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 80),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(AppSpacing.md, AppSpacing.md, AppSpacing.md, 0),
                  child: TextField(
                    controller: _controller,
                    focusNode: _focus,
                    autofocus: true,
                    decoration: InputDecoration(
                      hintText: 'Search QueueFlow',
                      prefixIcon: const Icon(Icons.search, color: AppColors.calmViolet),
                      filled: true,
                      fillColor: AppColors.lightSurface,
                      border: OutlineInputBorder(borderRadius: AppRadius.lgAll, borderSide: const BorderSide(color: AppColors.calmBorder)),
                    ),
                    onChanged: (v) => setState(() {
                      _query = v;
                      _selected = 0;
                    }),
                    onSubmitted: (_) {
                      if (results.isNotEmpty) _go(results[_selected].route);
                    },
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Flexible(
                  child: ListView(
                    shrinkWrap: true,
                    children: [
                      for (var i = 0; i < results.length; i++)
                        ListTile(
                          selected: i == _selected,
                          selectedTileColor: AppColors.calmLilac.withValues(alpha: 0.5),
                          leading: Icon(results[i].icon, color: AppColors.calmViolet),
                          title: Text(results[i].label),
                          onTap: () => _go(results[i].route),
                        ),
                      if (results.isEmpty)
                        const Padding(
                          padding: EdgeInsets.all(AppSpacing.lg),
                          child: Text('No matching destinations'),
                        ),
                    ],
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

class _MoveIntent extends Intent {
  const _MoveIntent(this.delta);
  final int delta;
}

class AdminCommandPaletteShortcuts extends StatelessWidget {
  const AdminCommandPaletteShortcuts({required this.child, super.key});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Shortcuts(
      shortcuts: const {
        SingleActivator(LogicalKeyboardKey.keyK, control: true): _OpenCommandPaletteIntent(),
        SingleActivator(LogicalKeyboardKey.keyK, meta: true): _OpenCommandPaletteIntent(),
      },
      child: Actions(
        actions: {
          _OpenCommandPaletteIntent: CallbackAction<_OpenCommandPaletteIntent>(
            onInvoke: (_) {
              showAdminCommandPalette(context);
              return null;
            },
          ),
        },
        child: child,
      ),
    );
  }
}

class _OpenCommandPaletteIntent extends Intent {
  const _OpenCommandPaletteIntent();
}
