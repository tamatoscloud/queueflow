import 'package:dio/dio.dart';

import '../../features/auth/data/auth_token_holder.dart';
import '../../features/auth/data/auth_token_storage.dart';
import 'api_response_parser.dart';

/// Retries failed requests after refreshing the access token via the public
/// auth endpoint. Uses [AuthTokenStorage] + [publicDio] only — no dependency
/// on [AuthRepository], avoiding a circular provider graph.
final class TokenRefreshInterceptor extends Interceptor {
  TokenRefreshInterceptor({
    required this.storage,
    required this.tokenHolder,
    required this.publicDio,
    required this.parser,
    required this.retryDio,
  });

  final AuthTokenStorage storage;
  final AuthTokenHolder tokenHolder;
  final Dio publicDio;
  final ApiResponseParser parser;
  final Dio Function() retryDio;

  bool _refreshing = false;

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode != 401) {
      return handler.next(err);
    }

    final path = err.requestOptions.path;
    if (path.contains('/auth/login') ||
        path.contains('/auth/refresh') ||
        path.contains('/auth/logout')) {
      return handler.next(err);
    }

    if (_refreshing) {
      return handler.next(err);
    }

    _refreshing = true;
    try {
      final refreshToken = await storage.getRefreshToken();
      final userJson = await storage.getUserJson();
      if (refreshToken == null || userJson == null) {
        return handler.next(err);
      }

      final tokens = await parser.getData(
        () => publicDio.post('/auth/refresh', data: {'refreshToken': refreshToken}),
        (json) => (
          access: json['accessToken'] as String,
          refresh: json['refreshToken'] as String,
        ),
      );

      await storage.saveTokens(
        accessToken: tokens.access,
        refreshToken: tokens.refresh,
        userJson: userJson,
      );
      tokenHolder.setAccessToken(tokens.access);

      final opts = err.requestOptions;
      opts.headers['Authorization'] = 'Bearer ${tokens.access}';
      final response = await retryDio().fetch<dynamic>(opts);
      return handler.resolve(response);
    } catch (_) {
      return handler.next(err);
    } finally {
      _refreshing = false;
    }
  }
}
