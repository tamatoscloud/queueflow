import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../../../core/config/customer_portal_url.dart';
import '../../../core/models/models.dart';
import '../../../core/network/business_api_client.dart';
import '../../../core/restaurant/restaurant_config_provider.dart';
import '../../../core/restaurant/service_mode.dart';
import '../../../features/auth/presentation/auth_controller.dart';
import '../../queues/presentation/queues_screen.dart';
import 'service_mode_helpers.dart';

final qrCenterBusinessNameProvider = FutureProvider.autoDispose<String>((ref) async {
  final user = ref.watch(currentUserProvider);
  final businessId = user?.businessId;
  if (businessId == null) return 'Your restaurant';
  final business = await ref.watch(businessApiClientProvider).getBusiness(businessId);
  return business['name'] as String? ?? 'Your restaurant';
});

class QrCenterScreen extends ConsumerStatefulWidget {
  const QrCenterScreen({super.key});

  @override
  ConsumerState<QrCenterScreen> createState() => _QrCenterScreenState();
}

class _QrCenterScreenState extends ConsumerState<QrCenterScreen> {
  String? _selectedQueueId;
  int _serviceModeTab = 0;

  static const _modeKeys = ['DINE_IN', 'TAKEAWAY', 'DRIVE_IN'];

  List<String> _enabledModes(RestaurantConfig? config) {
    if (config == null) return _modeKeys;
    final enabled = _modeKeys
        .where((m) => config.enabledModes.any((e) => e.apiValue == m))
        .toList();
    return enabled.isEmpty ? _modeKeys : enabled;
  }

  String _activeMode(List<String> enabledModes) =>
      enabledModes[_serviceModeTab.clamp(0, enabledModes.length - 1)];

  String _qrUrlFor(QueueModel queue) {
    if (queue.serviceMode == 'TAKEAWAY') {
      return CustomerPortalUrl.branchModeUrl(
        mode: 'takeaway',
        branchId: queue.branchId,
        queueId: queue.id,
      );
    }
    if (queue.serviceMode == 'DRIVE_IN') {
      return CustomerPortalUrl.branchModeUrl(
        mode: 'drive',
        branchId: queue.branchId,
        queueId: queue.id,
      );
    }
    return CustomerPortalUrl.joinUrl(queue.id);
  }

  void _copyUrl(BuildContext context, String url, {String? message}) {
    Clipboard.setData(ClipboardData(text: url));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message ?? 'Link copied — you can share it or paste it into a poster')),
    );
  }

  void _showPrintDialog(BuildContext context, QueueModel queue, String url, String businessName) {
    final info = ServiceModeInfo.forMode(queue.serviceMode);
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Print poster · ${info.label}'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _PrintablePoster(
                businessName: businessName,
                queueName: queue.name,
                modeInfo: info,
                url: url,
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                'Print tips: A4 portrait, disable browser headers/footers, laminate for entrance placement.',
                style: Theme.of(ctx).textTheme.bodySmall,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Close')),
          FilledButton.icon(
            onPressed: () => _copyUrl(ctx, url),
            icon: const Icon(Icons.copy),
            label: const Text('Copy URL'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(queuesProvider);
    final businessName = ref.watch(qrCenterBusinessNameProvider).valueOrNull ?? 'Your restaurant';
    final enabledModes = _enabledModes(ref.watch(restaurantConfigProvider).valueOrNull);
    final wide = MediaQuery.sizeOf(context).width >= 1000;

    Future<void> refresh() async => ref.invalidate(queuesProvider);

    return QuykPage(
      title: 'Guest join codes',
      subtitle: 'Print or share a code so guests can scan and join your line.',
      onRefresh: refresh,
      children: [
        ...async.when(
          loading: () => const [QuykLoadingBlock()],
          error: (e, _) => [
            QuykMessageCard(
              icon: Icons.cloud_off_rounded,
              title: 'We couldn’t load your lines',
              subtitle: 'Check your connection and try again.',
              actionLabel: 'Try again',
              onAction: refresh,
            ),
          ],
          data: (queues) {
            if (queues.isEmpty) {
              return const [
                QuykMessageCard(
                  icon: Icons.qr_code_2_rounded,
                  title: 'No lines yet',
                  subtitle: 'Create a waiting line first — each line gets its own join code.',
                ),
              ];
            }
            final mode = _activeMode(enabledModes);
            final modeQueues = queuesForMode(queues, mode);
            final visibleQueues = modeQueues.isNotEmpty ? modeQueues : queues;
            final selectedId = _selectedQueueId != null && visibleQueues.any((q) => q.id == _selectedQueueId)
                ? _selectedQueueId!
                : visibleQueues.first.id;
            final selected = visibleQueues.firstWhere((q) => q.id == selectedId);
            final joinUrl = _qrUrlFor(selected);
            final modeInfo = ServiceModeInfo.forMode(mode);

            final list = _QueueList(
              queues: visibleQueues,
              selectedId: selected.id,
              onSelect: (id) => setState(() => _selectedQueueId = id),
            );
            final preview = _QrPreview(
              queue: selected,
              joinUrl: joinUrl,
              modeInfo: ServiceModeInfo.forMode(selected.serviceMode),
              businessName: businessName,
              onCopy: () => _copyUrl(context, joinUrl),
              onPrint: () => _showPrintDialog(context, selected, joinUrl, businessName),
              onShare: () => _copyUrl(context, 'Join ${selected.name}: $joinUrl', message: 'Share text copied'),
            );

            return [
              if (enabledModes.length > 1) ...[
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (var i = 0; i < enabledModes.length; i++)
                      QuykFilterChip(
                        label: ServiceModeInfo.forMode(enabledModes[i]).shortLabel,
                        selected: i == _serviceModeTab.clamp(0, enabledModes.length - 1),
                        onTap: () => setState(() {
                          _serviceModeTab = i;
                          _selectedQueueId = null;
                        }),
                      ),
                  ],
                ),
                const SizedBox(height: 14),
              ],
              QuykCard(
                color: QuykColors.limeTint,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                child: Row(
                  children: [
                    QuykIconBubble(icon: modeInfo.icon, background: Colors.white, size: 34),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        modeQueues.isEmpty
                            ? 'No ${modeInfo.label.toLowerCase()} lines yet, so all lines are shown. '
                                'Create a ${modeInfo.label.toLowerCase()} line for a dedicated code.'
                            : modeInfo.scanInstruction,
                        style: const TextStyle(fontSize: 13.5, color: QuykColors.ink),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              if (wide)
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(flex: 5, child: list),
                    const SizedBox(width: 20),
                    Expanded(flex: 6, child: preview),
                  ],
                )
              else ...[
                list,
                const SizedBox(height: 20),
                preview,
              ],
            ];
          },
        ),
      ],
    );
  }
}

