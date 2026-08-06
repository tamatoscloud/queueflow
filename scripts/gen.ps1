# Run code generation (Freezed / json_serializable / Riverpod) across every
# package/app that has build_runner as a dev dependency.
$ErrorActionPreference = "Stop"
melos run gen
