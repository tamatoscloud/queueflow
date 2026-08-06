import 'package:dio/dio.dart';

import 'exceptions/api_exception.dart';

/// Builds a preconfigured [Dio] instance. Apps compose this with
/// [AuthTokenInterceptor] and any app-specific interceptors at the
/// composition root (`queueflow_shared` / app bootstrap) — this factory
/// only owns transport-level concerns (base URL, timeouts, headers).
final class DioClientFactory {
  const DioClientFactory();

  Dio create({
    required String baseUrl,
    required Duration connectTimeout,
    required Duration receiveTimeout,
    List<Interceptor> interceptors = const [],
    bool enableLogging = false,
  }) {
    final dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: connectTimeout,
        receiveTimeout: receiveTimeout,
        headers: const {'Content-Type': 'application/json'},
      ),
    );

    dio.interceptors.addAll(interceptors);

    if (enableLogging) {
      dio.interceptors.add(
        LogInterceptor(requestBody: true, responseBody: true),
      );
    }

    return dio;
  }

  /// Maps a [DioException] to a typed [ApiException]. Call this from a
  /// repository's `catch (e) when (e is DioException)` block.
  ApiException mapError(DioException error) {
    return switch (error.type) {
      DioExceptionType.connectionTimeout ||
      DioExceptionType.sendTimeout ||
      DioExceptionType.receiveTimeout => const ApiException.timeout(),
      DioExceptionType.connectionError => const ApiException.noConnection(),
      DioExceptionType.badResponse => _mapStatusCode(error),
      _ => ApiException.unknown(cause: error),
    };
  }

  ApiException _mapStatusCode(DioException error) {
    final statusCode = error.response?.statusCode;
    final envelopeMessage = _envelopeErrorMessage(error.response?.data);
    return switch (statusCode) {
      401 => const ApiException.unauthorized(),
      403 => const ApiException.forbidden(),
      404 => const ApiException.notFound(),
      _ => ApiException.server(
          statusCode: statusCode,
          message: envelopeMessage ?? error.message,
        ),
    };
  }

  /// Reads `{ success: false, error: { message } }` from API responses.
  String? _envelopeErrorMessage(dynamic data) {
    if (data is! Map<String, dynamic>) return null;
    final err = data['error'];
    if (err is Map<String, dynamic>) {
      final message = err['message'];
      if (message is String && message.isNotEmpty) return message;
    }
    return null;
  }
}
