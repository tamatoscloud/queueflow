import 'package:business_app/shared/widgets/common_widgets.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

void main() {
  testWidgets('StatCard renders label and value', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: StatCard(label: 'Waiting', value: '12', icon: Icons.people),
        ),
      ),
    );
    expect(find.text('Waiting'), findsOneWidget);
    expect(find.text('12'), findsOneWidget);
  });

  testWidgets('StatCard golden', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const Scaffold(
          body: Padding(
            padding: EdgeInsets.all(16),
            child: StatCard(label: 'Avg wait', value: '8 min', icon: Icons.timer_outlined),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await expectLater(
      find.byType(StatCard),
      matchesGoldenFile('goldens/stat_card.png'),
    );
  });
}
