/// The cross-app composition root.
///
/// `queueflow_shared` is the only package allowed to depend on every other
/// `packages/*` package. It re-exports them plus adds the glue each app
/// needs but shouldn't have to rewrite: shared route path constants and
/// shared provider composition helpers.
///
/// Apps depend on this package for wiring; they do NOT depend on
/// `queueflow_core`/`queueflow_network`/etc. directly for composition
/// concerns (they may still import them for types).
library;

export 'package:queueflow_core/queueflow_core.dart';
export 'package:queueflow_models/queueflow_models.dart';
export 'package:queueflow_network/queueflow_network.dart';
export 'package:queueflow_services/queueflow_services.dart';
export 'package:queueflow_theme/queueflow_theme.dart';
export 'package:queueflow_ui/queueflow_ui.dart';
export 'package:queueflow_utils/queueflow_utils.dart';
export 'package:queueflow_widgets/queueflow_widgets.dart';

export 'src/routing/route_paths.dart';
export 'src/observability/sentry_bootstrap.dart';
