import 'dart:async';
import 'dart:math' as math;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'realtime_client.dart';
import 'refresh_gate.dart';

/// Binds Socket.IO events + HTTP polling.
///
/// A successful room subscription slows polling. It does not stop it.
/// Socket connect alone does not stop polling.
void bindRealtimeRefresh({
  required Ref ref,
  required RealtimeClient client,
  required void Function(RealtimeEnvelope? event) onRefresh,
  required Future<bool> Function() onSubscribe,
  Duration pollInterval = const Duration(seconds: 10),
  Duration coalesce = const Duration(milliseconds: 800),
  bool refreshOnBind = false,
}) {
  Timer? pollTimer;
  Timer? coalesceTimer;
  Duration? pollEvery;
  RealtimeEnvelope? pendingEvent;
  var disposed = false;
  final disconnectedEvery = Duration(
    milliseconds: math.min(5000, pollInterval.inMilliseconds),
  );

  void scheduleRefresh([RealtimeEnvelope? event]) {
    if (disposed) return;
    pendingEvent = preferPendingEvent(pendingEvent, event);
    coalesceTimer?.cancel();
    final waitOnly = isWaitOnlyEvent(pendingEvent?.event);
    final delay = waitOnly
        ? (coalesce.inMilliseconds < 1200
            ? const Duration(milliseconds: 1200)
            : coalesce)
        : coalesce;
    coalesceTimer = Timer(delay, () {
      if (!disposed) {
        final e = pendingEvent;
        pendingEvent = null;
        onRefresh(e);
      }
    });
  }

  void startPolling(Duration interval) {
    if (pollTimer != null && pollEvery == interval) return;
    pollTimer?.cancel();
    pollEvery = interval;
    pollTimer = Timer.periodic(interval, (_) => scheduleRefresh());
  }

  void stopPolling() {
    pollTimer?.cancel();
    pollTimer = null;
    pollEvery = null;
  }

  Future<bool> subscribe() => onSubscribe();

  client.registerOnConnected(subscribe);

  // Start polling without forcing an immediate invalidate — callers often
  // already have a fresh fetch in flight (Today / console open).
  Future.microtask(() {
    if (disposed) return;
    startPolling(disconnectedEvery);
    if (refreshOnBind) scheduleRefresh();
  });
  unawaited(client.connect());

  final eventSub = client.events.listen(scheduleRefresh);
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
    disposed = true;
    client.unregisterOnConnected(subscribe);
    eventSub.cancel();
    authSub.cancel();
    statusSub.cancel();
    stopPolling();
    coalesceTimer?.cancel();
  });
}
