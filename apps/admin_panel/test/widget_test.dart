// Smoke test verifying the bootstrap â†’ DI â†’ router â†’ theme pipeline
// renders without a real .env file (Riverpod overrides stand in for it).
import 'package:admin_panel/app.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers/test_app_config.dart';

void main() {
  testWidgets('AdminPanelApp boots with an overridden AppConfig', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: testAppOverrides(),
        child: const AdminPanelApp(),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('Platform admin'), findsOneWidget);
    expect(find.text('Sign in to manage Quyk.'), findsOneWidget);
  });
}
