import 'package:flutter_test/flutter_test.dart';
import 'package:staff_app/shared/widgets/staff/staff_greeting.dart';
import 'package:staff_app/shared/widgets/staff/staff_queue_timeline.dart';

void main() {
  group('staffGreetingForTime', () {
    test('returns morning before noon', () {
      expect(staffGreetingForTime(DateTime(2026, 1, 1, 9)), 'Good morning');
    });

    test('returns afternoon before 5pm', () {
      expect(staffGreetingForTime(DateTime(2026, 1, 1, 14)), 'Good afternoon');
    });

    test('returns evening after 5pm', () {
      expect(staffGreetingForTime(DateTime(2026, 1, 1, 20)), 'Good evening');
    });
  });

  group('staffJourneyFromStatus', () {
    test('maps waiting with low position to almost ready', () {
      expect(staffJourneyFromStatus('WAITING', position: 2), StaffQueueJourneyStep.almostReady);
    });

    test('maps called to called step', () {
      expect(staffJourneyFromStatus('CALLED'), StaffQueueJourneyStep.called);
    });
  });
}
