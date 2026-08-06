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

class TvRealtimeClient {
  TvRealtimeClient({required this.wsBaseUrl});

  final String wsBaseUrl;

  io.Socket? _socket;
  final _statusController = StreamController<RealtimeStatus>.broadcast();
  final _eventController = StreamController<RealtimeEnvelope>.broadcast();
  RealtimeStatus _status = RealtimeStatus.disconnected;
  int _reconnectAttempt = 0;

  Stream<RealtimeStatus> get status => _statusController.stream;
  Stream<RealtimeEnvelope> get events => _eventController.stream;
  RealtimeStatus get currentStatus => _status;
  int get reconnectAttempt => _reconnectAttempt;

  void _setStatus(RealtimeStatus status) {
    _status = status;
    _statusController.add(status);
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
      })
      ..onDisconnect((_) => _setStatus(RealtimeStatus.disconnected))
      ..onReconnect((_) {
        _reconnectAttempt = 0;
        _setStatus(RealtimeStatus.connected);
      })
      ..onReconnectAttempt((attempt) {
        _reconnectAttempt = attempt as int? ?? _reconnectAttempt + 1;
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

  void subscribeQueueDisplay(String queueId) {
    _socket?.emit('subscribe:queue-display', {'queueId': queueId});
  }

  void unsubscribe(String room) {
    _socket?.emit('unsubscribe', {'room': room});
  }

  void disconnect() {
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
