import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../../core/realtime/realtime_client.dart';

/// Listens to realtime queue events and surfaces short in-app staff alerts.
///
/// Does not replace SMS/WhatsApp to guests — this is for the host on the floor
/// when the board updates silently.
class StaffRealtimeFeedback extends ConsumerStatefulWidget {
  const StaffRealtimeFeedback({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<StaffRealtimeFeedback> createState() =>
      _StaffRealtimeFeedbackState();
}

class _StaffRealtimeFeedbackState extends ConsumerState<StaffRealtimeFeedback> {
  ProviderSubscription<AsyncValue<RealtimeEnvelope>>? _sub;
  String? _lastKey;

  @override
  void initState() {
    super.initState();
    _sub = ref.listenManual(realtimeEventsProvider, (prev, next) {
      next.whenData(_onEvent);
    });
  }

  @override
  void dispose() {
    _sub?.close();
    super.dispose();
  }

  void _onEvent(RealtimeEnvelope event) {
    final message = _messageFor(event);
    if (message == null) return;

    final key = '${event.event}:${event.queueId}:${event.occurredAt}';
    if (key == _lastKey) return;
    _lastKey = key;

    final messenger = ScaffoldMessenger.maybeOf(context);
    if (messenger == null) return;

    HapticFeedback.mediumImpact();
    // Alert beep for join/call so staff notice when looking away from the board.
    // Full FCM needs Firebase project config per build; in-app sound covers foreground ops.
    if (event.event == 'CustomerJoined' || event.event == 'CustomerCalled') {
      SystemSound.play(SystemSoundType.alert);
    }
    messenger.clearSnackBars();
    messenger.showSnackBar(
      SnackBar(
        content: Text(message),
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 3),
        backgroundColor: AppColors.calmCharcoal,
        action: SnackBarAction(
          label: 'OK',
          textColor: Colors.white,
          onPressed: messenger.hideCurrentSnackBar,
        ),
      ),
    );
  }

  String? _messageFor(RealtimeEnvelope event) {
    final code = event.payload['displayCode'] as String? ??
        event.payload['token'] as String? ??
        event.payload['ticket'] as String?;
    final name = event.payload['customerName'] as String? ??
        event.payload['fullName'] as String? ??
        event.payload['name'] as String?;
    final who = [
      if (code != null && code.isNotEmpty) '#$code',
      if (name != null && name.isNotEmpty) name,
    ].join(' · ');

    return switch (event.event) {
      'CustomerJoined' =>
        who.isEmpty ? 'New guest joined the queue' : 'Guest joined · $who',
      'CustomerCalled' =>
        who.isEmpty ? 'Guest called' : 'Called · $who',
      'CustomerHeld' =>
        who.isEmpty ? 'Guest put on hold' : 'On hold · $who',
      'CustomerSkipped' =>
        who.isEmpty ? 'Guest marked no-show' : 'No-show · $who',
      'CustomerCompleted' =>
        who.isEmpty ? 'Guest completed' : 'Completed · $who',
      'QueuePaused' => 'Queue paused',
      'QueueResumed' => 'Queue resumed',
      'QueueClosed' => 'Queue closed',
      _ => null,
    };
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
