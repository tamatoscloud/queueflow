import 'package:flutter_test/flutter_test.dart';
import 'package:staff_app/core/realtime/realtime_client.dart';
import 'package:staff_app/core/realtime/refresh_gate.dart';

RealtimeEnvelope _event(String name) => RealtimeEnvelope(
      event: name,
      queueId: 'q',
      businessId: 'b',
      occurredAt: '2026-10-19T00:00:00Z',
      payload: const {},
    );

void main() {
  test('queues one refresh while a load is in flight', () {
    final gate = RefreshFollowUp();
    expect(gate.begin(busy: true), isFalse);
    expect(gate.begin(busy: true), isFalse);
    expect(gate.take(), isTrue);
    expect(gate.take(), isFalse);
    expect(gate.begin(busy: false), isTrue);
  });

  test('Call is not replaced by a later wait-estimate event', () {
    final kept = preferPendingEvent(
      _event('CustomerCalled'),
      _event('EstimatedWaitChanged'),
    );
    expect(kept?.event, 'CustomerCalled');
  });

  test('Call replaces an earlier wait-estimate event', () {
    final kept = preferPendingEvent(
      _event('EstimatedWaitChanged'),
      _event('CustomerCalled'),
    );
    expect(kept?.event, 'CustomerCalled');
  });
}
