import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_shared/queueflow_shared.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../../../features/auth/data/auth_token_storage.dart';
import '../../../features/auth/presentation/auth_controller.dart';

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

/// Builds staff subscription payloads (testable, no secrets).
Map<String, String> buildBusinessSubscribePayload({required String businessId}) {
  return {'businessId': businessId};
}

Map<String, String> buildQueueDetailSubscribePayload({required String queueId}) {
  // Backend authorizes by queueId; businessId is not an authorization authority.
  return {'queueId': queueId};
}

bool isStaffSubscribeAckOk(dynamic ack) {
  if (ack is Map) return ack['ok'] == true;
  if (ack is List && ack.isNotEmpty) {
    final first = ack.first;
    if (first is Map) return first['ok'] == true;
  }
  return false;
}

class RealtimeClient {
  RealtimeClient({
    required this.wsBaseUrl,
    required this.tokenStorage,
    this.refreshAccessToken,
  });

  final String wsBaseUrl;
  final AuthTokenStorage tokenStorage;
  final Future<bool> Function()? refreshAccessToken;

  io.Socket? _socket;
  final _statusController = StreamController<RealtimeStatus>.broadcast();
  final _eventController = StreamController<RealtimeEnvelope>.broadcast();
  final _authorizedController = StreamController<bool>.broadcast();
  final _onConnectedCallbacks = <Future<bool> Function()>{};
  Completer<void>? _connectCompleter;

  Stream<RealtimeStatus> get status => _statusController.stream;
  Stream<RealtimeEnvelope> get events => _eventController.stream;
  Stream<bool> get subscriptionAuthorized => _authorizedController.stream;
  RealtimeStatus _status = RealtimeStatus.disconnected;
  bool _subscriptionAuthorized = false;

  RealtimeStatus get currentStatus => _status;
  bool get isSubscriptionAuthorized => _subscriptionAuthorized;

  void _setStatus(RealtimeStatus s) {
    _status = s;
    _statusController.add(s);
  }

  void _setAuthorized(bool value) {
    _subscriptionAuthorized = value;
    if (!_authorizedController.isClosed) {
      _authorizedController.add(value);
    }
  }

  void registerOnConnected(Future<bool> Function() callback) {
    _onConnectedCallbacks.add(callback);
  }

  void unregisterOnConnected(Future<bool> Function() callback) {
    _onConnectedCallbacks.remove(callback);
  }

  Future<void> _notifyConnected() async {
    var anyAuthorized = false;
    for (final callback in _onConnectedCallbacks) {
      final ok = await callback();
      if (ok) anyAuthorized = true;
    }
    _setAuthorized(anyAuthorized);
  }

  Future<void> connect() async {
    if (_socket?.connected == true) return;

    if (_socket != null && _connectCompleter != null) {
      return _connectCompleter!.future;
    }

    _setStatus(RealtimeStatus.connecting);
    _setAuthorized(false);
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
      unawaited(_notifyConnected());
      if (!connectCompleter.isCompleted) {
        connectCompleter.complete();
      }
    }

    _socket!
      ..onConnect((_) => handleConnected())
      ..onDisconnect((_) {
        _setAuthorized(false);
        _setStatus(RealtimeStatus.disconnected);
      })
      ..onReconnect((_) => handleConnected())
      ..onReconnectAttempt((_) {
        _setAuthorized(false);
        _setStatus(RealtimeStatus.reconnecting);
      })
      ..onConnectError((_) {
        _setAuthorized(false);
        _setStatus(RealtimeStatus.reconnecting);
      });

    for (final event in RealtimeEventNames.all) {
      _socket!.on(event, (data) {
        if (data is Map) {
          _eventController.add(
            RealtimeEnvelope.fromJson(Map<String, dynamic>.from(data)),
          );
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

  Future<bool> _emitSubscribe(String event, Map<String, String> payload) async {
    final socket = _socket;
    if (socket == null || !socket.connected) {
      _setAuthorized(false);
      return false;
    }
    try {
      final ack = await socket.emitWithAckAsync(event, payload);
      final ok = isStaffSubscribeAckOk(ack);
      return ok;
    } catch (_) {
      return false;
    }
  }

  /// Staff JWT must be in handshake.auth.token (set via [connect]).
  Future<bool> subscribeBusinessDashboard(String businessId) {
    return _emitSubscribe(
      'subscribe:business-dashboard',
      buildBusinessSubscribePayload(businessId: businessId),
    );
  }

  Future<bool> subscribeBusinessQueues(String businessId) {
    return _emitSubscribe(
      'subscribe:business-queues',
      buildBusinessSubscribePayload(businessId: businessId),
    );
  }

  /// Backend authorizes by [queueId] only — not client-supplied businessId.
  Future<bool> subscribeQueueDetail(String queueId) {
    return _emitSubscribe(
      'subscribe:queue-detail',
      buildQueueDetailSubscribePayload(queueId: queueId),
    );
  }

  Future<bool> reconnectWithFreshToken() async {
    if (refreshAccessToken != null) {
      await refreshAccessToken!();
    }
    disconnect();
    await connect();
    return _subscriptionAuthorized;
  }

  void disconnect() {
    _socket?.dispose();
    _socket = null;
    _connectCompleter = null;
    _setAuthorized(false);
    _setStatus(RealtimeStatus.disconnected);
  }
}

final realtimeClientProvider = Provider<RealtimeClient>((ref) {
  final config = ref.watch(appConfigProvider);
  final client = RealtimeClient(
    wsBaseUrl: config.wsBaseUrl,
    tokenStorage: ref.watch(authTokenStorageProvider),
    refreshAccessToken: () =>
        ref.read(authControllerProvider.notifier).tryRefreshToken(),
  );
  ref.listen(authControllerProvider, (prev, next) {
    if (prev?.isAuthenticated == true && !next.isAuthenticated) {
      client.disconnect();
    }
  });
  ref.onDispose(client.disconnect);
  return client;
});

final realtimeStatusProvider = StreamProvider<RealtimeStatus>((ref) {
  final client = ref.watch(realtimeClientProvider);
  return client.status;
});

/// True only when the socket is connected AND a subscribe ack succeeded.
final realtimeLiveProvider = Provider<bool>((ref) {
  final client = ref.watch(realtimeClientProvider);
  final status = ref.watch(realtimeStatusProvider).valueOrNull;
  final authorized = ref.watch(realtimeAuthorizedProvider).valueOrNull ??
      client.isSubscriptionAuthorized;
  return status == RealtimeStatus.connected && authorized;
});

final realtimeAuthorizedProvider = StreamProvider<bool>((ref) {
  final client = ref.watch(realtimeClientProvider);
  // Seed with current value so first frame is not stuck on loading.
  return Stream<bool>.multi((controller) {
    controller.add(client.isSubscriptionAuthorized);
    final sub = client.subscriptionAuthorized.listen(
      controller.add,
      onError: controller.addError,
      onDone: controller.close,
    );
    controller.onCancel = sub.cancel;
  });
});

final realtimeEventsProvider = StreamProvider<RealtimeEnvelope>((ref) {
  final client = ref.watch(realtimeClientProvider);
  return client.events;
});