class _QueueList extends StatelessWidget {
  const _QueueList({
    required this.queues,
    required this.selectedId,
    required this.onSelect,
  });

  final List<QueueModel> queues;
  final String selectedId;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const QuykSectionTitle('Lines'),
        const SizedBox(height: 10),
        for (final q in queues) ...[
          _QueueRow(queue: q, selected: q.id == selectedId, onTap: () => onSelect(q.id)),
          const SizedBox(height: 8),
        ],
      ],
    );
  }
}

class _QueueRow extends StatelessWidget {
  const _QueueRow({required this.queue, required this.selected, required this.onTap});

  final QueueModel queue;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final info = ServiceModeInfo.forMode(queue.serviceMode);
    return QuykCard(
      onTap: onTap,
      color: selected ? QuykColors.limeTint : Colors.white,
      borderColor: selected ? QuykColors.green : QuykColors.line,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Row(
        children: [
          QuykIconBubble(icon: info.icon, size: 40),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  queue.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600, color: QuykColors.ink),
                ),
                const SizedBox(height: 2),
                Text(
                  '${info.label} · ${queue.waitingCount == 0 ? 'Empty' : '${queue.waitingCount} waiting'}',
                  style: const TextStyle(fontSize: 12, color: QuykColors.subtle),
                ),
              ],
            ),
          ),
          if (selected)
            const Icon(Icons.check_circle_rounded, color: QuykColors.green)
          else
            QuykPill(
              label: queueStatusLabel(queue.status),
              background: queue.status.toUpperCase() == 'ACTIVE' ? QuykColors.lime : QuykColors.mist,
              foreground: queue.status.toUpperCase() == 'ACTIVE' ? QuykColors.green : QuykColors.greenMuted,
              fontSize: 11,
            ),
        ],
      ),
    );
  }
}

class _QrPreview extends StatelessWidget {
  const _QrPreview({
    required this.queue,
    required this.joinUrl,
    required this.modeInfo,
    required this.businessName,
    required this.onCopy,
    required this.onPrint,
    required this.onShare,
  });

  final QueueModel queue;
  final String joinUrl;
  final ServiceModeInfo modeInfo;
  final String businessName;
  final VoidCallback onCopy;
  final VoidCallback onPrint;
  final VoidCallback onShare;

  @override
  Widget build(BuildContext context) {
    return QuykCard(
      radius: 24,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _PrintablePoster(
            businessName: businessName,
            queueName: queue.name,
            modeInfo: modeInfo,
            url: joinUrl,
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: QuykColors.cream,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(
              children: [
                const Icon(Icons.link_rounded, size: 18, color: QuykColors.muted),
                const SizedBox(width: 8),
                Expanded(
                  child: SelectableText(
                    joinUrl,
                    maxLines: 1,
                    style: const TextStyle(fontSize: 12.5, color: QuykColors.muted),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            alignment: WrapAlignment.center,
            children: [
              FilledButton.icon(
                onPressed: onPrint,
                icon: const Icon(Icons.print_outlined, size: 18),
                label: const Text('Print poster'),
              ),
              OutlinedButton.icon(
                onPressed: onCopy,
                icon: const Icon(Icons.copy_rounded, size: 18),
                label: const Text('Copy link'),
              ),
              OutlinedButton.icon(
                onPressed: onShare,
                icon: const Icon(Icons.ios_share_rounded, size: 18),
                label: const Text('Copy share text'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _PrintablePoster extends StatelessWidget {
  const _PrintablePoster({
    required this.businessName,
    required this.queueName,
    required this.modeInfo,
    required this.url,
  });

  final String businessName;
  final String queueName;
  final ServiceModeInfo modeInfo;
  final String url;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
      decoration: BoxDecoration(
        color: QuykColors.green,
        borderRadius: BorderRadius.circular(28),
      ),
      child: Column(
        children: [
          Text(
            businessName,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w600, color: Colors.white),
          ),
          const SizedBox(height: 6),
          Text(
            modeInfo.posterHeadline,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: QuykColors.lime),
          ),
          const SizedBox(height: 18),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(22)),
            child: QrImageView(
              data: url,
              size: 190,
              backgroundColor: Colors.white,
              eyeStyle: const QrEyeStyle(eyeShape: QrEyeShape.square, color: QuykColors.green),
              dataModuleStyle: const QrDataModuleStyle(
                dataModuleShape: QrDataModuleShape.square,
                color: QuykColors.green,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            modeInfo.posterSubline,
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 13, color: Colors.white.withValues(alpha: 0.78)),
          ),
          const SizedBox(height: 6),
          Text(
            queueName,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: QuykColors.lime),
          ),
        ],
      ),
    );
  }
}
