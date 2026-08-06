import 'package:admin_panel/shared/widgets/admin_widgets.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('KpiCard displays label and value', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: KpiCard(label: 'Businesses', value: '12', icon: Icons.business),
        ),
      ),
    );

    expect(find.text('Businesses'), findsOneWidget);
    expect(find.text('12'), findsOneWidget);
  });

  testWidgets('StatusChip renders status text', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(home: Scaffold(body: StatusChip(status: 'ACTIVE'))),
    );
    expect(find.text('ACTIVE'), findsOneWidget);
  });
}
