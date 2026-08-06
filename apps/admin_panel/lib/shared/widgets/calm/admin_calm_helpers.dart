import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

enum CalmPlatformStatus { healthy, needsAttention, degraded, inactive }

CalmPlatformStatus calmStatusFromRaw(String? raw) {
  final v = (raw ?? '').toLowerCase();
  if (v == 'up' || v == 'ok' || v == 'healthy' || v == 'active') return CalmPlatformStatus.healthy;
  if (v == 'degraded') return CalmPlatformStatus.degraded;
  if (v == 'inactive' || v == 'paused' || v == 'closed') return CalmPlatformStatus.inactive;
  if (v == 'down' || v == 'error' || v == 'failed') return CalmPlatformStatus.needsAttention;
  return CalmPlatformStatus.needsAttention;
}

String calmStatusLabel(CalmPlatformStatus status) => switch (status) {
      CalmPlatformStatus.healthy => 'Healthy',
      CalmPlatformStatus.needsAttention => 'Needs attention',
      CalmPlatformStatus.degraded => 'Degraded',
      CalmPlatformStatus.inactive => 'Inactive',
    };

String calmStatusDescription(CalmPlatformStatus status) => switch (status) {
      CalmPlatformStatus.healthy => 'All systems working normally',
      CalmPlatformStatus.needsAttention => 'Something requires review',
      CalmPlatformStatus.degraded => 'Some functionality may be affected',
      CalmPlatformStatus.inactive => 'Not currently active',
    };

Color calmStatusColor(CalmPlatformStatus status) => switch (status) {
      CalmPlatformStatus.healthy => AppColors.success,
      CalmPlatformStatus.needsAttention => AppColors.warning,
      CalmPlatformStatus.degraded => AppColors.warning,
      CalmPlatformStatus.inactive => AppColors.calmWarmGray,
    };

String calmHealthKeyLabel(String key) => switch (key) {
      'api' => 'API',
      'database' => 'Database',
      'redis' => 'Redis',
      'socketIo' => 'Realtime',
      'notificationQueue' => 'Notifications',
      _ => key,
    };

String calmHealthRawStatus(dynamic value) {
  if (value is Map) return value['status']?.toString() ?? 'unknown';
  return value.toString();
}

CalmPlatformStatus calmHealthStatus(dynamic value) => calmStatusFromRaw(calmHealthRawStatus(value));

String calmGreeting() {
  final hour = DateTime.now().hour;
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
