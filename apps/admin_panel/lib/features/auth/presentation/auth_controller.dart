import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/auth_repository.dart';
import '../data/auth_user.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthState {
  const AuthState({required this.status, this.session});

  final AuthStatus status;
  final AuthSession? session;

  bool get isAuthenticated => status == AuthStatus.authenticated;

  AuthState copyWith({AuthStatus? status, AuthSession? session}) => AuthState(
        status: status ?? this.status,
        session: session ?? this.session,
      );
}

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._repo) : super(const AuthState(status: AuthStatus.unknown));

  final AuthRepository _repo;

  Future<void> bootstrap() async {
    final session = await _repo.restoreSession();
    if (session != null) {
      state = AuthState(status: AuthStatus.authenticated, session: session);
    } else {
      state = const AuthState(status: AuthStatus.unauthenticated);
    }
  }

  Future<void> login(String email, String password) async {
    final session = await _repo.login(email, password);
    state = AuthState(status: AuthStatus.authenticated, session: session);
  }

  Future<void> sessionExpired() async {
    await _repo.clearSession();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  Future<void> logout() async {
    await _repo.logout();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }
}

final authControllerProvider =
    StateNotifierProvider<AuthController, AuthState>((ref) {
  return AuthController(ref.watch(authRepositoryProvider));
});

final currentUserProvider = Provider<AuthUser?>((ref) {
  return ref.watch(authControllerProvider).session?.user;
});
