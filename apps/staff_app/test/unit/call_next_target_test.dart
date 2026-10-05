import 'package:flutter_test/flutter_test.dart';
import 'package:staff_app/core/models/queue_entry_model.dart';
import 'package:staff_app/features/queue_console/call_next_target.dart';

QueueEntryModel entry({
  required String id,
  required String code,
  required int position,
  String status = 'WAITING',
}) {
  return QueueEntryModel(
    id: id,
    status: status,
    displayCode: code,
    partySize: 2,
    position: position,
  );
}

void main() {
  group('trueNextWaiting', () {
    test('picks lowest position waiting guest, ignoring called', () {
      final next = trueNextWaiting([
        entry(id: 'c', code: '66', position: 1, status: 'CALLED'),
        entry(id: 'a', code: '74', position: 3),
        entry(id: 'b', code: '70', position: 2),
      ]);
      expect(next?.id, 'b');
      expect(next?.displayCode, '70');
    });

    test('returns null when nobody is waiting', () {
      expect(
        trueNextWaiting([entry(id: 'c', code: '66', position: 1, status: 'CALLED')]),
        isNull,
      );
    });
  });

  group('canAutoCallFocus', () {
    test('allows only when focus is the true next guest', () {
      final seventy = entry(id: 'b', code: '70', position: 2);
      final seventyFour = entry(id: 'a', code: '74', position: 3);
      expect(canAutoCallFocus(focus: seventy, trueNext: seventy), isTrue);
      expect(canAutoCallFocus(focus: seventyFour, trueNext: seventy), isFalse);
    });

    test('blocks filtered-list false next (search shows 74, true next is 66)', () {
      final trueNext = entry(id: 'n66', code: '66', position: 1);
      final filteredOnly = entry(id: 'n74', code: '74', position: 5);
      expect(
        canAutoCallFocus(focus: filteredOnly, trueNext: trueNext),
        isFalse,
      );
    });
  });
}
