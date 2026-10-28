import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../../core/network/api_error_message.dart';
import '../../core/network/platform_api_client.dart';

final featureFlagsProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  return ref.watch(platformApiClientProvider).getFeatureFlags();
});

String friendlyFlagName(String key) => key
    .replaceAllMapped(RegExp('([a-z])([A-Z])'), (m) => '${m[1]} ${m[2]}')
    .replaceAll(RegExp('[_-]+'), ' ')
    .trim()
    .split(' ')
    .map((w) => w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1).toLowerCase()}')
    .join(' ');

class FeatureFlagsScreen extends ConsumerStatefulWidget {
  const FeatureFlagsScreen({super.key});

  @override
  ConsumerState<FeatureFlagsScreen> createState() => _FeatureFlagsScreenState();
}

class _FeatureFlagsScreenState extends ConsumerState<FeatureFlagsScreen> {
  /// Local copy so quick successive toggles build on each other instead of
  /// overwriting with a stale server snapshot.
  Map<String, dynamic>? _flags;
  final Set<String> _saving = {};

  Future<void> _toggle(String key, bool value) async {
    final previous = Map<String, dynamic>.from(_flags!);
    setState(() {
      _flags = {..._flags!, key: value};
      _saving.add(key);
    });
    try {
      await ref.read(platformApiClientProvider).updateGlobalFeatureFlags(_flags!);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${friendlyFlagName(key)} ${value ? 'on' : 'off'} for everyone')),
        );
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _flags = previous);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(backgroundColor: QuykColors.danger, content: Text('Couldn’t save — ${apiExceptionMessage(e)}')),
      );
    } finally {
      if (mounted) setState(() => _saving.remove(key));
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(featureFlagsProvider);
    final loaded = async.valueOrNull;
    if (loaded != null && _flags == null) {
      _flags = Map<String, dynamic>.from((loaded['global'] as Map<String, dynamic>?) ?? const {});
    }
    return QuykPage(
      title: 'Feature flags',
      subtitle: 'Turn platform features on or off for every business.',
      maxWidth: 820,
      onRefresh: () async {
        _flags = null;
        ref.invalidate(featureFlagsProvider);
      },
      children: [
        if (async.isLoading && _flags == null)
          const QuykLoadingBlock()
        else if (async.hasError && _flags == null)
          QuykMessageCard(
            icon: Icons.cloud_off_rounded,
            title: 'We couldn’t load feature flags',
            subtitle: apiExceptionMessage(async.error!),
            actionLabel: 'Try again',
            onAction: () => ref.invalidate(featureFlagsProvider),
          )
        else if ((_flags ?? const {}).isEmpty)
          const QuykMessageCard(
            icon: Icons.flag_outlined,
            title: 'No feature flags yet',
            subtitle: 'Flags added to the platform configuration appear here.',
          )
        else
          QuykCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                for (final (i, entry) in _flags!.entries.indexed) ...[
                  if (i > 0) const Divider(height: 1),
                  SwitchListTile(
                    title: Text(friendlyFlagName(entry.key), style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Text(
                      _saving.contains(entry.key) ? 'Saving…' : (entry.value == true ? 'On for everyone' : 'Off'),
                      style: const TextStyle(fontSize: 12.5, color: QuykColors.subtle),
                    ),
                    value: entry.value == true,
                    onChanged: _saving.contains(entry.key) ? null : (v) => _toggle(entry.key, v),
                  ),
                ],
              ],
            ),
          ),
        const SizedBox(height: 14),
        const Text(
          'Changes apply to all businesses straight away.',
          style: TextStyle(fontSize: 12.5, color: QuykColors.subtle),
        ),
      ],
    );
  }
}
