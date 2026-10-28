import 'package:flutter_test/flutter_test.dart';
import 'package:staff_app/core/models/models.dart';
import 'package:staff_app/features/customers/presentation/guests_view.dart';
import 'package:staff_app/features/notifications/presentation/guest_messages_view.dart';
import 'package:staff_app/features/reviews/presentation/reviews_view.dart';

void main() {
  group('splitReviewComment', () {
    test('pulls highlight chips out of the first line', () {
      final parts = splitReviewComment('Highlights: Service, Wait time\ngreat app');
      expect(parts.tags, ['Service', 'Wait time']);
      expect(parts.text, 'great app');
    });

    test('plain comments have no tags', () {
      final parts = splitReviewComment('Loved it');
      expect(parts.tags, isEmpty);
      expect(parts.text, 'Loved it');
    });

    test('null is empty', () {
      final parts = splitReviewComment(null);
      expect(parts.tags, isEmpty);
      expect(parts.text, isEmpty);
    });
  });

  test('applyGuestFilter keeps matching statuses', () {
    const guests = [
      CustomerModel(id: '1', fullName: 'A', phone: '1', activeStatus: 'CALLED'),
      CustomerModel(id: '2', fullName: 'B', phone: '2', activeStatus: 'WAITING'),
      CustomerModel(id: '3', fullName: 'C', phone: '3', activeStatus: 'waiting'),
    ];
    expect(applyGuestFilter(guests, GuestFilter.all), hasLength(3));
    expect(applyGuestFilter(guests, GuestFilter.waiting).map((g) => g.id), ['2', '3']);
    expect(applyGuestFilter(guests, GuestFilter.called).map((g) => g.id), ['1']);
  });

  test('guest message labels', () {
    expect(guestMessageEventLabel('YOUR_TURN'), 'Your turn');
    expect(guestMessageEventLabel('FEEDBACK_REQUEST'), 'Feedback request');
    expect(guestMessageEventLabel('SOMETHING_NEW'), 'Something new');
    expect(guestMessageChannelLabel('WHATSAPP'), 'WhatsApp');
    expect(guestMessageChannelLabel(null), '—');
  });

  test('guest message grouping', () {
    NotificationModel n(String status) =>
        NotificationModel(id: status, type: 'YOUR_TURN', status: status, createdAt: DateTime(2026));
    expect(guestMessageGroup(n('FAILED')), GuestMessageGroup.failed);
    expect(guestMessageGroup(n('DELIVERED')), GuestMessageGroup.delivered);
    expect(guestMessageGroup(n('QUEUED')), GuestMessageGroup.pending);
  });
}
