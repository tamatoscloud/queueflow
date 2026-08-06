import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tv_display/core/models/display_config.dart';
import 'package:tv_display/core/models/queue_models.dart';
import 'package:tv_display/features/display/presentation/display_screen.dart';

void main() {
  testWidgets('NowServingToken golden', (tester) async {
    const config = DisplayConfig(
      displayToken: 'TEST1234',
      queueId: 'q1',
      queueName: 'Main',
      branchName: 'Branch',
      businessName: 'Business',
      blinkCurrentCustomer: false,
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Center(
            child: NowServingToken(
              config: config,
              entry: const QueueEntryModel(
                id: 'e1',
                displayCode: 'A-007',
                status: 'CALLED',
              ),
            ),
          ),
        ),
      ),
    );

    await expectLater(
      find.byType(NowServingToken),
      matchesGoldenFile('goldens/now_serving_token.png'),
    );
  });
}
