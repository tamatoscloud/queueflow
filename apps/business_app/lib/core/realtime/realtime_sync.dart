import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'realtime_client.dart';

/// Binds Socket.IO events + HTTP polling fallback when the socket is down.
///
/// Re-subscribes on every socket connect/reconnect (rooms are per-socket).
/// Polls every [pollInterval] while disconnected/reconnecting.
void bindRealtimeRefresh({
  required Ref ref,
  required RealtimeClient client,
  required void Function() onRefresh,
  required Future<void> Function() onConnect,
  Duration pollInterval = const Duration(seconds: 10),
}) {
  Timer? pollTimer;

  void startPolling() {
    if (pollTimer != null) return;
    onRefresh();
    pollTimer = Timer.periodic(pollInterval, (_) => onRefresh());
  }

  void stopPolling() {
    pollTimer?.cancel();
    pollTimer = null;
  }

  void subscribe() {
    unawaited(onConnect());
  }

  client.registerOnConnected(subscribe);

  Future.microtask(() async {
    await client.connect();
    onRefresh();
  });

  final eventSub = client.events.listen((_) => onRefresh());
  final statusSub = client.status.listen((status) {
    switch (status) {
      case RealtimeStatus.connected:
        stopPolling();
      case RealtimeStatus.connecting:
      case RealtimeStatus.reconnecting:
      case RealtimeStatus.disconnected:
        startPolling();
    }
  });

  ref.onDispose(() {
    client.unregisterOnConnected(subscribe);
    eventSub.cancel();
    statusSub.cancel();
    stopPolling();
  });
}
