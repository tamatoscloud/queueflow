// Renders the Quyk TV board with fixture data (outside test/, not in CI's
// regular suite):  flutter test test_preview --update-goldens
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:tv_display/app.dart';
import 'package:tv_display/core/models/display_config.dart';
import 'package:tv_display/core/models/queue_models.dart';
import 'package:tv_display/features/display/presentation/display_screen.dart';
import 'package:tv_display/features/display/providers/display_board_provider.dart';

Future<void> _loadFonts() async {
  TestWidgetsFlutterBinding.ensureInitialized();
  final hanken = FontLoader('HankenGrotesk');
  for (final w in ['Regular', 'Medium', 'SemiBold', 'Bold']) {
    hanken.addFont(rootBundle.load('assets/fonts/HankenGrotesk-$w.ttf'));
  }
  await hanken.load();
  final root = Platform.environment['FLUTTER_ROOT'];
  if (root != null) {
    final icons = File('$root/bin/cache/artifacts/material_fonts/MaterialIcons-Regular.otf');
    if (icons.existsSync()) {
      final bytes = icons.readAsBytesSync();
      await (FontLoader('MaterialIcons')..addFont(Future.value(ByteData.view(bytes.buffer)))).load();
    }
  }
}

DisplayBoardState _board() => DisplayBoardState(
      snapshot: QueueSnapshotModel(
        queue: const QueueModel(id: 'q1', name: 'Dine-In Waiting List', status: 'ACTIVE'),
        entries: const [
          QueueEntryModel(id: 'e1', displayCode: 'A-108', status: 'CALLED', customerName: 'Sara'),
          QueueEntryModel(id: 'e2', displayCode: 'A-109', status: 'WAITING', customerName: 'Asad', position: 1),
          QueueEntryModel(id: 'e3', displayCode: 'A-110', status: 'WAITING', customerName: 'Hammad', position: 2),
          QueueEntryModel(id: 'e4', displayCode: 'A-111', status: 'WAITING', customerName: 'Maria', position: 3),
        ],
        metrics: const QueueMetricsModel(),
        generatedAt: DateTime(2026, 10, 28, 19, 30),
      ),
      isLoading: false,
    );

Future<void> _render(WidgetTester tester, String name, DisplayLayoutMode mode) async {
  tester.view.physicalSize = const Size(1920, 1080);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  final config = DisplayConfig(
    displayToken: 'TEST1234',
    queueId: 'q1',
    queueName: 'Dine-In Waiting List',
    branchName: 'Bella Vista Downtown',
    businessName: 'Bella Vista',
    layoutMode: mode,
    blinkCurrentCustomer: false,
    announcementMessage: 'Please have your ticket ready when called.',
  );
  await tester.pumpWidget(
    MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: buildTvDarkTheme(QuykColors.lime),
      home: Scaffold(
        backgroundColor: QuykColors.green,
        body: TickerMode(
          enabled: false,
          child: switch (mode) {
            DisplayLayoutMode.nowServingLarge => Mode1Layout(config: config, board: _board()),
            DisplayLayoutMode.splitAnnouncements => Mode2Layout(config: config, board: _board()),
            DisplayLayoutMode.minimal => Mode3Layout(config: config, board: _board()),
            DisplayLayoutMode.brand => Mode4Layout(config: config, board: _board()),
          },
        ),
      ),
    ),
  );
  await tester.pump(const Duration(milliseconds: 600));
  await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/$name.png'));
}

void main() {
  setUpAll(_loadFonts);

  testWidgets('board_now_serving', (t) => _render(t, 'board_now_serving', DisplayLayoutMode.nowServingLarge));
  testWidgets('board_split', (t) => _render(t, 'board_split', DisplayLayoutMode.splitAnnouncements));
  testWidgets('board_minimal', (t) => _render(t, 'board_minimal', DisplayLayoutMode.minimal));
}
