import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_models/queueflow_models.dart';
import 'package:queueflow_network/queueflow_network.dart';
import 'package:queueflow_shared/queueflow_shared.dart';

class ApiResponseParser {
  const ApiResponseParser(this._factory);

  final DioClientFactory _factory;

  Future<T> getData<T>(
    Future<Response<dynamic>> Function() call,
    T Function(Map<String, dynamic> json) fromJson,
  ) async {
    try {
      final response = await call();
      final body = response.data;
      if (body is! Map<String, dynamic>) {
        throw const ApiException.server(message: 'Invalid response format');
      }
      if (body['success'] != true) {
        final err = body['error'];
        final message = err is Map ? err['message'] as String? : null;
        throw ApiException.server(message: message ?? 'Request failed');
      }
      final data = body['data'];
      if (data is! Map<String, dynamic>) {
        throw const ApiException.server(message: 'Missing data payload');
      }
      return fromJson(data);
    } on DioException catch (e) {
      throw _factory.mapError(e);
    }
  }

  Future<List<T>> getList<T>(
    Future<Response<dynamic>> Function() call,
    T Function(Map<String, dynamic> json) fromJson,
  ) async {
    try {
      final response = await call();
      final body = response.data;
      if (body is! Map<String, dynamic> || body['success'] != true) {
        throw const ApiException.server(message: 'Request failed');
      }
      final data = body['data'];
      if (data is! List) return [];
      return data.whereType<Map<String, dynamic>>().map(fromJson).toList();
    } on DioException catch (e) {
      throw _factory.mapError(e);
    }
  }
}

final tvDioFactoryProvider = Provider<DioClientFactory>(
  (ref) => const DioClientFactory(),
);

final publicDioProvider = Provider<Dio>((ref) {
  final config = ref.watch(appConfigProvider);
  final factory = ref.watch(tvDioFactoryProvider);
  return factory.create(
    baseUrl: config.apiBaseUrl,
    connectTimeout: Duration(seconds: config.apiTimeoutSeconds),
    receiveTimeout: Duration(seconds: config.apiTimeoutSeconds),
    enableLogging: config.enableLogging,
  );
});

final apiResponseParserProvider = Provider<ApiResponseParser>((ref) {
  return ApiResponseParser(ref.watch(tvDioFactoryProvider));
});
