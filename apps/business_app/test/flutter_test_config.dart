import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:queueflow_theme/testing/font_test_setup.dart';

Future<void> testExecutable(FutureOr<void> Function() testMain) async {
  TestWidgetsFlutterBinding.ensureInitialized();
  await configureQueueflowFonts();
  await testMain();
}
