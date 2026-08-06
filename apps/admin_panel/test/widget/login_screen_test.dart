import 'package:admin_panel/app.dart';
import 'package:admin_panel/features/auth/presentation/login_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:queueflow_shared/queueflow_shared.dart';

import '../helpers/test_app_config.dart';

void main() {
  testWidgets('LoginScreen renders platform admin sign-in', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: testAppOverrides(),
        child: const MaterialApp(home: LoginScreen()),
      ),
    );

    expect(find.text('QueueFlow'), findsOneWidget);
    expect(find.text('Platform Administration'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
  });

  testWidgets('AdminPanelApp boots with overridden AppConfig', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: testAppOverrides(),
        child: const AdminPanelApp(),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('QueueFlow'), findsOneWidget);
    expect(find.text('Platform Administration'), findsOneWidget);
  });
}
