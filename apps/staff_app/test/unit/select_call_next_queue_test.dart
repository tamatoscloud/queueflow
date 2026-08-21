import 'package:flutter_test/flutter_test.dart';
import 'package:staff_app/core/models/queue_model.dart';
import 'package:staff_app/shared/widgets/staff/service_mode_helpers.dart';

QueueModel q({
  required String id,
  required String mode,
  required int waiting,
  String status = 'ACTIVE',
}) {
  return QueueModel(
    id: id,
    businessId: 'b',
    branchId: 'br',
    name: id,
    status: status,
    prefix: 'A',
    waitingCount: waiting,
    serviceMode: mode,
  );
}

void main() {
  test('selectCallNextQueue prefers queues that actually have waiters', () {
    final queues = [
      q(id: 'reservation', mode: 'DINE_IN', waiting: 0),
      q(id: 'dine-in', mode: 'DINE_IN', waiting: 2),
      q(id: 'takeaway', mode: 'TAKEAWAY', waiting: 1),
    ];
    expect(selectCallNextQueue(queues)?.id, 'dine-in');
  });

  test('selectCallNextQueue honors preferred service mode with waiters', () {
    final queues = [
      q(id: 'dine-in', mode: 'DINE_IN', waiting: 2),
      q(id: 'takeaway', mode: 'TAKEAWAY', waiting: 3),
    ];
    expect(
      selectCallNextQueue(queues, preferredServiceMode: 'TAKEAWAY')?.id,
      'takeaway',
    );
  });
}
