import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';
import 'package:queueflow_widgets/queueflow_widgets.dart';

import '../../../core/models/notification_model.dart';
import '../../../core/network/business_api_client.dart';
import '../../../core/routing/staff_routes.dart';

class NotificationsNotifier extends StateNotifier<AsyncValue<List<NotificationModel>>> {
  NotificationsNotifier(this._api) : super(const AsyncValue.loading()) {
    loadMore();
  }

  final BusinessApiClient _api;
  int _page = 1;
  bool _hasMore = true;
  bool _loading = false;
  final List<NotificationModel> _items = [];

  Future<void> loadMore() async {
    if (_loading || !_hasMore) return;
    _loading = true;
    try {
      final batch = await _api.getNotifications(page: _page);
      if (batch.isEmpty) {
        _hasMore = false;
      } else {
        _items.addAll(batch);
        _page++;
      }
      state = AsyncValue.data(List.of(_items));
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    } finally {
      _loading = false;
    }
  }

  Future<void> refresh() async {
    _page = 1;
    _hasMore = true;
    _items.clear();
    state = const AsyncValue.loading();
    await loadMore();
  }
}

final notificationsNotifierProvider =
    StateNotifierProvider.autoDispose<NotificationsNotifier, AsyncValue<List<NotificationModel>>>((ref) {
  return NotificationsNotifier(ref.watch(businessApiClientProvider));
});

enum _AlertCategory { attention, issue, completed }

_AlertCategory _categoryFor(NotificationModel n) {
  final type = n.type.toUpperCase();
  if (type.contains('FAIL') || type.contains('ERROR') || n.status == 'FAILED') {
    return _AlertCategory.attention;
  }
  if (n.status == 'DELIVERED' || type.contains('COMPLETE')) {
    return _AlertCategory.completed;
  }
  return _AlertCategory.issue;
}

String _alertTitle(NotificationModel n) {
  final type = n.type.replaceAll('_', ' ');
  if (n.message != null && n.message!.isNotEmpty) return n.message!;
  return type.isEmpty ? 'Customer update' : type;
}

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  final _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    _scroll.addListener(() {
      if (_scroll.position.pixels >= _scroll.position.maxScrollExtent - 200) {
        ref.read(notificationsNotifierProvider.notifier).loadMore();
      }
    });
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(notificationsNotifierProvider);
    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () => ref.read(notificationsNotifierProvider.notifier).refresh(),
        child: async.when(
          loading: () => const PageLoading(message: 'Loading alerts…'),
          error: (e, _) => PageError(
            message: "We couldn't load alerts. We'll keep trying.",
            onRetry: () => ref.read(notificationsNotifierProvider.notifier).refresh(),
          ),
          data: (items) {
            if (items.isEmpty) {
              return ListView(
                children: const [
                  SizedBox(height: 80),
                  EmptyStateView(
                    title: 'All clear',
                    message: 'No alerts right now. Customer updates will appear here.',
                    icon: Icons.notifications_none_outlined,
                  ),
                ],
              );
            }

            final grouped = {
              _AlertCategory.attention: <NotificationModel>[],
              _AlertCategory.issue: <NotificationModel>[],
              _AlertCategory.completed: <NotificationModel>[],
            };
            for (final n in items) {
              grouped[_categoryFor(n)]!.add(n);
            }

            return ListView(
              controller: _scroll,
              padding: const EdgeInsets.all(AppSpacing.md),
              children: [
                Text(
                  'Alerts',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: AppSpacing.md),
                if (grouped[_AlertCategory.attention]!.isNotEmpty)
                  _AlertSection(
                    title: 'Needs attention',
                    emoji: '🔴',
                    items: grouped[_AlertCategory.attention]!,
                  ),
                if (grouped[_AlertCategory.issue]!.isNotEmpty)
                  _AlertSection(
                    title: 'Customer issue',
                    emoji: '🟡',
                    items: grouped[_AlertCategory.issue]!,
                  ),
                if (grouped[_AlertCategory.completed]!.isNotEmpty)
                  _AlertSection(
                    title: 'Completed',
                    emoji: '🟢',
                    items: grouped[_AlertCategory.completed]!,
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _AlertSection extends StatelessWidget {
  const _AlertSection({
    required this.title,
    required this.emoji,
    required this.items,
  });

  final String title;
  final String emoji;
  final List<NotificationModel> items;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.sm, top: AppSpacing.sm),
          child: Text(
            '$emoji $title',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
        ),
        ...items.map((n) => Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: _AlertCard(notification: n),
            )),
      ],
    );
  }
}

class _AlertCard extends StatelessWidget {
  const _AlertCard({required this.notification});
  final NotificationModel notification;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _alertTitle(notification),
            style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
          ),
          if (notification.recipientPhone != null) ...[
            const SizedBox(height: 4),
            Text(notification.recipientPhone!, style: Theme.of(context).textTheme.bodySmall),
          ],
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              StatusBadge(status: notification.status),
              const Spacer(),
              AppButton(
                label: 'View queue',
                size: AppButtonSize.sm,
                variant: AppButtonVariant.outline,
                onPressed: () => context.push(StaffRoutes.today),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
