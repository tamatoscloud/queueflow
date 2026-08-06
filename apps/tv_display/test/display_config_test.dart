import 'package:flutter_test/flutter_test.dart';
import 'package:tv_display/core/models/display_config.dart';

void main() {
  test('generateDisplayToken returns 8 characters', () {
    final a = generateDisplayToken();
    final b = generateDisplayToken();
    expect(a.length, 8);
    expect(b.length, 8);
  });

  test('DisplayConfig round-trips JSON', () {
    const config = DisplayConfig(
      displayToken: 'ABCD1234',
      queueId: '00000000-0000-4000-8000-000000000001',
      queueName: 'Main Queue',
      branchName: 'Downtown',
      businessName: 'Bright Smile Dental',
      layoutMode: DisplayLayoutMode.minimal,
      fontScale: 1.2,
    );

    final restored = DisplayConfig.fromJson(config.toJson());
    expect(restored.displayToken, 'ABCD1234');
    expect(restored.queueName, 'Main Queue');
    expect(restored.layoutMode, DisplayLayoutMode.minimal);
    expect(restored.fontScale, 1.2);
  });
}
