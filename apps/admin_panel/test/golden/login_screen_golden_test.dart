// Golden test baseline for login screen layout.
import 'package:admin_panel/features/auth/presentation/login_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../helpers/test_app_config.dart';

void main() {
  testWidgets('LoginScreen golden', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: testAppOverrides(),
        child: MaterialApp(
          theme: AppTheme.light,
          home: const LoginScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await expectLater(
      find.byType(LoginScreen),
      matchesGoldenFile('goldens/login_screen.png'),
    );
  });
}
