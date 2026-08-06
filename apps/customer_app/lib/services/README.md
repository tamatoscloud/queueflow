# services/

Reserved for app-specific service *configuration/overrides* (e.g. a Hive box name unique to this app, a notification channel id). The service implementations themselves live in `packages/services`; this folder only holds this app's wiring choices, if any are needed beyond what `bootstrap.dart` already provides.
