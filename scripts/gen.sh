#!/usr/bin/env bash
# Run code generation (Freezed / json_serializable / Riverpod) across every
# package/app that has build_runner as a dev dependency.
set -euo pipefail
melos run gen
