import 'realtime_client.dart';

/// One follow-up refresh when an event arrives during an in-flight load.
class RefreshFollowUp {
  bool _queued = false;

  /// True when the caller should refresh now.
  bool begin({required bool busy}) {
    if (busy) {
      _queued = true;
      return false;
    }
    return true;
  }

  /// After the in-flight load settles. True once if a refresh was waiting.
  bool take() {
    if (!_queued) return false;
    _queued = false;
    return true;
  }
}

bool isWaitOnlyEvent(String? event) => event == 'EstimatedWaitChanged';

/// Keep a status event (Call, Hold, Complete) if an ETA update arrives in the
/// same coalesce window. An ETA event must not erase the Call.
RealtimeEnvelope? preferPendingEvent(
  RealtimeEnvelope? pending,
  RealtimeEnvelope? incoming,
) {
  if (incoming == null) return pending;
  if (pending == null) return incoming;
  if (isWaitOnlyEvent(pending.event) && !isWaitOnlyEvent(incoming.event)) {
    return incoming;
  }
  if (!isWaitOnlyEvent(pending.event) && isWaitOnlyEvent(incoming.event)) {
    return pending;
  }
  return incoming;
}
