import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../../core/models/notification_model.dart';
import '../../../core/network/business_api_client.dart';
import '../../../core/routing/staff_routes.dart';
import 'guest_messages_view.dart';

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
    final notifier = ref.read(notificationsNotifierProvider.notifier);
    return RefreshIndicator(
      color: QuykColors.green,
      backgroundColor: Colors.white,
      onRefresh: notifier.refresh,
      child: GuestMessagesView(
        scrollController: _scroll,
        items: async.valueOrNull ?? const <NotificationModel>[],
        loading: async.isLoading && !async.hasValue,
        errorMessage: async.hasError && !async.hasValue
            ? "We couldn't load message delivery history."
            : null,
        onRetry: notifier.refresh,
        onViewQueue: (n) => n.queueId == null
            ? context.go(StaffRoutes.today)
            : context.push(StaffRoutes.queueConsole(n.queueId!)),
      ),
    );
  }
}
