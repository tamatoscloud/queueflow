import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_shared/queueflow_shared.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

enum RealtimeStatus { disconnected, connecting, connected, reconnecting }

class RealtimeEnvelope {
  RealtimeEnvelope({
    required this.event,
    required this.queueId,
    required this.businessId,
    required this.occurredAt,
    required this.payload,
  });

  final String event;
  final String queueId;
  final String businessId;
  final String occurredAt;
  final Map<String, dynamic> payload;

  factory RealtimeEnvelope.fromJson(Map<String, dynamic> json) =>
      RealtimeEnvelope(
        event: json['event'] as String? ?? '',
        queueId: json['queueId'] as String? ?? '',
        businessId: json['businessId'] as String? ?? '',
        occurredAt: json['occurredAt'] as String? ?? '',
        payload: (json['payload'] as Map<String, dynamic>?) ?? {},
      );
}

abstract final class TvRealtimeEvents {
  static const displayEvents = [
    'CustomerCalled',
    'CustomerCompleted',
    'CustomerSkipped',
    'QueuePaused',
    'QueueResumed',
    'QueueClosed',
    'EstimatedWaitChanged',
    'QueueUpdated',
  ];
}

/// Builds the Socket.IO payload for TV display subscription.
/// [displayToken] must be the backend-issued JWT (not the local pairing code).
Map<String, String> buildQueueDisplaySubscribePayload({
  required String queueId,
  required String displayToken,
}) {
  return {
    'queueId': queueId,
    'displayToken': displayToken,
  };
}

/// Parses subscription acknowledgement from the gateway.
bool isSubscribeAckOk(dynamic ack) {
  if (ack is Map) {
    return ack['ok'] == true;
  }
  if (ack is List && ack.isNotEmpty) {
    final first = ack.first;
    if (first is Map) return first['ok'] == true;
  }
  return false;
}

class TvRealtimeClient {
  TvRealtimeClient({required this.wsBaseUrl});

  final String wsBaseUrl;

  io.Socket? _socket;
  final _statusController = StreamController<RealtimeStatus>.broadcast();
  final _eventController = StreamController<RealtimeEnvelope>.broadcast();
  final _authorizedController = StreamController<bool>.broadcast();
  RealtimeStatus _status = RealtimeStatus.disconnected;
  int _reconnectAttempt = 0;

  String? _activeQueueId;
  String? _activeDisplayCredential;
  bool _subscriptionAuthorized = false;

  Stream<RealtimeStatus> get status => _statusController.stream;
  Stream<RealtimeEnvelope> get events => _eventController.stream;
  Stream<bool> get subscriptionAuthorized => _authorizedController.stream;
  RealtimeStatus get currentStatus => _status;
  int get reconnectAttempt => _reconnectAttempt;
  bool get isSubscriptionAuthorized => _subscriptionAuthorized;
  String? get activeQueueId => _activeQueueId;

  void _setStatus(RealtimeStatus status) {
    _status = status;
    _statusController.add(status);
  }

  void _setAuthorized(bool value) {
    _subscriptionAuthorized = value;
    if (!_authorizedController.isClosed) {
      _authorizedController.add(value);
    }
  }

  Future<void> connect() async {
    if (_socket?.connected == true) return;
    _setStatus(RealtimeStatus.connecting);

    _socket?.dispose();
    _socket = io.io(
      '$wsBaseUrl/realtime',
      io.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .enableAutoConnect()
          .enableReconnection()
          .setReconnectionAttempts(50)
          .setReconnectionDelay(1000)
          .setReconnectionDelayMax(30000)
          .build(),
    );

    _socket!
      ..onConnect((_) {
        _reconnectAttempt = 0;
        _setStatus(RealtimeStatus.connected);
        unawaited(_resubscribeIfNeeded());
      })
      ..onDisconnect((_) {
        _setAuthorized(false);
        _setStatus(RealtimeStatus.disconnected);
      })
      ..onReconnect((_) {
        _reconnectAttempt = 0;
        _setStatus(RealtimeStatus.connected);
        unawaited(_resubscribeIfNeeded());
      })
      ..onReconnectAttempt((attempt) {
        _reconnectAttempt = attempt as int? ?? _reconnectAttempt + 1;
        _setAuthorized(false);
        _setStatus(RealtimeStatus.reconnecting);
      })
      ..onConnectError((_) => _setStatus(RealtimeStatus.reconnecting));

    for (final event in TvRealtimeEvents.displayEvents) {
      _socket!.on(event, (data) {
        if (data is Map) {
          _eventController.add(
            RealtimeEnvelope.fromJson(Map<String, dynamic>.from(data)),
          );
        }
      });
    }
  }

  /// Subscribe to the queue display room using a backend-issued JWT.
  /// Returns false when the credential is missing/invalid or ack fails.
  /// Does not attempt an unauthorized subscribe when [displayCredential] is empty.
  Future<bool> subscribeQueueDisplay({
    required String queueId,
    required String displayCredential,
  }) async {
    final trimmed = displayCredential.trim();
    if (trimmed.isEmpty) {
      _activeQueueId = queueId;
      _activeDisplayCredential = null;
      _setAuthorized(false);
      return false;
    }

    _activeQueueId = queueId;
    _activeDisplayCredential = trimmed;

    if (_socket?.connected != true) {
      _setAuthorized(false);
      return false;
    }

    return _emitSubscribe();
  }

  Future<bool> _resubscribeIfNeeded() async {
    final queueId = _activeQueueId;
    final credential = _activeDisplayCredential;
    if (queueId == null || credential == null || credential.isEmpty) {
      _setAuthorized(false);
      return false;
    }
    return _emitSubscribe();
  }

  Future<bool> _emitSubscribe() async {
    final socket = _socket;
    final queueId = _activeQueueId;
    final credential = _activeDisplayCredential;
    if (socket == null ||
        !socket.connected ||
        queueId == null ||
        credential == null ||
        credential.isEmpty) {
      _setAuthorized(false);
      return false;
    }

    try {
      final payload = buildQueueDisplaySubscribePayload(
        queueId: queueId,
        displayToken: credential,
      );
      final ack = await socket.emitWithAckAsync(
        'subscribe:queue-display',
        payload,
      );
      final ok = isSubscribeAckOk(ack);
      _setAuthorized(ok);
      return ok;
    } catch (_) {
      _setAuthorized(false);
      return false;
    }
  }

  void clearSubscription() {
    final queueId = _activeQueueId;
    if (queueId != null) {
      unsubscribe('queue:$queueId:display');
    }
    _activeQueueId = null;
    _activeDisplayCredential = null;
    _setAuthorized(false);
  }

  void unsubscribe(String room) {
    _socket?.emit('unsubscribe', {'room': room});
  }

  void disconnect() {
    clearSubscription();
    _socket?.dispose();
    _socket = null;
    _setStatus(RealtimeStatus.disconnected);
  }
}

final tvRealtimeClientProvider = Provider<TvRealtimeClient>((ref) {
  final config = ref.watch(appConfigProvider);
  final client = TvRealtimeClient(wsBaseUrl: config.wsBaseUrl);
  ref.onDispose(client.disconnect);
  return client;
});

final tvRealtimeStatusProvider = StreamProvider<RealtimeStatus>((ref) {
  return ref.watch(tvRealtimeClientProvider).status;
});

final tvRealtimeEventsProvider = StreamProvider<RealtimeEnvelope>((ref) {
  return ref.watch(tvRealtimeClientProvider).events;
});
