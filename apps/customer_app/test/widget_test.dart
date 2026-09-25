// Smoke test verifying the bootstrap â†’ DI â†’ router â†’ theme pipeline
// renders without a real .env file (Riverpod overrides stand in for it).
import 'package:customer_app/app.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:queueflow_shared/queueflow_shared.dart';

void main() {
  testWidgets('CustomerApp boots with an overridden AppConfig', (
    WidgetTester tester,
  ) async {
    const testConfig = AppConfig(
      flavor: Flavor.dev,
      apiBaseUrl: 'https://api.dev.Quyk.test',
      wsBaseUrl: 'wss://api.dev.Quyk.test',
      appName: 'Quyk Customer (Test)',
      enableLogging: true,
      apiTimeoutSeconds: 30,
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          flavorProvider.overrideWithValue(Flavor.dev),
          appConfigProvider.overrideWithValue(testConfig),
        ],
        child: const CustomerApp(),
      ),
    );

    expect(find.text('Quyk Customer (Test)'), findsOneWidget);
  });
}
