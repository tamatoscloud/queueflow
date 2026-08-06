import 'package:flutter_test/flutter_test.dart';
import 'package:tv_display/core/models/queue_models.dart';

void main() {
  test('QueueSnapshotModel parses flat engine snapshot shape', () {
    final snapshot = QueueSnapshotModel.fromJson({
      'queueId': 'q1',
      'businessId': 'b1',
      'branchId': 'br1',
      'name': "Today's Waiting List",
      'status': 'ACTIVE',
      'entries': [
        {
          'id': 'e1',
          'displayCode': 'W-112',
          'status': 'CALLED',
          'customerName': 'Ali',
          'partySize': 2,
        },
      ],
      'metrics': {'waitingCount': 1, 'completedCount': 5},
      'generatedAt': '2026-07-23T12:00:00.000Z',
    });

    expect(snapshot.queue.id, 'q1');
    expect(snapshot.queue.name, "Today's Waiting List");
    expect(snapshot.currentCalled?.displayCode, 'W-112');
    expect(snapshot.metrics.waitingCount, 1);
  });

  test('QueueSnapshotModel parses nested queue snapshot', () {
    final snapshot = QueueSnapshotModel.fromJson({
      'queue': {'id': 'q1', 'name': 'Main', 'status': 'ACTIVE'},
      'entries': [
        {
          'id': 'e1',
          'displayCode': 'A-001',
          'status': 'CALLED',
          'customerName': 'Ali',
        },
        {
          'id': 'e2',
          'displayCode': 'A-002',
          'status': 'WAITING',
        },
      ],
      'metrics': {'waitingCount': 1, 'averageWaitMinutes': 10},
      'generatedAt': '2026-07-23T12:00:00.000Z',
    });

    expect(snapshot.currentCalled?.displayCode, 'A-001');
    expect(snapshot.waitingEntries.length, 1);
    expect(snapshot.metrics.waitingCount, 1);
  });
}
