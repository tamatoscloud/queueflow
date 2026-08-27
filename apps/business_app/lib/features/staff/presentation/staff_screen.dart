import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../../core/models/staff_model.dart';
import '../../../core/network/business_api_client.dart';
import '../../../features/auth/presentation/auth_controller.dart';
import '../../../shared/widgets/calm/calm_card.dart';
import '../../../shared/widgets/calm/calm_section_label.dart';

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
                style: Theme.of(ctx).textTheme.bodySmall?.copyWith(color: AppColors.calmWarmGray),
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
            style: FilledButton.styleFrom(backgroundColor: AppColors.danger),
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

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(staffRosterProvider);
    final currentUserId = ref.watch(currentUserProvider)?.id;

    return Scaffold(
      backgroundColor: AppColors.calmIvory,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _invite,
        backgroundColor: AppColors.calmViolet,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.person_add_outlined),
        label: const Text('Invite'),
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(staffRosterProvider),
        child: async.when(
          loading: () => const Center(child: CircularProgressIndicator(color: AppColors.calmViolet)),
          error: (_, __) => ListView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            children: [
              const SizedBox(height: 80),
              CalmCard(
                child: Column(
                  children: [
                    Text(
                      'We couldn’t load your team.',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    FilledButton(
                      onPressed: () => ref.invalidate(staffRosterProvider),
                      child: const Text('Try again'),
                    ),
                  ],
                ),
              ),
            ],
          ),
          data: (roster) {
            final members = roster.members.where((m) => m.isActive).toList();
            final pending = roster.invitations;
            final isEmpty = members.isEmpty && pending.isEmpty;

            return ListView(
              padding: const EdgeInsets.all(AppSpacing.md),
              children: [
                const CalmSectionLabel(
                  'Your team',
                  subtitle: 'People who can help run your waiting lines',
                ),
                const SizedBox(height: AppSpacing.lg),
                if (isEmpty)
                  CalmCard(
                    child: Column(
                      children: [
                        const Icon(Icons.groups_outlined, size: 48, color: AppColors.calmViolet),
                        const SizedBox(height: AppSpacing.md),
                        Text(
                          'Invite your first host',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w700,
                              ),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          'Send an invite so someone can sign in on a phone or tablet and call the next guest.',
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: AppColors.calmWarmGray,
                              ),
                        ),
                        const SizedBox(height: AppSpacing.lg),
                        FilledButton.icon(
                          onPressed: _invite,
                          style: FilledButton.styleFrom(
                            backgroundColor: AppColors.primaryDark,
                            minimumSize: const Size.fromHeight(48),
                          ),
                          icon: const Icon(Icons.person_add_outlined),
                          label: const Text('Invite someone'),
                        ),
                      ],
                    ),
                  )
                else ...[
                  if (members.isNotEmpty) ...[
                    const CalmSectionLabel('Active'),
                    const SizedBox(height: AppSpacing.sm),
                    for (final member in members)
                      Padding(
                        padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                        child: CalmCard(
                          child: ListTile(
                            contentPadding: EdgeInsets.zero,
                            leading: CircleAvatar(
                              backgroundColor: AppColors.calmViolet.withValues(alpha: 0.15),
                              foregroundColor: AppColors.calmViolet,
                              child: Text(
                                member.fullName.isNotEmpty
                                    ? member.fullName.characters.first.toUpperCase()
                                    : '?',
                                style: const TextStyle(fontWeight: FontWeight.w700),
                              ),
                            ),
                            title: Text(
                              member.fullName.isNotEmpty ? member.fullName : member.email,
                              style: const TextStyle(fontWeight: FontWeight.w700),
                            ),
                            subtitle: Text(
                              '${staffRoleShortLabel(member.role)} · ${member.email}',
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: AppColors.calmWarmGray,
                                  ),
                            ),
                            trailing: member.id == currentUserId || member.role.toUpperCase() == 'OWNER'
                                ? null
                                : IconButton(
                                    tooltip: 'Remove access',
                                    icon: const Icon(Icons.person_off_outlined, color: AppColors.calmWarmGray),
                                    onPressed: () => _disable(member),
                                  ),
                          ),
                        ),
                      ),
                  ],
                  if (pending.isNotEmpty) ...[
                    const SizedBox(height: AppSpacing.md),
                    const CalmSectionLabel('Waiting to join', subtitle: 'Invite sent — not signed up yet'),
                    const SizedBox(height: AppSpacing.sm),
                    for (final invite in pending)
                      Padding(
                        padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                        child: CalmCard(
                          child: ListTile(
                            contentPadding: EdgeInsets.zero,
                            leading: const CircleAvatar(
                              backgroundColor: AppColors.warningLight,
                              foregroundColor: AppColors.warning,
                              child: Icon(Icons.mail_outline, size: 20),
                            ),
                            title: Text(invite.email, style: const TextStyle(fontWeight: FontWeight.w700)),
                            subtitle: Text(
                              'Invite pending · ${staffRoleShortLabel(invite.role)}',
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: AppColors.calmWarmGray,
                                  ),
                            ),
                            trailing: TextButton(
                              onPressed: () => _resend(invite),
                              child: const Text('Resend'),
                            ),
                          ),
                        ),
                      ),
                  ],
                ],
                const SizedBox(height: 88),
              ],
            );
          },
        ),
      ),
    );
  }
}
