import 'package:business_app/features/branches/presentation/branches_screen.dart';
import 'package:business_app/features/shell/presentation/business_shell.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('branchCodeFromName', () {
    test('uses initials for multi-word names', () {
      expect(branchCodeFromName('Bella Vista Downtown'), 'BVD');
    });

    test('uses the word for single-word names', () {
      expect(branchCodeFromName('Gulberg'), 'GULBERG');
    });

    test('meets the backend pattern for short or odd names', () {
      final pattern = RegExp(r'^[A-Z0-9_-]{2,20}$');
      for (final name in ['A', '', 'Café #2', 'A very long restaurant location name here']) {
        expect(pattern.hasMatch(branchCodeFromName(name)), isTrue, reason: name);
      }
    });

    test('avoids codes already taken', () {
      expect(branchCodeFromName('Bella Vista Downtown', taken: ['BVD']), 'BVD-2');
      expect(branchCodeFromName('Bella Vista Downtown', taken: ['BVD', 'bvd-2']), 'BVD-3');
    });
  });

  group('businessDestinationIndex', () {
    test('matches the longest route prefix', () {
      expect(businessDestinationIndex(ownerDestinations, '/dashboard'), 0);
      expect(businessDestinationIndex(ownerDestinations, '/queues/abc/console'), 1);
      expect(businessDestinationIndex(ownerDestinations, '/restaurant/qr'), 5);
      expect(businessDestinationIndex(ownerDestinations, '/branches/add'), 8);
    });

    test('returns -1 for pages outside the menu', () {
      expect(businessDestinationIndex(frontDeskDestinations, '/dashboard'), -1);
      expect(businessDestinationIndex(ownerDestinations, '/unknown'), -1);
    });
  });
}
