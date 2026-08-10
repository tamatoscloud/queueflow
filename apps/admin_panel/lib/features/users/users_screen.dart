import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../../core/network/api_error_message.dart';
import '../../core/network/platform_api_client.dart';
import '../../shared/widgets/admin_widgets.dart';

final usersProvider = FutureProvider.autoDispose.family((ref, ({int page, String? search, String? role}) args) async {
  final api = ref.watch(platformApiClientProvider);
  return api.listUsers(page: args.page, search: args.search, role: args.role);
});

class UsersScreen extends ConsumerStatefulWidget {
  const UsersScreen({super.key});

  @override
  ConsumerState<UsersScreen> createState() => _UsersScreenState();
}

class _UsersScreenState extends ConsumerState<UsersScreen> {
  int _page = 1;
  String _search = '';
  String? _roleFilter;
  final _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final args = (page: _page, search: _search.isEmpty ? null : _search, role: _roleFilter);
    final async = ref.watch(usersProvider(args));

    return Column(
      children: [
        AdminToolbar(
          children: [
            AdminSearchField(
              controller: _searchCtrl,
              label: 'Search users',
              onSubmitted: (v) => setState(() {
                _search = v.trim();
                _page = 1;
              }),
            ),
            DropdownButton<String?>(
              value: _roleFilter,
              hint: const Text('All roles'),
              borderRadius: AppRadius.lgAll,
              items: const [
                DropdownMenuItem(value: null, child: Text('All roles')),
                DropdownMenuItem(value: 'PLATFORM_ADMIN', child: Text('Platform Admin')),
                DropdownMenuItem(value: 'OWNER', child: Text('Owner')),
                DropdownMenuItem(value: 'MANAGER', child: Text('Manager')),
                DropdownMenuItem(value: 'STAFF', child: Text('Staff')),
              ],
              onChanged: (v) => setState(() {
                _roleFilter = v;
                _page = 1;
              }),
            ),
          ],
        ),
        Expanded(
          child: async.when(
            loading: () => const PageLoading(),
            error: (e, _) => PageError(
              message: apiExceptionMessage(e),
              onRetry: () => ref.invalidate(usersProvider(args)),
            ),
            data: (page) => Column(
              children: [
                Expanded(
                  child: ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                    itemCount: page.items.length,
                    separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
                    itemBuilder: (context, i) {
                      final u = page.items[i];
                      return AdminDataCard(
                        title: u.fullName,
                        subtitle:
                            '${u.email} · ${u.businessName ?? 'Platform'} · ${u.roles.join(', ')}',
                        leading: AppAvatar(name: u.fullName, size: 40),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            StatusBadge(status: u.status),
                            PopupMenuButton<String>(
                              icon: const Icon(Icons.more_vert),
                              shape: RoundedRectangleBorder(borderRadius: AppRadius.lgAll),
                              onSelected: (action) => _handleAction(context, u.id, action),
                              itemBuilder: (_) => [
                                const PopupMenuItem(value: 'suspend', child: Text('Suspend')),
                                const PopupMenuItem(value: 'activate', child: Text('Activate')),
                                const PopupMenuItem(value: 'reset', child: Text('Reset password')),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
                AdminPagination(
                  page: _page,
                  totalPages: page.totalPages,
                  onPrevious: _page > 1 ? () => setState(() => _page--) : null,
                  onNext: _page < page.totalPages ? () => setState(() => _page++) : null,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _handleAction(BuildContext context, String userId, String action) async {
    final api = ref.read(platformApiClientProvider);
    try {
      if (action == 'reset') {
        final temp = await api.resetUserPassword(userId);
        if (context.mounted) {
          await showDialog<void>(
            context: context,
            builder: (ctx) => AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: AppRadius.xlAll),
              title: const Text('Temporary password'),
              content: SelectableText(temp),
              actions: [
                AppButton(
                  label: 'Copy',
                  variant: AppButtonVariant.secondary,
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: temp));
                    Navigator.pop(ctx);
                  },
                ),
              ],
            ),
          );
        }
      } else {
        await api.updateUserStatus(
          userId,
          action == 'suspend' ? 'SUSPENDED' : 'ACTIVE',
        );
        ref.invalidate(usersProvider);
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('User updated')));
        }
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiExceptionMessage(e))));
      }
    }
  }
}
