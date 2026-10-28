import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../../core/models/platform_models.dart';
import '../../core/network/api_error_message.dart';
import '../../core/network/platform_api_client.dart';
import '../../shared/feedback.dart';
import '../../shared/widgets/admin_pager.dart';
import '../auth/presentation/auth_controller.dart';
import '../tenants/tenants_screen.dart' show formatDate;

typedef UserQuery = ({int page, String? search, String? role, String? status});

final usersProvider = FutureProvider.autoDispose.family((ref, UserQuery args) async {
  final api = ref.watch(platformApiClientProvider);
  return api.listUsers(page: args.page, search: args.search, role: args.role, status: args.status);
});

const _roleFilters = [
  (value: null, label: 'All roles'),
  (value: 'OWNER', label: 'Owners'),
  (value: 'MANAGER', label: 'Managers'),
  (value: 'RECEPTIONIST', label: 'Hosts'),
  (value: 'STAFF', label: 'Staff'),
  (value: 'PLATFORM_ADMIN', label: 'Platform admins'),
];

const _statusFilters = [
  (value: null, label: 'Any status'),
  (value: 'ACTIVE', label: 'Active'),
  (value: 'INVITED', label: 'Invited'),
  (value: 'SUSPENDED', label: 'Suspended'),
];

String roleLabel(String role) => switch (role.toUpperCase()) {
      'PLATFORM_ADMIN' => 'Platform admin',
      'OWNER' => 'Owner',
      'MANAGER' => 'Manager',
      'RECEPTIONIST' => 'Host',
      'STAFF' => 'Staff',
      'VIEWER' => 'Viewer',
      final other => other,
    };

Widget userStatusPill(String status) {
  final (label, bg, fg) = switch (status.toUpperCase()) {
    'ACTIVE' => ('Active', QuykColors.lime, QuykColors.green),
    'INVITED' => ('Invited', QuykColors.limeSoft, QuykColors.green),
    'SUSPENDED' => ('Suspended', QuykColors.warningTint, const Color(0xFF7A4B0C)),
    'DEACTIVATED' => ('Deactivated', QuykColors.dangerTint, QuykColors.danger),
    final other => (other, QuykColors.mist, QuykColors.greenMuted),
  };
  return QuykPill(label: label, background: bg, foreground: fg, fontSize: 11);
}

class UsersScreen extends ConsumerStatefulWidget {
  const UsersScreen({super.key});

  @override
  ConsumerState<UsersScreen> createState() => _UsersScreenState();
}

class _UsersScreenState extends ConsumerState<UsersScreen> {
  int _page = 1;
  String _search = '';
  String? _role;
  String? _status;
  final _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  void _applySearch() => setState(() {
        _search = _searchCtrl.text.trim();
        _page = 1;
      });

