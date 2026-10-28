import 'package:dio/dio.dart';
import 'package:queueflow_network/queueflow_network.dart';

import '../../features/auth/data/auth_token_holder.dart';
import '../../features/auth/data/auth_token_storage.dart';
import 'api_response_parser.dart';

/// Retries failed requests after refreshing the access token via the public
/// auth endpoint. Uses [AuthTokenStorage] + [publicDio] only — no dependency
/// on [AuthRepository], avoiding a circular provider graph.
final class TokenRefreshInterceptor extends QueuedInterceptor {
  TokenRefreshInterceptor({
    required this.storage,
    required this.tokenHolder,
    required this.publicDio,
    required this.parser,
    required this.retryDio,
    this.onSessionExpired,
  });

  final AuthTokenStorage storage;
  final AuthTokenHolder tokenHolder;
  final Dio publicDio;
  final ApiResponseParser parser;
  final Dio Function() retryDio;

  /// Called when the session can't be refreshed, so the app can sign out
  /// instead of leaving every screen in an error state.
  final Future<void> Function()? onSessionExpired;

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
        tokenHolder.setAccessToken(null);
        await onSessionExpired?.call();
        return handler.next(err);
      }

      final ({String access, String refresh}) tokens;
      try {
        tokens = await parser.getData(
          () => publicDio.post('/auth/refresh', data: {'refreshToken': refreshToken}),
          (json) => (
            access: json['accessToken'] as String,
            refresh: json['refreshToken'] as String,
          ),
        );
      } on ApiException catch (e) {
        // Offline / timeout: keep the session and let the caller retry later.
        if (e is NoConnectionException || e is TimeoutException) {
          return handler.next(err);
        }
        // Refresh token rejected or expired: sign the user out.
        tokenHolder.setAccessToken(null);
        await storage.clear();
        await onSessionExpired?.call();
        return handler.next(err);
      }

      await storage.saveTokens(
        accessToken: tokens.access,
        refreshToken: tokens.refresh,
        userJson: userJson,
      );
      tokenHolder.setAccessToken(tokens.access);

      final opts = err.requestOptions;
      opts.headers['Authorization'] = 'Bearer ${tokens.access}';
      try {
        final response = await retryDio().fetch<dynamic>(opts);
        return handler.resolve(response);
      } on DioException catch (retryError) {
        return handler.next(retryError);
      }
    } finally {
      _refreshing = false;
    }
  }
}
