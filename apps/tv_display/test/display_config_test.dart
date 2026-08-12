import 'package:flutter_test/flutter_test.dart';
import 'package:tv_display/core/models/display_config.dart';
import 'package:tv_display/core/models/queue_models.dart';

void main() {
  test('generateDisplayToken returns 8 characters', () {
    final a = generateDisplayToken();
    final b = generateDisplayToken();
    expect(a.length, 8);
    expect(b.length, 8);
  });

  test('DisplayConfig round-trips JSON including displayCredential', () {
    const config = DisplayConfig(
      displayToken: 'ABCD1234',
      displayCredential: 'eyJhbGciOiJIUzI1NiJ9.payload.sig',
      queueId: '00000000-0000-4000-8000-000000000001',
      queueName: 'Main Queue',
      branchName: 'Downtown',
      businessName: 'Bright Smile Dental',
      layoutMode: DisplayLayoutMode.minimal,
      fontScale: 1.2,
    );

    final restored = DisplayConfig.fromJson(config.toJson());
    expect(restored.displayToken, 'ABCD1234');
    expect(restored.displayCredential, 'eyJhbGciOiJIUzI1NiJ9.payload.sig');
    expect(restored.hasRealtimeCredential, isTrue);
    expect(restored.queueName, 'Main Queue');
    expect(restored.layoutMode, DisplayLayoutMode.minimal);
    expect(restored.fontScale, 1.2);
  });

  test('legacy config without displayCredential remains valid', () {
    final restored = DisplayConfig.fromJson({
      'displayToken': 'PAIRCODE',
      'queueId': 'q-1',
      'queueName': 'Q',
      'branchName': 'B',
      'businessName': 'Biz',
    });
    expect(restored.displayToken, 'PAIRCODE');
    expect(restored.displayCredential, isNull);
    expect(restored.hasRealtimeCredential, isFalse);
  });

  test('clearDisplayCredential removes JWT while keeping pairing code', () {
    const config = DisplayConfig(
      displayToken: 'ABCD1234',
      displayCredential: 'jwt-secret',
      queueId: 'q-1',
      queueName: 'Q',
      branchName: 'B',
      businessName: 'Biz',
    );
    final cleared = config.copyWith(clearDisplayCredential: true);
    expect(cleared.displayToken, 'ABCD1234');
    expect(cleared.displayCredential, isNull);
  });

  test('DisplayCredentialModel parses backend response', () {
    final model = DisplayCredentialModel.fromJson({
      'queueId': 'queue-a',
      'displayToken': 'backend-jwt',
    });
    expect(model.queueId, 'queue-a');
    expect(model.displayToken, 'backend-jwt');
  });

  test('toJson does not put credential in accidental URL-like fields', () {
    const config = DisplayConfig(
      displayToken: 'ABCD1234',
      displayCredential: 'backend-jwt',
      queueId: 'q-1',
      queueName: 'Q',
      branchName: 'B',
      businessName: 'Biz',
    );
    final json = config.toJson();
    expect(json.containsKey('displayCredential'), isTrue);
    expect(json.keys, isNot(contains('token')));
    expect(json.keys, isNot(contains('query')));
  });
}
