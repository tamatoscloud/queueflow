import 'dart:io';

import 'package:business_app/core/realtime/realtime_client.dart';
import 'package:business_app/features/auth/data/auth_token_storage.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('staff subscribe payloads', () {
    test('business subscription sends businessId only', () {
      expect(
        buildBusinessSubscribePayload(businessId: 'biz-a'),
        {'businessId': 'biz-a'},
      );
    });

    test('queue-detail sends queueId only (not client businessId)', () {
      expect(
        buildQueueDetailSubscribePayload(queueId: 'queue-a'),
        {'queueId': 'queue-a'},
      );
      expect(
        buildQueueDetailSubscribePayload(queueId: 'queue-a').containsKey('businessId'),
        isFalse,
      );
    });
  });

  group('subscription ack handling', () {
    test('ok:true means authorized', () {
      expect(isStaffSubscribeAckOk({'ok': true, 'room': 'business:biz:queues'}), isTrue);
      expect(isStaffSubscribeAckOk([{'ok': true}]), isTrue);
    });

    test('ok:false / missing means rejected', () {
      expect(isStaffSubscribeAckOk({'ok': false, 'error': 'Unauthorized'}), isFalse);
      expect(isStaffSubscribeAckOk(null), isFalse);
    });
  });

  group('RealtimeClient without live socket', () {
    late AuthTokenStorage storage;

    setUp(() {
      storage = AuthTokenStorage();
    });

    test('starts disconnected and unauthorized', () {
      final client = RealtimeClient(
        wsBaseUrl: 'http://localhost:3000',
        tokenStorage: storage,
      );
      expect(client.currentStatus, RealtimeStatus.disconnected);
      expect(client.isSubscriptionAuthorized, isFalse);
      client.disconnect();
    });

    test('missing JWT subscribe fails safely', () async {
      final client = RealtimeClient(
        wsBaseUrl: 'http://localhost:3000',
        tokenStorage: storage,
      );
      expect(await client.subscribeBusinessDashboard('biz-a'), isFalse);
      expect(await client.subscribeBusinessQueues('biz-a'), isFalse);
      expect(await client.subscribeQueueDetail('queue-a'), isFalse);
      expect(client.isSubscriptionAuthorized, isFalse);
      client.disconnect();
    });

    test('disconnect clears authorization state', () {
      final client = RealtimeClient(
        wsBaseUrl: 'http://localhost:3000',
        tokenStorage: storage,
      );
      client.disconnect();
      expect(client.isSubscriptionAuthorized, isFalse);
    });
  });

  test('realtime sources use handshake auth not query token', () {
    final clientSrc = File('lib/core/realtime/realtime_client.dart').readAsStringSync();
    expect(clientSrc, contains("setAuth({'token'"));
    expect(clientSrc, isNot(contains('query.token')));
    expect(clientSrc, isNot(contains('?token=')));

    final syncSrc = File('lib/core/realtime/realtime_sync.dart').readAsStringSync();
    expect(syncSrc, contains('subscriptionAuthorized'));
  });
}
