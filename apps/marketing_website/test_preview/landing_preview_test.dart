// Renders the Quyk landing page (outside test/):
//   flutter test test_preview --update-goldens
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:marketing_website/features/landing/presentation/landing_page.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

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

/// Renders the whole page as one tall image by giving it a tall viewport.
Future<void> _render(WidgetTester tester, String name, Size size) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: buildQuykTheme(identity: ProductIdentity.marketing),
      home: const LandingPage(),
    ),
  );
  await tester.runAsync(() async {
    for (final element in find.byType(Image).evaluate()) {
      await precacheImage((element.widget as Image).image, element);
    }
  });
  await tester.pumpAndSettle();
  await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/$name.png'));
}

void main() {
  setUpAll(_loadFonts);

  testWidgets('landing_desktop', (t) => _render(t, 'landing_desktop', const Size(1440, 5200)));
  testWidgets('landing_phone', (t) => _render(t, 'landing_phone', const Size(390, 7600)));
}
