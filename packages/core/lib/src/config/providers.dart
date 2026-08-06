import 'package:riverpod/riverpod.dart';

import 'app_config.dart';
import 'flavor.dart';

/// Which [Flavor] the running app was built with. Overridden once, at
/// bootstrap, in every app's `main_<flavor>.dart` entrypoint.
final Provider<Flavor> flavorProvider = Provider<Flavor>(
  (ref) => throw UnimplementedError(
    'flavorProvider must be overridden in ProviderScope at app bootstrap.',
  ),
  name: 'flavorProvider',
);

/// The strongly-typed environment configuration for the running app.
/// Overridden once, at bootstrap, alongside [flavorProvider]. Deliberately
/// has no default implementation — a missing override should fail loudly
/// and immediately, not silently fall back to development values.
final Provider<AppConfig> appConfigProvider = Provider<AppConfig>(
  (ref) => throw UnimplementedError(
    'appConfigProvider must be overridden in ProviderScope at app bootstrap.',
  ),
  name: 'appConfigProvider',
);
