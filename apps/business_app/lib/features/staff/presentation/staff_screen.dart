import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../../../core/models/models.dart';
import '../../../core/network/business_api_client.dart';
import '../../../core/network/connection_diagnostics.dart' show apiExceptionMessage;
import '../../../features/auth/presentation/auth_controller.dart';
import '../../../shared/feedback.dart';
import '../../branches/presentation/branches_screen.dart';

final staffRosterProvider = FutureProvider.autoDispose<StaffRosterModel>((ref) async {
  final businessId = ref.watch(currentUserProvider)?.businessId;
  return ref.watch(businessApiClientProvider).getStaffRoster(businessId: businessId);
});

class StaffScreen extends ConsumerStatefulWidget {
  const StaffScreen({super.key});

  @override
  ConsumerState<StaffScreen> createState() => _StaffScreenState();
}

class _StaffScreenState extends ConsumerState<StaffScreen> {
  Future<void> _invite() async {
    final email = TextEditingController();
    final name = TextEditingController();
    var role = 'RECEPTIONIST';
    await showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
          title: const Text('Invite a team member'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'They’ll get an email so they can sign in and help serve guests.',
                style: Theme.of(ctx).textTheme.bodySmall?.copyWith(color: QuykColors.muted),
              ),
              const SizedBox(height: 12),
              TextField(controller: name, decoration: const InputDecoration(labelText: 'Full name')),
              TextField(controller: email, decoration: const InputDecoration(labelText: 'Email')),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                initialValue: role,
                decoration: const InputDecoration(labelText: 'What can they do?'),
                items: const [
                  DropdownMenuItem(value: 'MANAGER', child: Text('Manager — full access')),
                  DropdownMenuItem(value: 'RECEPTIONIST', child: Text('Host — run the waiting line')),
                  DropdownMenuItem(value: 'STAFF', child: Text('Team member — help serve guests')),
                  DropdownMenuItem(value: 'VIEWER', child: Text('View only — watch, don’t change')),
                ],
                onChanged: (v) {
                  if (v != null) setLocal(() => role = v);
                },
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            FilledButton(
              onPressed: () async {
                final messenger = ScaffoldMessenger.of(context);
                final trimmedEmail = email.text.trim();
                final trimmedName = name.text.trim();
                if (trimmedEmail.isEmpty || trimmedName.isEmpty) {
                  messenger.showSnackBar(
                    const SnackBar(content: Text('Please enter a name and email.')),
                  );
                  return;
                }
                try {
                  final businessId = ref.read(currentUserProvider)?.businessId;
                  await ref.read(businessApiClientProvider).inviteStaff(
                        StaffInviteRequest(
                          email: trimmedEmail,
                          fullName: trimmedName,
                          roleName: role,
                          businessId: businessId,
                        ),
                      );
                  ref.invalidate(staffRosterProvider);
                  if (ctx.mounted) Navigator.pop(ctx);
                  messenger.showSnackBar(
                    SnackBar(content: Text('Invite sent to $trimmedEmail')),
                  );
                } catch (_) {
                  messenger.showSnackBar(
                    const SnackBar(content: Text('We couldn’t send the invite. Please try again.')),
                  );
                }
              },
              child: const Text('Send invite'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _resend(StaffInvitationModel invite) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref.read(businessApiClientProvider).resendStaffInvite(
            invite.id,
            businessId: ref.read(currentUserProvider)?.businessId,
          );
      messenger.showSnackBar(SnackBar(content: Text('Invite resent to ${invite.email}')));
      ref.invalidate(staffRosterProvider);
    } catch (_) {
      messenger.showSnackBar(
        const SnackBar(content: Text('We couldn’t resend that invite. Please try again.')),
      );
    }
  }

  Future<void> _disable(StaffMemberModel member) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Remove ${member.fullName}?'),
        content: Text(
          '${member.fullName} will no longer be able to sign in. You can invite them again later.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: QuykColors.danger),
            child: const Text('Remove access'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    try {
      await ref.read(businessApiClientProvider).disableStaff(
            member.id,
            businessId: ref.read(currentUserProvider)?.businessId,
          );
      ref.invalidate(staffRosterProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${member.fullName} no longer has access')),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('We couldn’t update access. Please try again.')),
        );
      }
    }
  }

  Future<void> _changeRole(StaffMemberModel member, String role) async {
    if (role == member.role.toUpperCase()) return;
    final businessId = ref.read(currentUserProvider)?.businessId;
    final ok = await runWithFeedback(
      context,
      () => ref.read(businessApiClientProvider).updateStaffRole(member.id, role, businessId: businessId),
      success: '${member.fullName.isEmpty ? member.email : member.fullName} is now ${staffRoleShortLabel(role)}',
      failure: 'Couldn’t change the role',
    );
    if (ok) ref.invalidate(staffRosterProvider);
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(staffRosterProvider);
    final user = ref.watch(currentUserProvider);
    final currentUserId = user?.id;
    final canManageRoles = (user?.roles ?? const <String>[]).map((r) => r.toUpperCase()).contains('OWNER');
    final branches = ref.watch(branchesProvider).valueOrNull ?? const <BranchModel>[];
    String branchNames(List<String> ids) {
      if (ids.isEmpty) return 'All locations';
      final names = [for (final b in branches) if (ids.contains(b.id)) b.name];
      return names.isEmpty ? '${ids.length} location${ids.length == 1 ? '' : 's'}' : names.join(', ');
    }

    return QuykPage(
      title: 'Team',
      subtitle: 'People who can sign in and help run your waiting lines.',
      action: FilledButton.icon(
        onPressed: _invite,
        icon: const Icon(Icons.person_add_alt_outlined),
        label: const Text('Invite'),
      ),
      onRefresh: () async => ref.invalidate(staffRosterProvider),
      children: [
        async.when(
          loading: () => const QuykLoadingBlock(),
          error: (e, _) => QuykMessageCard(
            icon: Icons.cloud_off_rounded,
            title: 'We couldn’t load your team',
            subtitle: apiExceptionMessage(e),
            actionLabel: 'Try again',
            onAction: () => ref.invalidate(staffRosterProvider),
          ),
          data: (roster) {
            final members = roster.members.where((m) => m.isActive).toList();
            final pending = roster.invitations;
            if (members.isEmpty && pending.isEmpty) {
              return QuykMessageCard(
                icon: Icons.groups_outlined,
                title: 'Invite your first host',
                subtitle: 'Send an invite so someone can sign in on a phone or tablet and call the next guest.',
                actionLabel: 'Invite someone',
                onAction: _invite,
              );
            }
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (members.isNotEmpty) ...[
                  QuykSectionTitle('Active · ${members.length}'),
                  QuykTable(
                    columns: const [
                      QuykColumn('Name', flex: 5),
                      QuykColumn('Role', flex: 3),
                      QuykColumn('Locations', flex: 4),
                      QuykColumn('', flex: 2, alignEnd: true),
                    ],
                    rows: [
                      for (final m in members)
                        [
                          Row(
                            children: [
                              QuykAvatar(name: m.fullName.isEmpty ? m.email : m.fullName, size: 36),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    QuykCellText(m.fullName.isEmpty ? m.email : m.fullName, strong: true),
                                    Text(
                                      m.id == currentUserId ? '${m.email} · you' : m.email,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(fontSize: 12, color: QuykColors.subtle),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          QuykPill(
                            label: staffRoleShortLabel(m.role),
                            background: m.role.toUpperCase() == 'OWNER' ? QuykColors.lime : QuykColors.mist,
                            foreground: m.role.toUpperCase() == 'OWNER' ? QuykColors.green : QuykColors.greenMuted,
                            fontSize: 11,
                          ),
                          QuykCellText(branchNames(m.branchIds)),
                          if (m.id == currentUserId || m.role.toUpperCase() == 'OWNER')
                            const SizedBox.shrink()
                          else
                            PopupMenuButton<String>(
                              tooltip: 'Team member options',
                              icon: const Icon(Icons.more_horiz_rounded, color: QuykColors.muted),
                              onSelected: (v) => v == 'remove' ? _disable(m) : _changeRole(m, v),
                              itemBuilder: (_) => [
                                if (canManageRoles)
                                  for (final r in const ['MANAGER', 'RECEPTIONIST', 'STAFF', 'VIEWER'])
                                    CheckedPopupMenuItem(
                                      value: r,
                                      checked: m.role.toUpperCase() == r,
                                      child: Text('Make ${staffRoleShortLabel(r).toLowerCase()}'),
                                    ),
                                if (canManageRoles) const PopupMenuDivider(),
                                const PopupMenuItem(
                                  value: 'remove',
                                  child: Text('Remove access', style: TextStyle(color: QuykColors.danger)),
                                ),
                              ],
                            ),
                        ],
                    ],
                  ),
                ],
                if (pending.isNotEmpty) ...[
                  const SizedBox(height: 24),
                  QuykSectionTitle('Invited · waiting to join · ${pending.length}'),
                  QuykTable(
                    columns: const [
                      QuykColumn('Email', flex: 6),
                      QuykColumn('Role', flex: 3),
                      QuykColumn('', flex: 3, alignEnd: true),
                    ],
                    rows: [
                      for (final invite in pending)
                        [
                          QuykCellText(invite.email, strong: true),
                          QuykPill(
                            label: staffRoleShortLabel(invite.role),
                            background: QuykColors.warningTint,
                            foreground: const Color(0xFF7A4B0C),
                            fontSize: 11,
                          ),
                          TextButton(onPressed: () => _resend(invite), child: const Text('Resend invite')),
                        ],
                    ],
                  ),
                ],
              ],
            );
          },
        ),
      ],
    );
  }
}
