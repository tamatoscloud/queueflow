import 'package:business_app/shared/widgets/common_widgets.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

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
}
