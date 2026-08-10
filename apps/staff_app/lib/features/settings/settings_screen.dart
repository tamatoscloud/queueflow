import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../../features/settings/break_mode_provider.dart';

/// Staff settings — theme + break mode.
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final onBreak = ref.watch(breakModeProvider);

    return GlassPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Settings',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: AppSpacing.sm),
          const ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(Icons.dark_mode_outlined),
            title: Text('Appearance'),
            subtitle: Text('Follow system theme'),
          ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(onBreak ? Icons.play_circle : Icons.pause_circle_outline),
            title: Text(onBreak ? 'End break' : 'Start break'),
            subtitle: Text(
              onBreak
                  ? 'Queue operations paused for you'
                  : 'Pause queue operations temporarily',
            ),
            onTap: () => ref.read(breakModeProvider.notifier).state = !onBreak,
          ),
        ],
      ),
    );
  }
}
