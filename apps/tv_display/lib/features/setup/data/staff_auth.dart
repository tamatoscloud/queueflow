import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_shared/queueflow_shared.dart';

import '../../../core/network/dio_providers.dart';
import '../../../core/network/tv_api_client.dart';

class AuthUser {
  const AuthUser({
    required this.id,
    required this.email,
    required this.fullName,
    required this.businessId,
    required this.roles,
    required this.permissions,
  });

  final String id;
  final String email;
  final String fullName;
  final String? businessId;
  final List<String> roles;
  final List<String> permissions;

  bool get canConfigureDisplay =>
      roles.contains('BUSINESS_OWNER') ||
      roles.contains('MANAGER') ||
      permissions.contains('settings:manage');

  factory AuthUser.fromJson(Map<String, dynamic> json) => AuthUser(
        id: json['id'] as String,
        email: json['email'] as String,
        fullName: json['fullName'] as String? ?? '',
        businessId: json['businessId'] as String?,
        roles: (json['roles'] as List<dynamic>? ?? []).cast<String>(),
        permissions:
            (json['permissions'] as List<dynamic>? ?? []).cast<String>(),
      );
}

class AuthSession {
  const AuthSession({required this.accessToken, required this.user});

  final String accessToken;
  final AuthUser user;
}

class StaffAuthRepository {
  StaffAuthRepository(this._dio, this._parser);

  final Dio _dio;
  final ApiResponseParser _parser;

  Future<AuthSession> login(String email, String password) async {
    final session = await _parser.getData(
      () => _dio.post('/auth/login', data: {
        'email': email,
        'password': password,
        'platform': 'WEB',
      }),
      (json) {
        final user = AuthUser.fromJson(json['user'] as Map<String, dynamic>);
        return AuthSession(
          accessToken: json['accessToken'] as String,
          user: user,
        );
      },
    );
    if (!session.user.canConfigureDisplay) {
      throw Exception('Only Business Owner or Manager can configure displays');
    }
    return session;
  }
}

class StaffAuthState {
  const StaffAuthState({this.session});

  final AuthSession? session;

  bool get isAuthenticated => session != null;
}

class StaffAuthNotifier extends Notifier<StaffAuthState> {
  @override
  StaffAuthState build() => const StaffAuthState();

  Future<void> login(String email, String password) async {
    final repo = ref.read(staffAuthRepositoryProvider);
    final session = await repo.login(email, password);
    state = StaffAuthState(session: session);
  }

  void logout() => state = const StaffAuthState();
}

final staffAuthRepositoryProvider = Provider<StaffAuthRepository>((ref) {
  return StaffAuthRepository(
    ref.watch(publicDioProvider),
    ref.watch(apiResponseParserProvider),
  );
});

final staffAuthProvider =
    NotifierProvider<StaffAuthNotifier, StaffAuthState>(StaffAuthNotifier.new);

final authenticatedDioProvider = Provider<Dio>((ref) {
  final config = ref.watch(appConfigProvider);
  final factory = ref.watch(tvDioFactoryProvider);
  final session = ref.watch(staffAuthProvider).session;

  return factory.create(
    baseUrl: config.apiBaseUrl,
    connectTimeout: Duration(seconds: config.apiTimeoutSeconds),
    receiveTimeout: Duration(seconds: config.apiTimeoutSeconds),
    enableLogging: config.enableLogging,
    interceptors: [
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final token = session?.accessToken;
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
      ),
    ],
  );
});

final staffApiClientProvider = Provider<TvApiClient>((ref) {
  return TvApiClient(
    ref.watch(authenticatedDioProvider),
    ref.watch(apiResponseParserProvider),
  );
});
