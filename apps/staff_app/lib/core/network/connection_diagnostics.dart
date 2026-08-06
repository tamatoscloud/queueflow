import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_network/queueflow_network.dart';
import 'package:queueflow_shared/queueflow_shared.dart';

/// Result of a backend connectivity probe (`GET /health/live`).
sealed class ConnectionDiagnostics {
  const ConnectionDiagnostics();
}

final class ConnectionOk extends ConnectionDiagnostics {
  const ConnectionOk({required this.apiBaseUrl, required this.latencyMs});

  final String apiBaseUrl;
  final int latencyMs;
}

final class ConnectionFailed extends ConnectionDiagnostics {
  const ConnectionFailed({
    required this.apiBaseUrl,
    required this.message,
    this.hint,
  });

  final String apiBaseUrl;
  final String message;
  final String? hint;
}

String apiExceptionMessage(Object error) {
  if (error is ApiException) {
    return error.when(
      noConnection: () =>
          'Cannot reach the server. Check that the backend is running and the API URL is correct.',
      timeout: () => 'Request timed out. The server may be slow or unreachable.',
      unauthorized: () => 'Invalid email or password.',
      forbidden: () => 'You do not have permission to perform this action.',
      notFound: () => 'The requested resource was not found.',
      server: (statusCode, message) => _sanitizeServerMessage(statusCode, message),
      unknown: (_) => 'An unexpected error occurred. Please try again.',
    );
  }
  return error.toString();
}

String _sanitizeServerMessage(int? statusCode, String? message) {
  if (message != null && message.isNotEmpty && !_isDioInternalMessage(message)) {
    return message;
  }
  return switch (statusCode) {
    500 => 'Server error. Please try again or contact support.',
    502 || 503 => 'Service temporarily unavailable. Please try again shortly.',
    _ => 'Server error (${statusCode ?? 'unknown'}). Please try again.',
  };
}

bool _isDioInternalMessage(String message) {
  return message.contains('RequestOptions.validateStatus') ||
      message.startsWith('This exception was thrown');
}

Future<ConnectionDiagnostics> probeBackend(Dio dio, String apiBaseUrl) async {
  final stopwatch = Stopwatch()..start();
  try {
    // Liveness is versioned: /api/v1/health/live — strip /api/v1 suffix from base URL.
    final root = apiBaseUrl.replaceAll(RegExp(r'/api/v\d+$'), '');
    final response = await dio.get<Map<String, dynamic>>(
      '$root/api/v1/health/live',
      options: Options(
        receiveTimeout: const Duration(seconds: 5),
        sendTimeout: const Duration(seconds: 5),
      ),
    );
    stopwatch.stop();
    if (response.statusCode == 200) {
      return ConnectionOk(apiBaseUrl: apiBaseUrl, latencyMs: stopwatch.elapsedMilliseconds);
    }
    return ConnectionFailed(
      apiBaseUrl: apiBaseUrl,
      message: 'Server returned HTTP ${response.statusCode}',
      hint: 'Verify the backend is running on the expected port.',
    );
  } on DioException catch (e) {
    stopwatch.stop();
    final factory = const DioClientFactory();
    final mapped = factory.mapError(e);
    return ConnectionFailed(
      apiBaseUrl: apiBaseUrl,
      message: apiExceptionMessage(mapped),
      hint: _hintForPlatform(apiBaseUrl),
    );
  } catch (e) {
    return ConnectionFailed(
      apiBaseUrl: apiBaseUrl,
      message: e.toString(),
      hint: _hintForPlatform(apiBaseUrl),
    );
  }
}

String _hintForPlatform(String apiBaseUrl) {
  if (apiBaseUrl.contains('10.0.2.2')) {
    return 'Android emulator: ensure backend runs on your host at port 3000.';
  }
  if (apiBaseUrl.contains('localhost') || apiBaseUrl.contains('127.0.0.1')) {
    return 'Start backend: cd backend && npm run start:dev. For web, CORS allows localhost origins in development.';
  }
  return 'Check API_BASE_URL in .env.dev matches your backend address.';
}

final connectionDiagnosticsProvider = FutureProvider.autoDispose<ConnectionDiagnostics>((ref) async {
  final config = ref.watch(appConfigProvider);
  final dio = ref.watch(dioProvider);
  return probeBackend(dio, config.apiBaseUrl);
});
