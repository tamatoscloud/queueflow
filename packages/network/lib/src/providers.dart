import 'package:dio/dio.dart';
import 'package:riverpod/riverpod.dart';

import 'dio_client_factory.dart';

final Provider<DioClientFactory> dioClientFactoryProvider =
    Provider<DioClientFactory>(
      (ref) => const DioClientFactory(),
      name: 'dioClientFactoryProvider',
    );

/// The configured Dio instance for the current app. Overridden at the
/// composition root using `AppConfig.apiBaseUrl` — never given a default
/// here, so a missing override fails fast instead of hitting the wrong host.
final Provider<Dio> dioProvider = Provider<Dio>(
  (ref) => throw UnimplementedError(
    'dioProvider must be overridden in ProviderScope at app bootstrap.',
  ),
  name: 'dioProvider',
);
