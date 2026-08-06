/// The three build/runtime environments every QueueFlow Flutter app ships.
///
/// Mirrors the native Android product flavors / iOS schemes so that
/// `flutter run --flavor dev` and [Flavor.dev] always refer to the same
/// environment.
enum Flavor {
  dev,
  staging,
  production;

  /// The `.env.*` filename this flavor loads at bootstrap.
  String get envFileName => switch (this) {
    Flavor.dev => '.env.dev',
    Flavor.staging => '.env.staging',
    Flavor.production => '.env.production',
  };

  /// Human-readable label, e.g. for a debug banner.
  String get label => switch (this) {
    Flavor.dev => 'Development',
    Flavor.staging => 'Staging',
    Flavor.production => 'Production',
  };

  bool get isProduction => this == Flavor.production;
}
