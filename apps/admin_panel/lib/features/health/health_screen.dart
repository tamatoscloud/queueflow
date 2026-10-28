import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../../core/network/api_error_message.dart';
import '../../core/network/platform_api_client.dart';

final systemHealthProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  return ref.watch(platformApiClientProvider).getSystemHealth();
});

enum ServiceState { up, degraded, down, disabled, unknown }

ServiceState serviceState(dynamic value) {
  final raw = (value is Map ? value['status'] : value)?.toString().toLowerCase() ?? '';
  return switch (raw) {
    'up' || 'ok' || 'healthy' => ServiceState.up,
    'degraded' => ServiceState.degraded,
    'down' || 'error' || 'failed' => ServiceState.down,
    // An optional service that isn't configured (e.g. no Redis) is not a fault.
    'disabled' || 'off' || 'not_configured' => ServiceState.disabled,
    _ => ServiceState.unknown,
  };
}

/// Services that are degraded, down or unreadable.
int healthIssueCount(Map<String, dynamic> health) => health.values
    .map(serviceState)
    .where((s) => s == ServiceState.degraded || s == ServiceState.down || s == ServiceState.unknown)
    .length;

String serviceLabel(String key) => switch (key) {
      'api' => 'API',
      'database' => 'Database',
      'redis' => 'Cache (Redis)',
      'socketIo' => 'Realtime updates',
      'notificationQueue' => 'Guest notifications',
      'workers' => 'Background workers',
      'notificationWorkers' => 'Notification workers',
      'supabase' => 'Storage (Supabase)',
      _ => humanizeKey(key),
    };

/// `notificationWorkers` → `Notification workers`.
String humanizeKey(String key) {
  final words = key
      .replaceAllMapped(RegExp(r'([a-z0-9])([A-Z])'), (m) => '${m[1]} ${m[2]}')
      .replaceAll(RegExp(r'[_-]+'), ' ')
      .trim()
      .toLowerCase();
  return words.isEmpty ? key : words[0].toUpperCase() + words.substring(1);
}

/// Readable one-liner from a health check's extra fields.
String serviceDetail(Object? value) {
  if (value is! Map) return '';
  final parts = <String>[];
  final latency = value['latencyMs'];
  if (latency is num) parts.add('${latency.round()} ms');
  final detail = value['detail'];
  if (detail is String && detail.trim().isNotEmpty) parts.add(detail.trim());
  final checked = DateTime.tryParse('${value['lastCheckedAt'] ?? ''}');
  if (checked != null) {
    final ago = DateTime.now().difference(checked.toLocal());
    parts.add(ago.inMinutes < 1 ? 'checked just now' : 'checked ${ago.inMinutes} min ago');
  }
  return parts.join(' · ');
}

String _serviceSummary(String key, ServiceState state) => switch (state) {
      ServiceState.up => 'Working normally',
      ServiceState.disabled => 'Not enabled on this environment',
      ServiceState.degraded => switch (key) {
          'notificationQueue' => 'Some guest alerts may be delayed or failing',
          'socketIo' => 'Live updates may be delayed',
          _ => 'Working, but slower or partly unavailable',
        },
      ServiceState.down => 'Not responding',
      ServiceState.unknown => 'Status couldn’t be read',
    };

Widget serviceStatePill(ServiceState state) {
  final (label, bg, fg) = switch (state) {
    ServiceState.up => ('Up', QuykColors.lime, QuykColors.green),
    ServiceState.disabled => ('Off', QuykColors.mist, QuykColors.greenMuted),
    ServiceState.degraded => ('Degraded', QuykColors.warningTint, const Color(0xFF7A4B0C)),
    ServiceState.down => ('Down', QuykColors.dangerTint, QuykColors.danger),
    ServiceState.unknown => ('Unknown', QuykColors.mist, QuykColors.greenMuted),
  };
  return QuykPill(label: label, background: bg, foreground: fg, fontSize: 11);
}

class HealthScreen extends ConsumerWidget {
  const HealthScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(systemHealthProvider);
    return QuykPage(
      title: 'Platform health',
      subtitle: 'Status of the services Quyk depends on.',
      onRefresh: () async => ref.invalidate(systemHealthProvider),
      action: OutlinedButton.icon(
        onPressed: () => ref.invalidate(systemHealthProvider),
        icon: const Icon(Icons.refresh_rounded, size: 18),
        label: const Text('Check again'),
      ),
      children: [
        async.when(
          loading: () => const QuykLoadingBlock(),
          error: (e, _) => QuykMessageCard(
            icon: Icons.cloud_off_rounded,
            title: 'We couldn’t check platform health',
            subtitle: apiExceptionMessage(e),
            actionLabel: 'Try again',
            onAction: () => ref.invalidate(systemHealthProvider),
          ),
          data: (health) => ServiceHealthTable(health: health),
        ),
      ],
    );
  }
}

/// Table of services with state and a short readable detail.
class ServiceHealthTable extends StatelessWidget {
  const ServiceHealthTable({super.key, required this.health});

  final Map<String, dynamic> health;

  @override
  Widget build(BuildContext context) {
    final issues = healthIssueCount(health);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        QuykCard(
          color: issues == 0 ? QuykColors.green : QuykColors.warningTint,
          borderColor: null,
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              QuykIconBubble(
                icon: issues == 0 ? Icons.check_rounded : Icons.priority_high_rounded,
                background: issues == 0 ? QuykColors.lime : QuykColors.warning,
                foreground: issues == 0 ? QuykColors.green : QuykColors.ink,
                size: 40,
              ),
              const SizedBox(width: 14),
              Text(
                issues == 0
                    ? 'All systems operational'
                    : '$issues service${issues == 1 ? ' needs' : 's need'} attention',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w600,
                  color: issues == 0 ? Colors.white : QuykColors.ink,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        QuykTable(
          columns: const [
            QuykColumn('Service', flex: 3),
            QuykColumn('Status', flex: 2),
            QuykColumn('What it means', flex: 5),
            QuykColumn('Detail', flex: 4),
          ],
          rows: [
            for (final entry in health.entries)
              [
                QuykCellText(serviceLabel(entry.key), strong: true),
                serviceStatePill(serviceState(entry.value)),
                QuykCellText(_serviceSummary(entry.key, serviceState(entry.value))),
                Text(
                  serviceDetail(entry.value),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12, color: QuykColors.subtle),
                ),
              ],
          ],
        ),
      ],
    );
  }
}
