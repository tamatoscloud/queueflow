import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../../../core/network/business_api_client.dart';
import '../../../core/network/connection_diagnostics.dart' show apiExceptionMessage;
import '../../../core/persona/user_persona.dart';
import '../../../core/routing/app_routes.dart';
import '../../../core/session/session_providers.dart';
import '../../../features/auth/presentation/auth_controller.dart';

final businessProfileProvider = FutureProvider.autoDispose<Map<String, dynamic>?>((ref) async {
  final businessId = ref.watch(currentUserProvider)?.businessId;
  if (businessId == null) return null;
  return ref.watch(businessApiClientProvider).getBusiness(businessId);
});

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final profile = ref.watch(businessProfileProvider);
    final isOwner = (user?.roles ?? const <String>[]).map((r) => r.toUpperCase()).contains('OWNER');
    final manages = personaFromUser(user) == BusinessPersona.owner;

    return QuykPage(
      title: 'Settings',
      subtitle: 'Your restaurant, team and guest experience.',
      maxWidth: 820,
      children: [
        _RestaurantCard(profile: profile, canEdit: isOwner),
        const SizedBox(height: 20),
        const QuykSectionTitle('Restaurant setup'),
        const _Group(
          tiles: [
            _Tile(Icons.storefront_outlined, 'Locations', 'Add or edit restaurant locations', AppRoutes.branches),
            _Tile(Icons.format_list_numbered_rounded, 'Waiting lines', 'Dine-in, takeaway and drive-in', AppRoutes.queues),
            _Tile(Icons.restaurant_menu_rounded, 'Guest menu', 'Dishes guests browse while waiting', AppRoutes.menu),
          ],
        ),
        const SizedBox(height: 20),
        const QuykSectionTitle('Guests & team'),
        _Group(
          tiles: [
            const _Tile(Icons.qr_code_2_rounded, 'Guest join codes', 'Print or share codes for guests to scan', AppRoutes.restaurantQr),
            const _Tile(Icons.notifications_none_rounded, 'Guest messages', 'WhatsApp / SMS alerts sent to guests', AppRoutes.notifications),
            if (manages) const _Tile(Icons.badge_outlined, 'Team', 'Invite hosts, staff and managers', AppRoutes.staff),
          ],
        ),
        if (kDebugMode) ...[
          const SizedBox(height: 20),
          const QuykSectionTitle('Testing tools · only while developing'),
          const _Group(
            tiles: [
              _Tile(Icons.science_outlined, 'Demo simulator', 'Fill a demo line for testing', AppRoutes.restaurantSimulator),
              _Tile(Icons.table_restaurant_outlined, 'Table layout', 'Dine-in seating demo', AppRoutes.restaurantTables),
            ],
          ),
        ],
        const SizedBox(height: 20),
        const QuykSectionTitle('Account'),
        QuykCard(
          padding: const EdgeInsets.all(18),
          child: Row(
            children: [
              QuykAvatar(name: user?.fullName ?? '?', size: 44),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      user?.fullName ?? 'Signed in',
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: QuykColors.ink),
                    ),
                    Text(
                      [user?.email, if ((user?.roles ?? const <String>[]).isNotEmpty) _roleLabel(user!.roles.first)]
                          .whereType<String>()
                          .join(' · '),
                      style: const TextStyle(fontSize: 12.5, color: QuykColors.subtle),
                    ),
                  ],
                ),
              ),
              OutlinedButton.icon(
                onPressed: () async {
                  ref.read(selectedBranchIdProvider.notifier).state = null;
                  await ref.read(sessionBootstrapProvider).saveBranchId(null);
                  await ref.read(authControllerProvider.notifier).logout();
                  if (context.mounted) context.go(AppRoutes.login);
                },
                icon: const Icon(Icons.logout_rounded, size: 18),
                label: const Text('Sign out'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

String _roleLabel(String role) => switch (role.toUpperCase()) {
      'OWNER' => 'Owner',
      'MANAGER' => 'Manager',
      'RECEPTIONIST' => 'Host',
      'STAFF' => 'Staff',
      'VIEWER' => 'Viewer',
      final other => other,
    };

class _Tile {
  const _Tile(this.icon, this.title, this.subtitle, this.route);

  final IconData icon;
  final String title;
  final String subtitle;
  final String route;
}

class _Group extends StatelessWidget {
  const _Group({required this.tiles});

  final List<_Tile> tiles;

  @override
  Widget build(BuildContext context) {
    return QuykCard(
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          for (var i = 0; i < tiles.length; i++) ...[
            if (i > 0) const Divider(height: 1, indent: 70),
            ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 6),
              leading: QuykIconBubble(icon: tiles[i].icon, size: 40),
              title: Text(tiles[i].title, style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Text(tiles[i].subtitle, style: const TextStyle(fontSize: 12.5, color: QuykColors.subtle)),
              trailing: const Icon(Icons.chevron_right_rounded, color: QuykColors.subtle),
              onTap: () => context.go(tiles[i].route),
            ),
          ],
        ],
      ),
    );
  }
}

