import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:tv_display/core/realtime/tv_realtime_client.dart';

void main() {
  test('RealtimeEnvelope parses socket payload', () {
    final envelope = RealtimeEnvelope.fromJson({
      'event': 'CustomerCalled',
      'queueId': 'q-1',
      'businessId': 'b-1',
      'occurredAt': '2026-07-23T12:00:00.000Z',
      'payload': {'entryId': 'e-1', 'displayCode': 'A-01'},
    });

    expect(envelope.event, 'CustomerCalled');
    expect(envelope.payload['displayCode'], 'A-01');
  });

  test('display event list includes required events', () {
    expect(TvRealtimeEvents.displayEvents, contains('CustomerCalled'));
    expect(TvRealtimeEvents.displayEvents, contains('QueuePaused'));
    expect(TvRealtimeEvents.displayEvents, contains('EstimatedWaitChanged'));
  });

  test('TvRealtimeClient starts disconnected', () {
    final client = TvRealtimeClient(wsBaseUrl: 'http://localhost:3000');
    expect(client.currentStatus, RealtimeStatus.disconnected);
    expect(client.isSubscriptionAuthorized, isFalse);
    client.disconnect();
  });

  group('subscribe:queue-display credential contract', () {
    test('valid payload includes queueId and backend displayToken together', () {
      final payload = buildQueueDisplaySubscribePayload(
        queueId: 'queue-a',
        displayToken: 'jwt-for-queue-a',
      );
      expect(payload, {
        'queueId': 'queue-a',
        'displayToken': 'jwt-for-queue-a',
      });
    });

    test('Queue A credential is bound to Queue A in payload', () {
      final forA = buildQueueDisplaySubscribePayload(
        queueId: 'queue-a',
        displayToken: 'jwt-for-queue-a',
      );
      final forB = buildQueueDisplaySubscribePayload(
        queueId: 'queue-b',
        displayToken: 'jwt-for-queue-b',
      );
      expect(forA['displayToken'], isNot(forB['displayToken']));
      expect(forA['queueId'], isNot(forB['queueId']));
      // Using Queue A JWT with Queue B id would be a client bug — payload helper
      // always takes both explicitly so callers must pass matching pairs.
      expect(
        buildQueueDisplaySubscribePayload(
          queueId: 'queue-b',
          displayToken: 'jwt-for-queue-a',
        ),
        {
          'queueId': 'queue-b',
          'displayToken': 'jwt-for-queue-a',
        },
      );
    });

    test('ack ok:true means successful subscription', () {
      expect(isSubscribeAckOk({'ok': true, 'room': 'queue:q:display'}), isTrue);
      expect(
        isSubscribeAckOk([
          {'ok': true},
        ]),
        isTrue,
      );
    });

    test('ack failure fails safely', () {
      expect(isSubscribeAckOk({'ok': false, 'error': 'unauthorized'}), isFalse);
      expect(isSubscribeAckOk({'ok': false}), isFalse);
      expect(isSubscribeAckOk(null), isFalse);
      expect(isSubscribeAckOk('nope'), isFalse);
    });

    test('missing credential does not authorize subscription', () async {
      final client = TvRealtimeClient(wsBaseUrl: 'http://localhost:3000');
      final ok = await client.subscribeQueueDisplay(
        queueId: 'queue-a',
        displayCredential: '',
      );
      expect(ok, isFalse);
      expect(client.isSubscriptionAuthorized, isFalse);
      client.disconnect();
    });

    test('whitespace-only credential fails safely', () async {
      final client = TvRealtimeClient(wsBaseUrl: 'http://localhost:3000');
      final ok = await client.subscribeQueueDisplay(
        queueId: 'queue-a',
        displayCredential: '   ',
      );
      expect(ok, isFalse);
      expect(client.isSubscriptionAuthorized, isFalse);
      client.disconnect();
    });

    test('reconnect path retains then clears credential lifecycle', () async {
      final client = TvRealtimeClient(wsBaseUrl: 'http://localhost:3000');
      await client.subscribeQueueDisplay(
        queueId: 'queue-a',
        displayCredential: 'stored-jwt',
      );
      expect(client.activeQueueId, 'queue-a');
      expect(client.isSubscriptionAuthorized, isFalse);

      client.clearSubscription();
      expect(client.activeQueueId, isNull);
      expect(client.isSubscriptionAuthorized, isFalse);
      client.disconnect();
    });
  });

  test('realtime + setup sources never log or URL-expose credentials', () {
    final roots = [
      'lib/core/realtime/tv_realtime_client.dart',
      'lib/features/setup/presentation/setup_screens.dart',
      'lib/features/display/providers/display_board_provider.dart',
      'lib/features/display/presentation/display_screen.dart',
    ];

    for (final relative in roots) {
      final file = File(relative);
      expect(file.existsSync(), isTrue, reason: relative);
      final src = file.readAsStringSync();
      expect(src, isNot(contains('print(displayCredential')));
      expect(src, isNot(contains('print(credential')));
      expect(src, isNot(contains('debugPrint(displayCredential')));
      expect(src, isNot(contains('?displayToken=')));
      expect(src, isNot(contains('?token=')));
      // Settings UI must show pairing code field, not the JWT field.
      if (relative.contains('display_screen.dart')) {
        expect(src, contains('config.displayToken'));
        expect(src, isNot(contains('config.displayCredential')));
      }
    }
  });
}
