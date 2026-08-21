import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:staff_app/core/connectivity/connectivity_provider.dart';

void main() {
  test('connectivityResultsOnline is false only when all results are none', () {
    expect(connectivityResultsOnline([ConnectivityResult.none]), isFalse);
    expect(
      connectivityResultsOnline([ConnectivityResult.none, ConnectivityResult.wifi]),
      isTrue,
    );
    expect(connectivityResultsOnline([ConnectivityResult.ethernet]), isTrue);
  });
}
