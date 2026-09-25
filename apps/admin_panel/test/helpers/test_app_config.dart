import 'package:admin_panel/core/network/api_response_parser.dart';
import 'package:admin_panel/core/session/session_providers.dart';
import 'package:admin_panel/features/auth/data/auth_remote_data_source.dart';
import 'package:admin_panel/features/auth/data/auth_repository.dart';
import 'package:admin_panel/features/auth/data/auth_token_holder.dart';
import 'package:admin_panel/features/auth/data/auth_token_storage.dart';
import 'package:admin_panel/features/auth/presentation/auth_controller.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_shared/queueflow_shared.dart';

List<Override> testAppOverrides() {
  const testConfig = AppConfig(
    flavor: Flavor.dev,
    apiBaseUrl: 'https://api.dev.Quyk.test',
    wsBaseUrl: 'wss://api.dev.Quyk.test',
    appName: 'Quyk Admin (Test)',
    enableLogging: false,
    apiTimeoutSeconds: 30,
  );

  final fakeRepo = AuthRepository(
    AuthRemoteDataSource(Dio(), const ApiResponseParser(DioClientFactory())),
    AuthRemoteDataSource(Dio(), const ApiResponseParser(DioClientFactory())),
    AuthTokenStorage(),
    AuthTokenHolder(),
  );

  return [
    flavorProvider.overrideWithValue(Flavor.dev),
    appConfigProvider.overrideWithValue(testConfig),
    authRepositoryProvider.overrideWithValue(fakeRepo),
    authControllerProvider.overrideWith((ref) => _TestAuthController(fakeRepo)),
    sessionInitProvider.overrideWith((ref) async {}),
  ];
}

class _TestAuthController extends AuthController {
  _TestAuthController(super.repo) {
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  @override
  Future<void> bootstrap() async {
    state = const AuthState(status: AuthStatus.unauthenticated);
  }
}
