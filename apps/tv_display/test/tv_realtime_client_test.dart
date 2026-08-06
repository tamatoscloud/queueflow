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
    client.disconnect();
  });
}
