// Smoke test verifying the bootstrap → DI → router → theme pipeline
// renders without a real .env file (Riverpod overrides stand in for it).
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:marketing_website/app.dart';
import 'package:queueflow_core/queueflow_core.dart';

void main() {
  testWidgets('MarketingWebsiteApp boots with an overridden AppConfig', (
    WidgetTester tester,
  ) async {
    const testConfig = AppConfig(
      flavor: Flavor.dev,
      apiBaseUrl: 'https://api.dev.queueflow.test',
      wsBaseUrl: 'wss://api.dev.queueflow.test',
      appName: 'QueueFlow (Test)',
      enableLogging: true,
      apiTimeoutSeconds: 30,
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          flavorProvider.overrideWithValue(Flavor.dev),
          appConfigProvider.overrideWithValue(testConfig),
        ],
        child: const MarketingWebsiteApp(),
      ),
    );

    expect(find.textContaining('Turn waiting into'), findsOneWidget);
  });
}
