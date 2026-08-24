import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../../../core/models/queue_entry_model.dart';
import '../../../core/network/api_error_message.dart' show apiExceptionMessage;
import '../../../core/network/business_api_client.dart';
import '../../../features/queue_console/presentation/queue_console_screen.dart';
import '../calm/calm_primary_button.dart';
import '../calm/calm_section_label.dart';
import 'service_mode_helpers.dart';

Future<void> showCallNextSheet({
  required BuildContext context,
  required WidgetRef ref,
  required String queueId,
  required Future<void> Function() onRefresh,
  String serviceMode = 'DINE_IN',
  QueueEntryModel? nextEntry,
  bool calling = false,
}) async {
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => _CallNextSheet(
      queueId: queueId,
      serviceMode: serviceMode,
      nextEntry: nextEntry,
      calling: calling,
      onRefresh: onRefresh,
    ),
  );
}

class _CallNextSheet extends ConsumerStatefulWidget {
  const _CallNextSheet({
    required this.queueId,
    required this.onRefresh,
    required this.serviceMode,
    this.nextEntry,
    this.calling = false,
  });

  final String queueId;
  final String serviceMode;
  final QueueEntryModel? nextEntry;
  final bool calling;
  final Future<void> Function() onRefresh;

  @override
  ConsumerState<_CallNextSheet> createState() => _CallNextSheetState();
}

class _CallNextSheetState extends ConsumerState<_CallNextSheet> {
  bool _calling = false;
  bool _notified = false;
  String? _errorMessage;
  QueueEntryModel? _calledEntry;

  @override
  void initState() {
    super.initState();
    if (widget.calling && widget.nextEntry != null) {
      _runCallNext();
    }
  }

  int _waitMinutes(QueueEntryModel entry) {
    final joined = entry.joinedAt;
    if (joined == null) return 0;
    return DateTime.now().difference(joined).inMinutes;
  }

  String _entryDetail(QueueEntryModel entry) {
    final wait = _waitMinutes(entry);
    final waitText = wait < 1 ? '<1 min wait' : '$wait min wait';
    final meta = entry.metadata;
    return switch (widget.serviceMode) {
      'TAKEAWAY' => [
          if (meta?['orderNumber'] != null) 'Order #${meta!['orderNumber']}',
          waitText,
        ].join(' · '),
      'DRIVE_IN' => [
          if (meta?['vehiclePlate'] != null) '${meta!['vehiclePlate']}',
          if (meta?['vehicleColor'] != null) '${meta!['vehicleColor']}',
          waitText,
        ].where((s) => s.isNotEmpty).join(' · '),
      _ => 'Party of ${entry.partySize} · $waitText',
    };
  }

  Future<void> _runCallNext() async {
    setState(() {
      _calling = true;
      _errorMessage = null;
    });
    try {
      final entry = await ref.read(businessApiClientProvider).callNext(widget.queueId);
      if (!mounted) return;
      setState(() {
        _calledEntry = entry;
        _notified = true;
        _calling = false;
      });
      await widget.onRefresh();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _calling = false;
        _errorMessage = apiExceptionMessage(e);
      });
    }
  }

  Future<void> _entryAction(String action) async {
    final entry = _calledEntry ?? widget.nextEntry;
    if (entry == null) return;
    try {
      await entryAction(ref, widget.queueId, entry.id, action, widget.onRefresh);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (!mounted) return;
      setState(() => _errorMessage = apiExceptionMessage(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final entry = _calledEntry ?? widget.nextEntry;
    final modeInfo = ServiceModeInfo.forMode(widget.serviceMode);
    final isCalled = entry?.status == 'CALLED' || _calledEntry != null;

    return Container(
      margin: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.calmIvory,
        borderRadius: AppRadius.xlAll,
        border: Border.all(color: AppColors.calmBorder),
      ),
      child: Padding(
        padding: EdgeInsets.only(
          left: AppSpacing.lg,
          right: AppSpacing.lg,
          top: AppSpacing.md,
          bottom: MediaQuery.of(context).viewInsets.bottom + AppSpacing.lg,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.calmBorder,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            if (_calling)
              Column(
                children: [
                  const SizedBox(
                    height: 36,
                    width: 36,
                    child: CircularProgressIndicator(strokeWidth: 3, color: AppColors.calmViolet),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  const CalmSectionLabel('CALLING NEXT'),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    entry?.customerName ?? 'Guest',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: AppColors.calmCharcoal,
                        ),
                  ),
                ],
              )
            else if (entry == null)
              Column(
                children: [
                  const Icon(Icons.inbox_outlined, size: 48, color: AppColors.calmWarmGray),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    'Nobody waiting',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: AppColors.calmCharcoal,
                        ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    'The queue is empty right now.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.calmWarmGray),
                  ),
                ],
              )
            else ...[
              CalmSectionLabel(isCalled ? 'CUSTOMER CALLED' : 'CALLING NEXT'),
              const SizedBox(height: AppSpacing.md),
              Text(
                entry.customerName ?? 'Guest',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: AppColors.calmCharcoal,
                    ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                _entryDetail(entry),
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: AppColors.calmWarmGray),
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                modeInfo.label,
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      color: AppColors.calmViolet,
                      fontWeight: FontWeight.w600,
                    ),
              ),
              if (entry.displayCode.isNotEmpty) ...[
                const SizedBox(height: AppSpacing.sm),
                Text(
                  entry.displayCode,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: AppColors.calmWarmGray,
                      ),
                ),
              ],
              if (_notified || isCalled) ...[
                const SizedBox(height: AppSpacing.md),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.check_circle, color: AppColors.success, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'Customer notified',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppColors.success,
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                  ],
                ),
              ],
              if (_errorMessage != null) ...[
                const SizedBox(height: AppSpacing.md),
                Text(
                  _errorMessage!,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.danger),
                ),
              ],
              const SizedBox(height: AppSpacing.lg),
              if (entry.status == 'WAITING' && _calledEntry == null) ...[
                CalmPrimaryButton(
                  label: 'Call customer',
                  icon: Icons.campaign_outlined,
                  onPressed: _runCallNext,
                ),
              ],
              if (isCalled) ...[
                CalmPrimaryButton(
                  label: modeInfo.completeLabel,
                  icon: Icons.check_circle_outline,
                  variant: CalmPrimaryVariant.success,
                  onPressed: () => _entryAction('complete'),
                ),
                const SizedBox(height: AppSpacing.sm),
                CalmPrimaryButton(
                  label: 'Call again',
                  icon: Icons.replay,
                  onPressed: () => _entryAction('recall'),
                ),
                const SizedBox(height: AppSpacing.sm),
                Row(
                  children: [
                    Expanded(
                      child: AppButton(
                        label: 'Hold',
                        icon: Icons.pause_circle_outline,
                        variant: AppButtonVariant.secondary,
                        fullWidth: true,
                        onPressed: () => _entryAction('hold'),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: AppButton(
                        label: 'No show',
                        icon: Icons.person_off_outlined,
                        variant: AppButtonVariant.danger,
                        fullWidth: true,
                        onPressed: () => _entryAction('skip'),
                      ),
                    ),
                  ],
                ),
              ],
            ],
            const SizedBox(height: AppSpacing.md),
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close'),
            ),
          ],
        ),
      ),
    );
  }
}