class _RestaurantCard extends ConsumerWidget {
  const _RestaurantCard({required this.profile, required this.canEdit});

  final AsyncValue<Map<String, dynamic>?> profile;
  final bool canEdit;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final data = profile.valueOrNull;
    final name = data?['name'] as String? ?? 'Your restaurant';
    final details = [data?['email'], data?['phone'], data?['timezone']]
        .whereType<String>()
        .where((s) => s.trim().isNotEmpty)
        .join(' · ');
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(color: QuykColors.green, borderRadius: BorderRadius.circular(28)),
      child: Row(
        children: [
          QuykAvatar(name: name, size: 60, lime: true, initialsCount: 1),
          const SizedBox(width: 18),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  profile.isLoading ? 'Loading…' : name,
                  style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w600, color: Colors.white),
                ),
                const SizedBox(height: 4),
                Text(
                  profile.hasError
                      ? 'Restaurant details aren’t available for your role.'
                      : (details.isEmpty ? 'Add a contact email and phone' : details),
                  style: TextStyle(fontSize: 13, color: Colors.white.withValues(alpha: 0.72)),
                ),
              ],
            ),
          ),
          if (canEdit && data != null)
            FilledButton.icon(
              style: FilledButton.styleFrom(backgroundColor: QuykColors.lime, foregroundColor: QuykColors.green),
              onPressed: () => showModalBottomSheet<void>(
                context: context,
                isScrollControlled: true,
                showDragHandle: true,
                builder: (_) => _EditRestaurantSheet(profile: data),
              ),
              icon: const Icon(Icons.edit_outlined, size: 18),
              label: const Text('Edit'),
            ),
        ],
      ),
    );
  }
}

class _EditRestaurantSheet extends ConsumerStatefulWidget {
  const _EditRestaurantSheet({required this.profile});

  final Map<String, dynamic> profile;

  @override
  ConsumerState<_EditRestaurantSheet> createState() => _EditRestaurantSheetState();
}

class _EditRestaurantSheetState extends ConsumerState<_EditRestaurantSheet> {
  late final _name = TextEditingController(text: widget.profile['name'] as String? ?? '');
  late final _email = TextEditingController(text: widget.profile['email'] as String? ?? '');
  late final _phone = TextEditingController(text: widget.profile['phone'] as String? ?? '');
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_name.text.trim().isEmpty) {
      setState(() => _error = 'Your restaurant needs a name.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ref.read(businessApiClientProvider).updateBusiness(widget.profile['id'] as String, {
        'name': _name.text.trim(),
        if (_email.text.trim().isNotEmpty) 'email': _email.text.trim(),
        if (_phone.text.trim().isNotEmpty) 'phone': _phone.text.trim(),
      });
      ref.invalidate(businessProfileProvider);
      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Restaurant details saved')));
    } catch (e) {
      if (mounted) setState(() => _error = apiExceptionMessage(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(24, 0, 24, 24 + MediaQuery.viewInsetsOf(context).bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Restaurant details',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w600, color: QuykColors.green),
          ),
          const SizedBox(height: 4),
          const Text(
            'Guests see the name on the join page and in their alerts.',
            style: TextStyle(fontSize: 13, color: QuykColors.muted),
          ),
          const SizedBox(height: 20),
          TextField(controller: _name, decoration: const InputDecoration(labelText: 'Restaurant name')),
          const SizedBox(height: 14),
          TextField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(labelText: 'Contact email'),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _phone,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(labelText: 'Contact phone'),
          ),
          if (_error != null) ...[
            const SizedBox(height: 14),
            QuykAuthError(_error!),
          ],
          const SizedBox(height: 20),
          QuykAuthButton(label: 'Save', loading: _saving, onPressed: _save),
        ],
      ),
    );
  }
}
