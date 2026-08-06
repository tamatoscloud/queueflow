import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tv_display/core/models/display_config.dart';
import 'package:tv_display/core/models/queue_models.dart';
import 'package:tv_display/features/display/presentation/display_screen.dart';
import 'package:tv_display/features/display/providers/display_board_provider.dart';

void main() {
  testWidgets('Mode3Layout shows current token', (tester) async {
    const config = DisplayConfig(
      displayToken: 'TEST1234',
      queueId: 'q1',
      queueName: 'Main',
      branchName: 'Branch',
      businessName: 'Business',
      layoutMode: DisplayLayoutMode.minimal,
    );

    final board = DisplayBoardState(
      snapshot: QueueSnapshotModel(
        queue: const QueueModel(id: 'q1', name: 'Main', status: 'ACTIVE'),
        entries: const [
          QueueEntryModel(
            id: 'e1',
            displayCode: 'A-042',
            status: 'CALLED',
            customerName: 'Sara',
          ),
        ],
        metrics: const QueueMetricsModel(),
        generatedAt: DateTime(2026, 7, 23),
      ),
      isLoading: false,
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Mode3Layout(config: config, board: board),
        ),
      ),
    );

    expect(find.text('A-042'), findsOneWidget);
  });

  testWidgets('QueueStatusChip renders status', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(body: QueueStatusChip(status: 'PAUSED')),
      ),
    );
    expect(find.text('PAUSED'), findsOneWidget);
  });
}
