import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../../core/models/models.dart';

class ServiceModeInfo {
  const ServiceModeInfo({
    required this.label,
    required this.icon,
    required this.color,
    required this.waitingLabel,
    required this.callNextLabel,
    required this.completeLabel,
    required this.callNextActionLabel,
  });

  final String label;
  final IconData icon;
  final Color color;
  final String waitingLabel;
  final String callNextLabel;
  final String completeLabel;
  final String callNextActionLabel;

  static ServiceModeInfo forMode(String mode) => switch (mode) {
        'TAKEAWAY' => const ServiceModeInfo(
            label: 'Takeaway',
            icon: Icons.shopping_bag_outlined,
            color: AppColors.warning,
            waitingLabel: 'orders',
            callNextLabel: 'Call order',
            completeLabel: 'Collected',
            callNextActionLabel: 'Call next order',
          ),
        'DRIVE_IN' => const ServiceModeInfo(
            label: 'Drive-in',
            icon: Icons.directions_car_outlined,
            color: AppColors.info,
            waitingLabel: 'cars',
            callNextLabel: 'Call car',
            completeLabel: 'Serve',
            callNextActionLabel: 'Call next car',
          ),
        _ => const ServiceModeInfo(
            label: 'Dine-in',
            icon: Icons.restaurant_outlined,
            color: AppColors.calmViolet,
            waitingLabel: 'people',
            callNextLabel: 'Call party',
            completeLabel: 'Seat',
            callNextActionLabel: 'Call next',
          ),
      };
}

int waitingForMode(List<QueueModel> queues, String mode) =>
    queues.where((q) => q.serviceMode == mode).fold(0, (s, q) => s + q.waitingCount);

QueueModel? selectCallNextQueue(
  List<QueueModel> queues, {
  String? preferredQueueId,
  String? preferredServiceMode,
}) {
  final operable = queues.where((q) => q.isActive && !q.isPaused && !q.isClosed).toList();
  if (operable.isEmpty) return null;

  if (preferredQueueId != null) {
    for (final q in operable) {
      if (q.id == preferredQueueId) return q;
    }
  }

  if (preferredServiceMode != null) {
    final modeQueues = operable.where((q) => q.serviceMode == preferredServiceMode).toList()
      ..sort((a, b) => b.waitingCount.compareTo(a.waitingCount));
    if (modeQueues.isNotEmpty) return modeQueues.first;
  }

  final dineIn = operable.where((q) => q.serviceMode == 'DINE_IN').toList()
    ..sort((a, b) => b.waitingCount.compareTo(a.waitingCount));
  if (dineIn.isNotEmpty) return dineIn.first;

  operable.sort((a, b) => b.waitingCount.compareTo(a.waitingCount));
  return operable.first;
}
