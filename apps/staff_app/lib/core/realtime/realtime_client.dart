import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_shared/queueflow_shared.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../../../features/auth/data/auth_token_storage.dart';

enum RealtimeStatus { disconnected, connecting, connected, reconnecting }

class RealtimeClient {
  RealtimeClient({
    required this.wsBaseUrl,
    required this.tokenStorage,
  });

  final String wsBaseUrl;
  final AuthTokenStorage tokenStorage;

  io.Socket? _socket;
  final _statusController = StreamController<RealtimeStatus>.broadcast();
  final _eventController = StreamController<RealtimeEnvelope>.broadcast();
  final _onConnectedCallbacks = <void Function()>{};
  Completer<void>? _connectCompleter;

  Stream<RealtimeStatus> get status => _statusController.stream;
  Stream<RealtimeEnvelope> get events => _eventController.stream;
  RealtimeStatus _status = RealtimeStatus.disconnected;

  RealtimeStatus get currentStatus => _status;

  void _setStatus(RealtimeStatus s) {
    _status = s;
    _statusController.add(s);
  }

  void registerOnConnected(void Function() callback) {
    _onConnectedCallbacks.add(callback);
  }

  void unregisterOnConnected(void Function() callback) {
    _onConnectedCallbacks.remove(callback);
  }

  void _notifyConnected() {
    for (final callback in _onConnectedCallbacks) {
      callback();
    }
  }

  Future<void> connect() async {
    if (_socket?.connected == true) return;

    if (_socket != null && _connectCompleter != null) {
      return _connectCompleter!.future;
    }

    _setStatus(RealtimeStatus.connecting);
    final token = await tokenStorage.getAccessToken();

    if (_socket != null) {
      _socket!.dispose();
      _socket = null;
    }

    _connectCompleter = Completer<void>();
    final connectCompleter = _connectCompleter!;

    _socket = io.io(
      '$wsBaseUrl/realtime',
      io.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .enableAutoConnect()
          .enableReconnection()
          .setAuth({'token': token})
          .build(),
    );

    void handleConnected() {
      _setStatus(RealtimeStatus.connected);
      _notifyConnected();
      if (!connectCompleter.isCompleted) {
        connectCompleter.complete();
      }
    }

    _socket!
      ..onConnect((_) => handleConnected())
      ..onDisconnect((_) => _setStatus(RealtimeStatus.disconnected))
      ..onReconnect((_) => handleConnected())
      ..onReconnectAttempt((_) => _setStatus(RealtimeStatus.reconnecting))
      ..onConnectError((_) => _setStatus(RealtimeStatus.reconnecting));

    for (final event in RealtimeEventNames.all) {
      _socket!.on(event, (data) {
        if (data is Map) {
          _eventController.add(RealtimeEnvelope.fromJson(Map<String, dynamic>.from(data)));
        }
      });
    }

    return connectCompleter.future.timeout(
      const Duration(seconds: 15),
      onTimeout: () {
        if (!connectCompleter.isCompleted) {
          connectCompleter.complete();
        }
      },
    );
  }

  void subscribeBusinessDashboard(String businessId) {
    _socket?.emit('subscribe:business-dashboard', {'businessId': businessId});
  }

  void subscribeBusinessQueues(String businessId) {
    _socket?.emit('subscribe:business-queues', {'businessId': businessId});
  }

  void subscribeQueueDetail(String queueId, String businessId) {
    _socket?.emit('subscribe:queue-detail', {
      'queueId': queueId,
      'businessId': businessId,
    });
  }

  void disconnect() {
    _socket?.dispose();
    _socket = null;
    _connectCompleter = null;
    _setStatus(RealtimeStatus.disconnected);
  }
}

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

  factory RealtimeEnvelope.fromJson(Map<String, dynamic> json) => RealtimeEnvelope(
        event: json['event'] as String? ?? '',
        queueId: json['queueId'] as String? ?? '',
        businessId: json['businessId'] as String? ?? '',
        occurredAt: json['occurredAt'] as String? ?? '',
        payload: (json['payload'] as Map<String, dynamic>?) ?? {},
      );
}

abstract final class RealtimeEventNames {
  static const all = [
    'QueueUpdated',
    'CustomerJoined',
    'CustomerCalled',
    'CustomerHeld',
    'CustomerSkipped',
    'CustomerCompleted',
    'QueuePaused',
    'QueueResumed',
    'QueueClosed',
    'EstimatedWaitChanged',
  ];
}

final realtimeClientProvider = Provider<RealtimeClient>((ref) {
  final config = ref.watch(appConfigProvider);
  final client = RealtimeClient(
    wsBaseUrl: config.wsBaseUrl,
    tokenStorage: ref.watch(authTokenStorageProvider),
  );
  ref.onDispose(client.disconnect);
  return client;
});

final realtimeStatusProvider = StreamProvider<RealtimeStatus>((ref) {
  final client = ref.watch(realtimeClientProvider);
  return client.status;
});

final realtimeEventsProvider = StreamProvider<RealtimeEnvelope>((ref) {
  final client = ref.watch(realtimeClientProvider);
  return client.events;
});
