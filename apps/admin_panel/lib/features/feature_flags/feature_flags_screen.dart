import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../core/network/api_error_message.dart';
import '../../core/network/platform_api_client.dart';
import '../../shared/widgets/calm/calm_card.dart';
import '../../shared/widgets/calm/calm_empty_state.dart';
import '../../shared/widgets/calm/calm_page_scaffold.dart';
import '../../shared/widgets/calm/calm_section_label.dart';

final featureFlagsProvider = FutureProvider.autoDispose((ref) async {
  return ref.watch(platformApiClientProvider).getFeatureFlags();
});

class FeatureFlagsScreen extends ConsumerWidget {
  const FeatureFlagsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(featureFlagsProvider);

    return async.when(
      loading: () => const CalmPageScaffold(isLoading: true, title: 'Feature flags'),
      error: (_, __) => CalmPageScaffold(
        title: 'Feature flags',
        errorMessage: 'We couldn\'t load feature flags.',
        onRetry: () => ref.invalidate(featureFlagsProvider),
      ),
      data: (flags) {
        final global = (flags['global'] as Map<String, dynamic>?) ?? {};
        final businessOverrides = flags['businesses'];

        return CalmPageScaffold(
          title: 'Feature flags',
          subtitle: 'Platform-wide and business settings',
          onRefresh: () async => ref.invalidate(featureFlagsProvider),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const CalmSectionLabel('Global'),
              const SizedBox(height: AppSpacing.sm),
              if (global.isEmpty)
                const CalmEmptyState(
                  title: 'No global flags',
                  message: 'Feature flags will appear here when configured.',
                  icon: Icons.flag_outlined,
                )
              else
                CalmCard(
                  padding: EdgeInsets.zero,
                  child: Column(
                    children: [
                      for (final entry in global.entries) ...[
                        SwitchListTile(
                          title: Text(_friendlyFlagName(entry.key)),
                          subtitle: Text(entry.value == true ? 'Enabled' : 'Disabled'),
                          value: entry.value == true,
                          activeThumbColor: AppColors.calmViolet,
                          onChanged: (v) async {
                            final updated = Map<String, dynamic>.from(global);
                            updated[entry.key] = v;
                            try {
                              await ref.read(platformApiClientProvider).updateGlobalFeatureFlags(updated);
                              ref.invalidate(featureFlagsProvider);
                            } catch (e) {
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text(apiExceptionMessage(e))),
                                );
                              }
                            }
                          },
                        ),
                        if (entry.key != global.keys.last) const Divider(height: 1, color: AppColors.calmBorder),
                      ],
                    ],
                  ),
                ),
              const SizedBox(height: AppSpacing.lg),
              const CalmSectionLabel('Business-specific'),
              const SizedBox(height: AppSpacing.sm),
              CalmCard(
                child: Text(
                  businessOverrides == null
                      ? 'Managed by platform configuration. Open a business to review tenant-specific overrides when available.'
                      : 'Business-specific overrides are managed via platform configuration.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.calmWarmGray),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  String _friendlyFlagName(String key) => key
      .replaceAll('_', ' ')
      .split(' ')
      .map((w) => w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1)}')
      .join(' ');
}
