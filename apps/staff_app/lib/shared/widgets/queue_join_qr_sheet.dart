import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../core/config/customer_portal_url.dart';

/// Join QR for a real queue UUID. Does not invent IDs.
Future<void> showQueueJoinQrSheet(
  BuildContext context, {
  required String queueId,
  required String queueName,
  String businessName = 'Quyk',
}) {
  final joinUrl = CustomerPortalUrl.joinUrl(queueId);
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.lightSurface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (sheetContext) {
      return Padding(
        padding: EdgeInsets.fromLTRB(
          AppSpacing.lg,
          AppSpacing.md,
          AppSpacing.lg,
          MediaQuery.paddingOf(sheetContext).bottom + AppSpacing.lg,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.neutral200,
                borderRadius: BorderRadius.circular(999),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              queueName,
              textAlign: TextAlign.center,
              style: Theme.of(sheetContext).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: AppColors.neutral900,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              'Scan to join',
              style: Theme.of(sheetContext).textTheme.bodyMedium?.copyWith(
                    color: AppColors.neutral500,
                  ),
            ),
            const SizedBox(height: AppSpacing.lg),
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.neutral200),
              ),
              child: QrImageView(
                data: joinUrl,
                size: 220,
                backgroundColor: Colors.white,
                eyeStyle: const QrEyeStyle(
                  eyeShape: QrEyeShape.square,
                  color: AppColors.primary,
                ),
                dataModuleStyle: const QrDataModuleStyle(
                  dataModuleShape: QrDataModuleShape.square,
                  color: AppColors.neutral900,
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            SelectableText(
              joinUrl,
              textAlign: TextAlign.center,
              style: Theme.of(sheetContext).textTheme.bodySmall?.copyWith(
                    color: AppColors.neutral500,
                  ),
            ),
            const SizedBox(height: AppSpacing.lg),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _copyJoinUrl(sheetContext, joinUrl),
                    icon: const Icon(Icons.copy),
                    label: const Text('Copy link'),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: () => _copyJoinUrl(
                      sheetContext,
                      joinUrl,
                      message: 'Join link copied — open it on a phone',
                    ),
                    icon: const Icon(Icons.open_in_new),
                    label: const Text('Copy & open'),
                    style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => _showPrintPoster(
                  sheetContext,
                  businessName: businessName,
                  queueName: queueName,
                  joinUrl: joinUrl,
                ),
                icon: const Icon(Icons.print_outlined),
                label: const Text('Print / save poster'),
              ),
            ),
          ],
        ),
      );
    },
  );
}

Future<void> _copyJoinUrl(
  BuildContext context,
  String joinUrl, {
  String message = 'Join link copied',
}) async {
  await Clipboard.setData(ClipboardData(text: joinUrl));
  if (!context.mounted) return;
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
}

Future<void> _showPrintPoster(
  BuildContext context, {
  required String businessName,
  required String queueName,
  required String joinUrl,
}) {
  return showDialog<void>(
    context: context,
    builder: (dialogContext) {
      return AlertDialog(
        contentPadding: const EdgeInsets.all(AppSpacing.lg),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              businessName.toUpperCase(),
              textAlign: TextAlign.center,
              style: Theme.of(dialogContext).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.2,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              'Scan to join the queue',
              style: Theme.of(dialogContext).textTheme.bodySmall?.copyWith(
                    color: AppColors.neutral500,
                  ),
            ),
            const SizedBox(height: AppSpacing.md),
            QrImageView(
              data: joinUrl,
              size: 240,
              backgroundColor: Colors.white,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              queueName,
              style: Theme.of(dialogContext).textTheme.labelLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: AppSpacing.sm),
            SelectableText(
              joinUrl,
              textAlign: TextAlign.center,
              style: Theme.of(dialogContext).textTheme.bodySmall,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Close'),
          ),
        ],
      );
    },
  );
}
