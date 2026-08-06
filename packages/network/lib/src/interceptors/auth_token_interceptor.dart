import 'package:dio/dio.dart';

/// Attaches a bearer token to every outgoing request. Deliberately takes a
/// callback rather than depending on `queueflow_services`' secure storage
/// directly — that would create a cycle (network is a dependency of
/// services). The app composition root wires the callback to real storage.
final class AuthTokenInterceptor extends Interceptor {
  AuthTokenInterceptor({required this.tokenProvider});

  final Future<String?> Function() tokenProvider;

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await tokenProvider();
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }
}
