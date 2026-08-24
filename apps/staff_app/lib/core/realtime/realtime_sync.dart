import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'realtime_client.dart';

/// Binds Socket.IO events + HTTP polling fallback.
///
/// Polling stays active until subscription authorization succeeds (ack ok:true).
/// Socket connect alone does NOT stop polling.
void bindRealtimeRefresh({
  required Ref ref,
  required RealtimeClient client,
  required void Function() onRefresh,
  required Future<bool> Function() onSubscribe,
  Duration pollInterval = const Duration(seconds: 10),
}) {
  Timer? pollTimer;

  void startPolling() {
    if (pollTimer != null) return;
    pollTimer = Timer.periodic(pollInterval, (_) => onRefresh());
  }

  void stopPolling() {
    pollTimer?.cancel();
    pollTimer = null;
  }

  Future<bool> subscribe() => onSubscribe();

  client.registerOnConnected(subscribe);

  // Poll immediately — do not wait for Socket.IO connect (up to 15s).
  Future.microtask(() {
    startPolling();
    onRefresh();
  });
  unawaited(client.connect());

  final eventSub = client.events.listen((_) => onRefresh());
  final authSub = client.subscriptionAuthorized.listen((authorized) {
    if (authorized) {
      stopPolling();
    } else {
      startPolling();
    }
  });
  final statusSub = client.status.listen((status) {
    switch (status) {
      case RealtimeStatus.connecting:
      case RealtimeStatus.reconnecting:
      case RealtimeStatus.disconnected:
        startPolling();
      case RealtimeStatus.connected:
        break;
    }
  });

  ref.onDispose(() {
    client.unregisterOnConnected(subscribe);
    eventSub.cancel();
    authSub.cancel();
    statusSub.cancel();
    stopPolling();
  });
}
