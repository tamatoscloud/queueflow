# core/

App-specific cross-cutting wiring that isn't reusable enough to promote to `packages/core`. Most of the time this folder should stay nearly empty — if something here turns out to be useful for `business_app` too, move it into a `packages/*` package instead.

Examples of what belongs here (none implemented yet): app-specific error boundary/reporting wiring, app-specific analytics initialization, feature-flag bootstrapping specific to this app.