  @override
  Widget build(BuildContext context) {
    final args = (page: _page, search: _search.isEmpty ? null : _search, role: _role, status: _status);
    final async = ref.watch(usersProvider(args));
    final me = ref.watch(currentUserProvider)?.id;

    return QuykPage(
      title: 'Users',
      subtitle: 'Everyone with a Quyk sign-in.',
      onRefresh: () async => ref.invalidate(usersProvider(args)),
      children: [
        QuykSearchField(
          controller: _searchCtrl,
          hint: 'Search by name or email',
          onSubmitted: (_) => _applySearch(),
          trailing: FilledButton(onPressed: _applySearch, child: const Text('Search')),
        ),
        const SizedBox(height: 14),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final f in _roleFilters)
              QuykFilterChip(
                label: f.label,
                selected: _role == f.value,
                onTap: () => setState(() {
                  _role = f.value;
                  _page = 1;
                }),
              ),
            const SizedBox(width: 12),
            for (final f in _statusFilters)
              QuykFilterChip(
                label: f.label,
                selected: _status == f.value,
                onTap: () => setState(() {
                  _status = f.value;
                  _page = 1;
                }),
              ),
          ],
        ),
        const SizedBox(height: 16),
        async.when(
          loading: () => const QuykLoadingBlock(),
          error: (e, _) => QuykMessageCard(
            icon: Icons.cloud_off_rounded,
            title: 'We couldn’t load users',
            subtitle: apiExceptionMessage(e),
            actionLabel: 'Try again',
            onAction: () => ref.invalidate(usersProvider(args)),
          ),
          data: (page) {
            if (page.items.isEmpty) {
              return const QuykMessageCard(
                icon: Icons.person_search_outlined,
                title: 'No users match',
                subtitle: 'Try a different search, role or status.',
              );
            }
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                QuykTable(
                  columns: const [
                    QuykColumn('User', flex: 5),
                    QuykColumn('Business', flex: 3),
                    QuykColumn('Role', flex: 3),
                    QuykColumn('Last sign-in', flex: 3),
                    QuykColumn('Status', flex: 2),
                    QuykColumn('', flex: 1, alignEnd: true),
                  ],
                  rows: [
                    for (final u in page.items)
                      [
                        Row(
                          children: [
                            QuykAvatar(name: u.fullName.isEmpty ? u.email : u.fullName, size: 34),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  QuykCellText(u.fullName.isEmpty ? u.email : u.fullName, strong: true),
                                  Text(
                                    u.id == me ? '${u.email} · you' : u.email,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontSize: 12, color: QuykColors.subtle),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        QuykCellText(u.businessName ?? (u.isPlatformAdmin ? 'Quyk platform' : '—')),
                        QuykCellText(u.roles.isEmpty ? '—' : u.roles.map(roleLabel).join(', ')),
                        QuykCellText(formatDate(u.lastLoginAt, time: true)),
                        userStatusPill(u.status),
                        if (u.id == me)
                          const SizedBox.shrink()
                        else
                          PopupMenuButton<String>(
                            tooltip: 'User actions',
                            icon: const Icon(Icons.more_horiz_rounded, color: QuykColors.muted),
                            onSelected: (a) => _act(u, a, args),
                            itemBuilder: (_) => [
                              if (u.status.toUpperCase() == 'ACTIVE' || u.status.toUpperCase() == 'INVITED')
                                const PopupMenuItem(value: 'suspend', child: Text('Suspend access'))
                              else
                                const PopupMenuItem(value: 'activate', child: Text('Restore access')),
                              const PopupMenuItem(value: 'reset', child: Text('Reset password')),
                            ],
                          ),
                      ],
                  ],
                ),
                const SizedBox(height: 12),
                AdminPager(
                  page: _page,
                  totalPages: page.totalPages,
                  totalItems: page.totalItems,
                  onPage: (p) => setState(() => _page = p),
                ),
              ],
            );
          },
        ),
      ],
    );
  }

  Future<void> _act(PlatformUser u, String action, UserQuery args) async {
    final name = u.fullName.isEmpty ? u.email : u.fullName;
    final api = ref.read(platformApiClientProvider);
    if (action == 'reset') {
      final ok = await confirmAction(
        context,
        title: 'Reset $name’s password?',
        message: 'They’ll be signed out everywhere and need the temporary password you’ll see next.',
        confirmLabel: 'Reset password',
        destructive: true,
      );
      if (!ok || !mounted) return;
      try {
        final temp = await api.resetUserPassword(u.id);
        if (!mounted) return;
        await showDialog<void>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Temporary password'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Share this with $name over a secure channel. It won’t be shown again.'),
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: QuykColors.limeTint, borderRadius: BorderRadius.circular(12)),
                  child: SelectableText(temp, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                ),
              ],
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Close')),
              FilledButton.icon(
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: temp));
                  Navigator.pop(ctx);
                },
                icon: const Icon(Icons.copy_rounded, size: 18),
                label: const Text('Copy and close'),
              ),
            ],
          ),
        );
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(backgroundColor: QuykColors.danger, content: Text(apiExceptionMessage(e))),
          );
        }
      }
      return;
    }
    final suspend = action == 'suspend';
    if (suspend &&
        !await confirmAction(
          context,
          title: 'Suspend $name?',
          message: 'They’re signed out now and can’t sign in until you restore access.',
          confirmLabel: 'Suspend',
          destructive: true,
        )) {
      return;
    }
    if (!mounted) return;
    final done = await runWithFeedback(
      context,
      () => api.updateUserStatus(u.id, suspend ? 'SUSPENDED' : 'ACTIVE'),
      success: suspend ? '$name suspended' : '$name can sign in again',
      failure: 'Couldn’t update $name',
    );
    if (done) ref.invalidate(usersProvider(args));
  }
}
