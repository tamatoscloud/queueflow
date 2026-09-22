import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:queueflow_theme/testing/font_test_setup.dart';

class _ThresholdComparator extends LocalFileComparator {
  _ThresholdComparator(super.testFile);

  static const maxDiffPercent = 0.15;

  @override
  Future<bool> compare(Uint8List imageBytes, Uri golden) async {
    final result = await GoldenFileComparator.compareLists(
      imageBytes,
      await getGoldenBytes(golden),
    );
    if (result.passed) return true;
    if (result.diffPercent <= maxDiffPercent) {
      // ignore: avoid_print
      print(
        'Golden within threshold: ${result.diffPercent.toStringAsFixed(3)}% '
        '<= $maxDiffPercent% ($golden)',
      );
      return true;
    }
    final error = await generateFailureOutput(result, golden, basedir);
    throw FlutterError(error);
  }
}

Future<void> testExecutable(FutureOr<void> Function() testMain) async {
  TestWidgetsFlutterBinding.ensureInitialized();
  await configureQueueflowFonts();

  final previous = goldenFileComparator;
  if (previous is LocalFileComparator) {
    goldenFileComparator = _ThresholdComparator(
      Uri.parse('${previous.basedir}/test.dart'),
    );
  }

  await testMain();
}
