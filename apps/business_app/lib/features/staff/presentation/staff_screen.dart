import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../../core/models/staff_model.dart';
import '../../../core/network/business_api_client.dart';
import '../../../shared/widgets/calm/calm_card.dart';
import '../../../shared/widgets/calm/calm_section_label.dart';

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
      builder: (ctx) => AlertDialog(
        title: const Text('Invite staff'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: name, decoration: const InputDecoration(labelText: 'Full name')),
            TextField(controller: email, decoration: const InputDecoration(labelText: 'Email')),
            DropdownButtonFormField<String>(
              initialValue: role,
              items: const [
                DropdownMenuItem(value: 'MANAGER', child: Text('Manager')),
                DropdownMenuItem(value: 'RECEPTIONIST', child: Text('Receptionist')),
                DropdownMenuItem(value: 'STAFF', child: Text('Staff')),
                DropdownMenuItem(value: 'VIEWER', child: Text('Viewer')),
              ],
              onChanged: (v) => role = v ?? role,
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              final messenger = ScaffoldMessenger.of(context);
              try {
                await ref.read(businessApiClientProvider).inviteStaff(
                      StaffInviteRequest(email: email.text, fullName: name.text, roleName: role),
                    );
                if (ctx.mounted) {
                  Navigator.pop(ctx);
                }
                messenger.showSnackBar(
                  SnackBar(content: Text('Invitation sent to ${email.text}')),
                );
              } catch (e) {
                messenger.showSnackBar(
                  const SnackBar(content: Text('We couldn\'t send the invitation. Try again.')),
                );
              }
            },
            child: const Text('Send invite'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.calmIvory,
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          const CalmSectionLabel(
            'Staff',
            subtitle: 'Who is helping run your queues',
          ),
          const SizedBox(height: AppSpacing.lg),
          CalmCard(
            child: Column(
              children: [
                const Icon(Icons.groups_outlined, size: 48, color: AppColors.calmViolet),
                const SizedBox(height: AppSpacing.md),
                Text(
                  'Staff list coming soon',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  'You can invite team members now. A full staff list will appear when the invitations API supports it.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppColors.calmWarmGray,
                      ),
                ),
                const SizedBox(height: AppSpacing.lg),
                FilledButton.icon(
                  onPressed: _invite,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.calmViolet,
                    minimumSize: const Size.fromHeight(48),
                  ),
                  icon: const Icon(Icons.person_add_outlined),
                  label: const Text('Invite staff member'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
