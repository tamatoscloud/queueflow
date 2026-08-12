import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/models/queue_models.dart';
import '../../../core/network/tv_api_client.dart';
import '../../../core/realtime/tv_realtime_client.dart';
import '../../../core/storage/display_config_storage.dart';

class DisplayBoardState {
  const DisplayBoardState({
    this.snapshot,
    this.landing,
    this.isLoading = true,
    this.lastError,
    this.lastUpdatedAt,
    this.highlightToken,
  });

  final QueueSnapshotModel? snapshot;
  final QueueLandingModel? landing;
  final bool isLoading;
  final String? lastError;
  final DateTime? lastUpdatedAt;
  final String? highlightToken;

  DisplayBoardState copyWith({
    QueueSnapshotModel? snapshot,
    QueueLandingModel? landing,
    bool? isLoading,
    String? lastError,
    DateTime? lastUpdatedAt,
    String? highlightToken,
    bool clearHighlight = false,
  }) {
    return DisplayBoardState(
      snapshot: snapshot ?? this.snapshot,
      landing: landing ?? this.landing,
      isLoading: isLoading ?? this.isLoading,
      lastError: lastError,
      lastUpdatedAt: lastUpdatedAt ?? this.lastUpdatedAt,
      highlightToken: clearHighlight ? null : highlightToken ?? this.highlightToken,
    );
  }
}

class DisplayBoardNotifier extends Notifier<DisplayBoardState> {
  @override
  DisplayBoardState build() => const DisplayBoardState();

  Future<void> refresh({String? highlightToken}) async {
    final config = ref.read(displayConfigProvider).valueOrNull;
    if (config == null) return;

    try {
      final api = ref.read(tvApiClientProvider);
      final results = await Future.wait<dynamic>([
        api.getQueueSnapshot(config.queueId),
        api.getQueueLanding(config.queueId),
      ]);
      state = DisplayBoardState(
        snapshot: results[0] as QueueSnapshotModel,
        landing: results[1] as QueueLandingModel,
        isLoading: false,
        lastUpdatedAt: DateTime.now(),
        highlightToken: highlightToken,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        lastError: e.toString(),
        lastUpdatedAt: DateTime.now(),
      );
    }
  }

  void setHighlight(String? token) {
    state = state.copyWith(highlightToken: token);
  }
}

final displayBoardProvider =
    NotifierProvider<DisplayBoardNotifier, DisplayBoardState>(
  DisplayBoardNotifier.new,
);

final displayRealtimeBindingProvider = Provider.autoDispose<void>((ref) {
  final config = ref.watch(displayConfigProvider).valueOrNull;
  if (config == null) return;

  final client = ref.watch(tvRealtimeClientProvider);
  final pollInterval = Duration(seconds: config.refreshIntervalSeconds);
  Timer? pollTimer;

  void startPolling() {
    if (pollTimer != null) return;
    unawaited(ref.read(displayBoardProvider.notifier).refresh());
    pollTimer = Timer.periodic(pollInterval, (_) {
      unawaited(ref.read(displayBoardProvider.notifier).refresh());
    });
  }

  void stopPolling() {
    pollTimer?.cancel();
    pollTimer = null;
  }

  Future<bool> trySubscribe() async {
    final credential = config.displayCredential;
    if (credential == null || credential.isEmpty) {
      return false;
    }
    return client.subscribeQueueDisplay(
      queueId: config.queueId,
      displayCredential: credential,
    );
  }

  Future.microtask(() async {
    // Always keep HTTP polling until (and unless) subscription is authorized.
    startPolling();
    await client.connect();
    final ok = await trySubscribe();
    if (ok) {
      stopPolling();
    }
    await ref.read(displayBoardProvider.notifier).refresh();
  });

  final eventSub = client.events.listen((envelope) {
    final token = envelope.payload['displayCode'] as String?;
    final shouldHighlight = envelope.event == 'CustomerCalled';
    unawaited(
      ref.read(displayBoardProvider.notifier).refresh(
            highlightToken: shouldHighlight ? token : null,
          ),
    );
    if (shouldHighlight) {
      ref.read(callAlertProvider.notifier).trigger(
            token: token,
            voiceText: token != null ? 'Now serving $token' : null,
          );
    }
  });

  final statusSub = client.status.listen((status) {
    switch (status) {
      case RealtimeStatus.connected:
        unawaited(() async {
          final ok = await trySubscribe();
          if (ok) {
            stopPolling();
          } else {
            startPolling();
          }
        }());
      case RealtimeStatus.connecting:
      case RealtimeStatus.reconnecting:
      case RealtimeStatus.disconnected:
        startPolling();
    }
  });

  final authSub = client.subscriptionAuthorized.listen((authorized) {
    if (authorized) {
      stopPolling();
    } else {
      startPolling();
    }
  });

  ref.onDispose(() {
    eventSub.cancel();
    statusSub.cancel();
    authSub.cancel();
    stopPolling();
  });
});

class CallAlertState {
  const CallAlertState({this.lastToken, this.pulseCount = 0});

  final String? lastToken;
  final int pulseCount;
}

class CallAlertNotifier extends Notifier<CallAlertState> {
  @override
  CallAlertState build() => const CallAlertState();

  void trigger({String? token, String? voiceText}) {
    state = CallAlertState(
      lastToken: token,
      pulseCount: state.pulseCount + 1,
    );
    ref.read(voiceAnnouncerProvider).announce(voiceText);
    ref.read(soundPlayerProvider).playCallSound();
  }
}

final callAlertProvider =
    NotifierProvider<CallAlertNotifier, CallAlertState>(CallAlertNotifier.new);

abstract class SoundPlayer {
  void playCallSound();
}

class NoOpSoundPlayer implements SoundPlayer {
  @override
  void playCallSound() {}
}

final soundPlayerProvider = Provider<SoundPlayer>((ref) => NoOpSoundPlayer());

abstract class VoiceAnnouncer {
  void announce(String? text);
}

class NoOpVoiceAnnouncer implements VoiceAnnouncer {
  @override
  void announce(String? text) {}
}

final voiceAnnouncerProvider =
    Provider<VoiceAnnouncer>((ref) => NoOpVoiceAnnouncer());
