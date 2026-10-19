import 'dart:async';
import 'dart:math' as math;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'realtime_client.dart';

/// Binds Socket.IO events + HTTP polling.
///
/// A successful room subscription slows polling. It does not stop it.
void bindRealtimeRefresh({
  required Ref ref,
  required RealtimeClient client,
  required void Function() onRefresh,
  required Future<bool> Function() onSubscribe,
  Duration pollInterval = const Duration(seconds: 10),
}) {
  Timer? pollTimer;
  Duration? pollEvery;
  final disconnectedEvery = Duration(
    milliseconds: math.min(5000, pollInterval.inMilliseconds),
  );

  void startPolling(Duration interval) {
    if (pollTimer != null && pollEvery == interval) return;
    pollTimer?.cancel();
    pollEvery = interval;
    pollTimer = Timer.periodic(interval, (_) => onRefresh());
  }

  void stopPolling() {
    pollTimer?.cancel();
    pollTimer = null;
    pollEvery = null;
  }

  Future<bool> subscribe() => onSubscribe();

  client.registerOnConnected(subscribe);

  Future.microtask(() async {
    await client.connect();
    startPolling(disconnectedEvery);
  });

  final eventSub = client.events.listen((_) => onRefresh());
  final authSub = client.subscriptionAuthorized.listen((authorized) {
    if (authorized) {
      startPolling(pollInterval);
    } else {
      startPolling(disconnectedEvery);
    }
  });
  final statusSub = client.status.listen((status) {
    switch (status) {
      case RealtimeStatus.connecting:
      case RealtimeStatus.reconnecting:
      case RealtimeStatus.disconnected:
        startPolling(disconnectedEvery);
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
