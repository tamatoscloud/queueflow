/// Route path segments shared by more than one app (e.g. `/splash` exists
/// in every app). Feature-specific routes are declared inside that
/// feature's own `routes/` module in the consuming app, not here.
abstract final class SharedRoutePaths {
  static const String splash = '/splash';
  static const String root = '/';
}
