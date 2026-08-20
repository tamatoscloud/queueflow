import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';
import 'package:queueflow_widgets/queueflow_widgets.dart';

import '../../../core/config/customer_portal_url.dart';
import '../../../core/models/models.dart';
import '../../../core/network/business_api_client.dart';
import '../../../core/restaurant/restaurant_config_provider.dart';
import '../../../core/restaurant/service_mode.dart';
import '../../../features/auth/presentation/auth_controller.dart';
import '../../../shared/widgets/calm/calm_card.dart';
import '../../../shared/widgets/calm/calm_section_label.dart';
import '../../../shared/widgets/skeleton_loaders.dart';
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
      SnackBar(content: Text(message ?? 'URL copied to clipboard')),
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
    final isTablet = Breakpoints.isTablet(context);

    return Scaffold(
      backgroundColor: AppColors.calmIvory,
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(queuesProvider),
        child: async.when(
          loading: () => ListView.builder(
            padding: const EdgeInsets.all(AppSpacing.md),
            itemCount: 4,
            itemBuilder: (_, __) => const ListTileSkeleton(),
          ),
          error: (e, _) => PageError(
            message: '$e',
            onRetry: () => ref.invalidate(queuesProvider),
          ),
          data: (queues) {
            if (queues.isEmpty) {
              return ListView(
                children: const [
                  SizedBox(height: 80),
                  EmptyStateView(
                    title: 'No queues',
                    message: 'Create a queue to generate customer QR codes.',
                    icon: Icons.qr_code_2_outlined,
                  ),
                ],
              );
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

            return ListView(
              padding: EdgeInsets.all(isTablet ? AppSpacing.lg : AppSpacing.md),
              children: [
                const CalmSectionLabel(
                  'Customer QR codes',
                  subtitle: 'Print or share so guests can scan and join',
                ),
                const SizedBox(height: AppSpacing.sm),
                SegmentedButton<int>(
                  segments: [
                    for (var i = 0; i < enabledModes.length; i++)
                      ButtonSegment(
                        value: i,
                        label: Text(ServiceModeInfo.forMode(enabledModes[i]).shortLabel),
                        icon: Icon(ServiceModeInfo.forMode(enabledModes[i]).icon, size: 18),
                      ),
                  ],
                  selected: {_serviceModeTab.clamp(0, enabledModes.length - 1)},
                  onSelectionChanged: (s) => setState(() {
                    _serviceModeTab = s.first;
                    _selectedQueueId = null;
                  }),
                ),
                if (modeQueues.isEmpty) ...[
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    'No $mode queues yet — showing all queues. Create a ${modeInfo.label.toLowerCase()} queue to enable dedicated QR codes.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.neutral500),
                  ),
                ],
                const SizedBox(height: AppSpacing.md),
                CalmCard(
                  child: Text(
                    modeInfo.scanInstruction,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                if (isTablet)
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: _QueueList(
                          queues: visibleQueues,
                          selectedId: selected.id,
                          onSelect: (id) => setState(() => _selectedQueueId = id),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.lg),
                      Expanded(
                        flex: 2,
                        child: _QrPreview(
                          queue: selected,
                          joinUrl: joinUrl,
                          modeInfo: ServiceModeInfo.forMode(selected.serviceMode),
                          businessName: businessName,
                          onCopy: () => _copyUrl(context, joinUrl),
                          onPrint: () => _showPrintDialog(context, selected, joinUrl, businessName),
                          onShare: () => _copyUrl(
                            context,
                            'Join ${selected.name}: $joinUrl',
                            message: 'Share text copied',
                          ),
                        ),
                      ),
                    ],
                  )
                else ...[
                  _QueueList(
                    queues: visibleQueues,
                    selectedId: selected.id,
                    onSelect: (id) => setState(() => _selectedQueueId = id),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  _QrPreview(
                    queue: selected,
                    joinUrl: joinUrl,
                    modeInfo: ServiceModeInfo.forMode(selected.serviceMode),
                    businessName: businessName,
                    onCopy: () => _copyUrl(context, joinUrl),
                    onPrint: () => _showPrintDialog(context, selected, joinUrl, businessName),
                    onShare: () => _copyUrl(
                      context,
                      'Join ${selected.name}: $joinUrl',
                      message: 'Share text copied',
                    ),
                  ),
                ],
              ],
            );
          },
        ),
      ),
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
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(title: 'Queues'),
        ...queues.map(
          (q) => Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
            child: AppCard(
              variant: q.id == selectedId ? AppCardVariant.gradient : AppCardVariant.elevated,
              onTap: () => onSelect(q.id),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: q.id == selectedId
                          ? Colors.white.withValues(alpha: 0.2)
                          : ServiceModeInfo.forMode(q.serviceMode).color.withValues(alpha: 0.1),
                      borderRadius: AppRadius.mdAll,
                    ),
                    child: Text(
                      q.prefix,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            color: q.id == selectedId
                                ? Colors.white
                                : ServiceModeInfo.forMode(q.serviceMode).color,
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          q.name,
                          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                fontWeight: FontWeight.w600,
                                color: q.id == selectedId ? Colors.white : null,
                              ),
                        ),
                        Text(
                          '${ServiceModeInfo.forMode(q.serviceMode).label} · ${q.waitingCount} waiting',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: q.id == selectedId ? Colors.white.withValues(alpha: 0.8) : null,
                              ),
                        ),
                      ],
                    ),
                  ),
                  StatusBadge(status: q.status),
                ],
              ),
            ),
          ),
        ),
      ],
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
    return AppCard(
      child: Column(
        children: [
          Text(
            queue.name,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            modeInfo.label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.neutral600),
          ),
          const SizedBox(height: AppSpacing.lg),
          _PrintablePoster(
            businessName: businessName,
            queueName: queue.name,
            modeInfo: modeInfo,
            url: joinUrl,
          ),
          const SizedBox(height: AppSpacing.md),
          SelectableText(
            joinUrl,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.neutral500),
          ),
          const SizedBox(height: AppSpacing.lg),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            alignment: WrapAlignment.center,
            children: [
              AppButton(
                label: 'Copy link',
                icon: Icons.copy,
                size: AppButtonSize.sm,
                onPressed: onCopy,
              ),
              AppButton(
                label: 'Share',
                icon: Icons.share_outlined,
                variant: AppButtonVariant.secondary,
                size: AppButtonSize.sm,
                onPressed: onShare,
              ),
              AppButton(
                label: 'Print poster',
                icon: Icons.print_outlined,
                variant: AppButtonVariant.outline,
                size: AppButtonSize.sm,
                onPressed: onPrint,
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
      padding: const EdgeInsets.all(AppSpacing.xl),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: AppRadius.xlAll,
        border: Border.all(color: AppColors.neutral200),
        boxShadow: AppShadows.md(Theme.of(context).brightness),
      ),
      child: Column(
        children: [
          Text(
            'WELCOME TO',
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  letterSpacing: 2,
                  color: AppColors.neutral500,
                  fontWeight: FontWeight.w700,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            businessName.toUpperCase(),
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                  color: AppColors.neutral900,
                ),
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            modeInfo.posterHeadline.toUpperCase(),
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: modeInfo.color,
                ),
          ),
          const SizedBox(height: AppSpacing.lg),
          QrImageView(
            data: url,
            size: 200,
            backgroundColor: Colors.white,
            eyeStyle: QrEyeStyle(
              eyeShape: QrEyeShape.square,
              color: modeInfo.color,
            ),
            dataModuleStyle: const QrDataModuleStyle(
              dataModuleShape: QrDataModuleShape.square,
              color: AppColors.neutral800,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            modeInfo.posterSubline,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.neutral600),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            queueName,
            style: Theme.of(context).textTheme.labelMedium?.copyWith(color: AppColors.neutral400),
          ),
        ],
      ),
    );
  }
}
