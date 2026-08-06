import 'package:business_app/core/config/platform_url_resolver.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:queueflow_shared/queueflow_shared.dart';

void main() {
  test('PlatformUrlResolver leaves web URLs unchanged', () {
    const config = AppConfig(
      flavor: Flavor.dev,
      apiBaseUrl: 'http://localhost:3000/api/v1',
      wsBaseUrl: 'http://localhost:3000',
      appName: 'Test',
      enableLogging: true,
      apiTimeoutSeconds: 30,
    );
    // On VM test runner (non-Android), apply is a no-op.
    final resolved = PlatformUrlResolver.apply(config);
    expect(resolved.apiBaseUrl, config.apiBaseUrl);
    expect(resolved.wsBaseUrl, config.wsBaseUrl);
  });
}
