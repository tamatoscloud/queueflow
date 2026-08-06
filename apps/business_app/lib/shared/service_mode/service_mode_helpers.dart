import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../core/models/queue_model.dart';

class ServiceModeInfo {
  const ServiceModeInfo({
    required this.label,
    required this.shortLabel,
    required this.icon,
    required this.color,
    required this.waitingLabel,
    required this.waitingUnitSingular,
    required this.waitingUnitPlural,
    required this.posterHeadline,
    required this.posterSubline,
    required this.scanInstruction,
  });

  final String label;
  final String shortLabel;
  final IconData icon;
  final Color color;
  final String waitingLabel;
  final String waitingUnitSingular;
  final String waitingUnitPlural;
  final String posterHeadline;
  final String posterSubline;
  final String scanInstruction;

  String waitingUnitLabel(int count) =>
      count == 1 ? waitingUnitSingular : waitingUnitPlural;

  static ServiceModeInfo forMode(String mode) => switch (mode) {
        'TAKEAWAY' => const ServiceModeInfo(
            label: 'Takeaway',
            shortLabel: 'Takeaway',
            icon: Icons.shopping_bag_outlined,
            color: AppColors.warning,
            waitingLabel: 'orders',
            waitingUnitSingular: 'order',
            waitingUnitPlural: 'orders',
            posterHeadline: 'SCAN TO JOIN',
            posterSubline: 'Takeaway · Track your pickup',
            scanInstruction: 'Customers scan after placing their order.',
          ),
        'DRIVE_IN' => const ServiceModeInfo(
            label: 'Drive-in',
            shortLabel: 'Drive-in',
            icon: Icons.directions_car_outlined,
            color: AppColors.secondary,
            waitingLabel: 'cars',
            waitingUnitSingular: 'car',
            waitingUnitPlural: 'cars',
            posterHeadline: 'SCAN TO JOIN',
            posterSubline: 'Drive-in · Stay in your vehicle',
            scanInstruction: 'Guests scan when they arrive.',
          ),
        _ => const ServiceModeInfo(
            label: 'Dine-in',
            shortLabel: 'Dine-in',
            icon: Icons.restaurant_outlined,
            color: AppColors.calmViolet,
            waitingLabel: 'parties',
            waitingUnitSingular: 'party',
            waitingUnitPlural: 'parties',
            posterHeadline: 'SCAN TO JOIN',
            posterSubline: 'Dine-in · Join the waiting list',
            scanInstruction: 'Guests scan this QR to join the waiting list.',
          ),
      };
}

List<QueueModel> queuesForMode(List<QueueModel> queues, String mode) =>
    queues.where((q) => q.serviceMode == mode).toList();

int waitingForMode(List<QueueModel> queues, String mode) =>
    queues.where((q) => q.serviceMode == mode).fold(0, (s, q) => s + q.waitingCount);
