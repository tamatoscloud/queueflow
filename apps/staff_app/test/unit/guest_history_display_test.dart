import 'package:flutter_test/flutter_test.dart';
import 'package:staff_app/features/customers/guest_history_display.dart';

void main() {
  test('strips leading hash from ticket search', () {
    expect(normalizeGuestSearch(' #74 '), '74');
  });

  test('history headline includes ticket number and queue', () {
    expect(guestHistoryHeadline('Dine-in', 'A-074'), '#A-074 · Dine-in');
  });

  test('visit timestamp includes calendar date', () {
    final text = formatGuestVisitWhen(DateTime.utc(2026, 10, 6, 12, 30));
    expect(text.contains('6 Oct 2026'), isTrue);
    expect(text.toLowerCase().contains('am') || text.toLowerCase().contains('pm'), isTrue);
  });
}
