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
  Duration coalesce = const Duration(milliseconds: 800),
  bool refreshOnBind = false,
}) {
  Timer? pollTimer;
  Timer? coalesceTimer;
  var disposed = false;

  void scheduleRefresh() {
    if (disposed) return;
    coalesceTimer?.cancel();
    coalesceTimer = Timer(coalesce, () {
      if (!disposed) onRefresh();
    });
  }

  void startPolling() {
    if (pollTimer != null) return;
    pollTimer = Timer.periodic(pollInterval, (_) => scheduleRefresh());
  }

  void stopPolling() {
    pollTimer?.cancel();
    pollTimer = null;
  }

  Future<bool> subscribe() => onSubscribe();

  client.registerOnConnected(subscribe);

  // Start polling without forcing an immediate invalidate — callers often
  // already have a fresh fetch in flight (Today / console open).
  Future.microtask(() {
    if (disposed) return;
    startPolling();
    if (refreshOnBind) scheduleRefresh();
  });
  unawaited(client.connect());

  final eventSub = client.events.listen((_) => scheduleRefresh());
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
    disposed = true;
    client.unregisterOnConnected(subscribe);
    eventSub.cancel();
    authSub.cancel();
    statusSub.cancel();
    stopPolling();
    coalesceTimer?.cancel();
  });
}
