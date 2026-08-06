# queueflow_theme

Design tokens (`AppColors`, `AppTypography`, `AppSpacing`, `AppRadius`) and `ThemeData` assembly (`AppTheme.light` / `AppTheme.dark`), plus `Breakpoints` for responsive/tablet layouts.

**Depends on:** `queueflow_utils`.

No third-party responsive-layout package is used deliberately — `Breakpoints` + `MediaQuery`/`LayoutBuilder` keeps the dependency surface limited to what was explicitly requested and gives full control over the tablet-optimized `business_app` layout.

**Do not add here:** widgets (that's `queueflow_ui`/`queueflow_widgets`) — only tokens and `ThemeData`.
