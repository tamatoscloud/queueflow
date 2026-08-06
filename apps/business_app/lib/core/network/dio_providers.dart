import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_shared/queueflow_shared.dart';

import '../../features/auth/data/auth_token_holder.dart';
import '../../features/auth/data/auth_token_storage.dart';
import 'api_response_parser.dart';
import 'token_refresh_interceptor.dart';

final businessDioFactoryProvider = Provider<DioClientFactory>(
  (ref) => const DioClientFactory(),
);

/// Unauthenticated Dio for login/refresh (no bearer interceptor).
final publicDioProvider = Provider<Dio>((ref) {
  final config = ref.watch(appConfigProvider);
  final factory = ref.watch(businessDioFactoryProvider);
  return factory.create(
    baseUrl: config.apiBaseUrl,
    connectTimeout: Duration(seconds: config.apiTimeoutSeconds),
    receiveTimeout: Duration(seconds: config.apiTimeoutSeconds),
    enableLogging: config.enableLogging,
  );
});

/// Authenticated Dio with bearer token and automatic 401 refresh.
final authenticatedDioProvider = Provider<Dio>((ref) {
  final config = ref.watch(appConfigProvider);
  final factory = ref.watch(businessDioFactoryProvider);
  final tokenStorage = ref.watch(authTokenStorageProvider);
  final tokenHolder = ref.watch(authTokenHolderProvider);
  final publicDio = ref.watch(publicDioProvider);
  final parser = ApiResponseParser(factory);

  Future<String?> readToken() async =>
      tokenHolder.accessToken ?? await tokenStorage.getAccessToken();

  late final Dio dio;
  dio = factory.create(
    baseUrl: config.apiBaseUrl,
    connectTimeout: Duration(seconds: config.apiTimeoutSeconds),
    receiveTimeout: Duration(seconds: config.apiTimeoutSeconds),
    enableLogging: config.enableLogging,
    interceptors: [
      AuthTokenInterceptor(tokenProvider: readToken),
      TokenRefreshInterceptor(
        storage: tokenStorage,
        tokenHolder: tokenHolder,
        publicDio: publicDio,
        parser: parser,
        retryDio: () => dio,
      ),
    ],
  );
  return dio;
});
