import 'package:dio/dio.dart';
import 'package:queueflow_models/queueflow_models.dart';
import 'package:queueflow_network/queueflow_network.dart';

/// Parses the backend `{ success, data, meta?, requestId }` envelope.
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

  Future<T> getRawData<T>(
    Future<Response<dynamic>> Function() call,
    T Function(dynamic data) map,
  ) async {
    try {
      final response = await call();
      final body = response.data;
      if (body is! Map<String, dynamic> || body['success'] != true) {
        throw const ApiException.server(message: 'Request failed');
      }
      return map(body['data']);
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

  Future<PaginatedResponse<T>> getPaginated<T>(
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
      final meta = body['meta'] as Map<String, dynamic>?;
      final items = data is List
          ? data.whereType<Map<String, dynamic>>().map(fromJson).toList()
          : <T>[];
      return PaginatedResponse(
        items: items,
        page: meta?['page'] as int? ?? 1,
        pageSize: meta?['pageSize'] as int? ?? items.length,
        totalItems: meta?['totalItems'] as int? ?? items.length,
        totalPages: meta?['totalPages'] as int? ?? 1,
      );
    } on DioException catch (e) {
      throw _factory.mapError(e);
    }
  }

  Future<void> postVoid(Future<Response<dynamic>> Function() call) async {
    try {
      final response = await call();
      final body = response.data;
      if (body is Map<String, dynamic> && body['success'] == false) {
        final err = body['error'];
        throw ApiException.server(
          message: err is Map ? err['message'] as String? : 'Request failed',
        );
      }
    } on DioException catch (e) {
      throw _factory.mapError(e);
    }
  }
}
