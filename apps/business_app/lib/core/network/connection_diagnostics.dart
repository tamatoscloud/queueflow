import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
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
          'We can’t reach Quyk right now. Check your Wi‑Fi and try again.',
      timeout: () => 'That’s taking longer than usual. Please try again in a moment.',
      unauthorized: () => 'That email or password doesn’t look right.',
      forbidden: () => 'You don’t have permission to do that.',
      notFound: () => 'We couldn’t find what you were looking for.',
      server: (statusCode, message) => _sanitizeServerMessage(statusCode, message),
      unknown: (_) => 'Something went wrong. Please try again.',
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
        receiveTimeout: const Duration(seconds: 20),
        sendTimeout: const Duration(seconds: 20),
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
    const factory = DioClientFactory();
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
