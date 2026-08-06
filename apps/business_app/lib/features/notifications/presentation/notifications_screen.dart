import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../../core/models/notification_model.dart';
import '../../../core/network/business_api_client.dart';
import '../../../core/routing/app_routes.dart';
import '../../../shared/widgets/calm/calm_alert_card.dart';
import '../../../shared/widgets/calm/calm_empty_state.dart';
import '../../../shared/widgets/calm/calm_section_label.dart';

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
    return Scaffold(
      backgroundColor: AppColors.calmIvory,
      body: RefreshIndicator(
        onRefresh: () => ref.read(notificationsNotifierProvider.notifier).refresh(),
        child: async.when(
          loading: () => const Center(child: CircularProgressIndicator(color: AppColors.calmViolet)),
          error: (_, __) => ListView(
            children: [
              const SizedBox(height: 80),
              CalmEmptyState(
                title: 'Couldn\'t load alerts',
                message: 'We\'ll try again when you pull to refresh.',
                icon: Icons.notifications_off_outlined,
                actionLabel: 'Try again',
                onAction: () => ref.read(notificationsNotifierProvider.notifier).refresh(),
              ),
            ],
          ),
          data: (items) {
            if (items.isEmpty) {
              return ListView(
                children: const [
                  SizedBox(height: 40),
                  Padding(
                    padding: EdgeInsets.all(AppSpacing.md),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Alerts',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w800,
                            color: AppColors.calmCharcoal,
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'What needs your attention',
                          style: TextStyle(color: AppColors.calmWarmGray),
                        ),
                      ],
                    ),
                  ),
                  CalmEmptyState(
                    title: 'You\'re all caught up',
                    message: 'Customer alerts and queue updates will appear here when they need your attention.',
                    icon: Icons.check_circle_outline,
                  ),
                ],
              );
            }

            final needsAttention = <NotificationModel>[];
            final customerIssues = <NotificationModel>[];
            final completed = <NotificationModel>[];

            for (final n in items) {
              final type = n.type.toUpperCase();
              if (n.status == 'DELIVERED' || n.status == 'COMPLETED') {
                completed.add(n);
              } else if (type.contains('FAIL') || type.contains('NO_SHOW') || type.contains('ISSUE')) {
                customerIssues.add(n);
              } else {
                needsAttention.add(n);
              }
            }

            return ListView(
              controller: _scroll,
              padding: const EdgeInsets.all(AppSpacing.md),
              children: [
                Text(
                  'Alerts',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: AppColors.calmCharcoal,
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  'What needs your attention',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.calmWarmGray),
                ),
                const SizedBox(height: AppSpacing.lg),
                if (needsAttention.isNotEmpty) ...[
                  const CalmSectionLabel('Needs attention'),
                  const SizedBox(height: AppSpacing.sm),
                  ...needsAttention.map((n) => Padding(
                        padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                        child: _alertCard(context, n, CalmAlertSeverity.attention),
                      )),
                  const SizedBox(height: AppSpacing.md),
                ],
                if (customerIssues.isNotEmpty) ...[
                  const CalmSectionLabel('Customer issues'),
                  const SizedBox(height: AppSpacing.sm),
                  ...customerIssues.map((n) => Padding(
                        padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                        child: _alertCard(context, n, CalmAlertSeverity.info),
                      )),
                  const SizedBox(height: AppSpacing.md),
                ],
                if (completed.isNotEmpty) ...[
                  const CalmSectionLabel('Completed'),
                  const SizedBox(height: AppSpacing.sm),
                  ...completed.take(10).map((n) => Padding(
                        padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                        child: _alertCard(context, n, CalmAlertSeverity.completed),
                      )),
                ],
                const SizedBox(height: AppSpacing.md),
                const Center(
                  child: SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.calmViolet),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _alertCard(BuildContext context, NotificationModel n, CalmAlertSeverity severity) {
    final title = _humanTitle(n);
    final message = n.message?.trim().isNotEmpty == true ? n.message! : _humanMessage(n);
    final detail = DateFormat.yMMMd().add_jm().format(n.createdAt);
    final showAction = severity != CalmAlertSeverity.completed;

    return CalmAlertCard(
      title: title,
      message: message,
      detail: detail,
      severity: severity,
      actionLabel: showAction ? 'View queues' : null,
      onAction: showAction ? () => context.go(AppRoutes.queues) : null,
    );
  }

  String _humanTitle(NotificationModel n) {
    final type = n.type.replaceAll('_', ' ').toLowerCase();
    if (type.contains('wait')) return 'Long wait time';
    if (type.contains('ready')) return 'Customer ready';
    if (type.contains('no show')) return 'No show';
    if (type.contains('sms') || type.contains('notification')) return 'Customer notification';
    return type.isEmpty ? 'Queue update' : _titleCase(type);
  }

  String _humanMessage(NotificationModel n) {
    if (n.recipientPhone?.trim().isNotEmpty == true) {
      return 'Sent to ${n.recipientPhone}';
    }
    return 'Status: ${_titleCase(n.status.toLowerCase())}';
  }

  String _titleCase(String value) {
    return value.split(' ').map((w) => w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1)}').join(' ');
  }
}
