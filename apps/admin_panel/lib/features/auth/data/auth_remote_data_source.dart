import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_response_parser.dart';
import '../../../core/network/dio_providers.dart';
import 'auth_user.dart';

class AuthRemoteDataSource {
  AuthRemoteDataSource(this._dio, this._parser);

  final Dio _dio;
  final ApiResponseParser _parser;

  Future<AuthSession> login({
    required String email,
    required String password,
  }) {
    return _parser.getData(
      () => _dio.post('/auth/login', data: {
        'email': email,
        'password': password,
        'platform': 'WEB',
      }),
      (json) {
        final user = AuthUser.fromJson(json['user'] as Map<String, dynamic>);
        final tokens = AuthTokens(
          accessToken: json['accessToken'] as String,
          refreshToken: json['refreshToken'] as String,
          expiresIn: json['expiresIn'] as int,
          tokenType: json['tokenType'] as String? ?? 'Bearer',
        );
        return AuthSession(tokens: tokens, user: user);
      },
    );
  }

  Future<AuthTokens> refresh(String refreshToken) {
    return _parser.getData(
      () => _dio.post('/auth/refresh', data: {'refreshToken': refreshToken}),
      (json) => AuthTokens(
        accessToken: json['accessToken'] as String,
        refreshToken: json['refreshToken'] as String,
        expiresIn: json['expiresIn'] as int,
        tokenType: json['tokenType'] as String? ?? 'Bearer',
      ),
    );
  }

  Future<void> logout() => _parser.postVoid(() => _dio.post('/auth/logout'));
}

final authRemoteDataSourceProvider = Provider<AuthRemoteDataSource>((ref) {
  final dio = ref.watch(authenticatedDioProvider);
  final factory = ref.watch(adminDioFactoryProvider);
  return AuthRemoteDataSource(dio, ApiResponseParser(factory));
});

final publicAuthDataSourceProvider = Provider<AuthRemoteDataSource>((ref) {
  final dio = ref.watch(publicDioProvider);
  final factory = ref.watch(adminDioFactoryProvider);
  return AuthRemoteDataSource(dio, ApiResponseParser(factory));
});
