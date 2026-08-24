import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'auth_remote_data_source.dart';
import 'auth_token_holder.dart';
import 'auth_token_storage.dart';
import 'models/auth_user.dart';

class AuthRepository {
  AuthRepository(this._remote, this._publicRemote, this._storage, this._holder);

  final AuthRemoteDataSource _remote;
  final AuthRemoteDataSource _publicRemote;
  final AuthTokenStorage _storage;
  final AuthTokenHolder _holder;

  Future<AuthSession> login(String email, String password) async {
    final session = await _publicRemote.login(email: email, password: password);
    await _persist(session);
    return session;
  }

  Future<AuthSession?> restoreSession() async {
    final results = await Future.wait([
      _storage.getAccessToken(),
      _storage.getRefreshToken(),
      _storage.getUserJson(),
    ]);
    final access = results[0];
    final refresh = results[1];
    final userJson = results[2];
    if (access == null || refresh == null || userJson == null) return null;
    try {
      final user = AuthUser.fromJson(
        jsonDecode(userJson) as Map<String, dynamic>,
      );
      _holder.setAccessToken(access);
      return AuthSession(
        tokens: AuthTokens(
          accessToken: access,
          refreshToken: refresh,
          expiresIn: 3600,
        ),
        user: user,
      );
    } catch (_) {
      await clearSession();
      return null;
    }
  }

  Future<bool> refreshTokens() async {
    final refresh = await _storage.getRefreshToken();
    if (refresh == null) return false;
    try {
      final tokens = await _publicRemote.refresh(refresh);
      final userJson = await _storage.getUserJson();
      if (userJson == null) return false;
      _holder.setAccessToken(tokens.accessToken);
      await _storage.saveTokens(
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        userJson: userJson,
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> logout() async {
    final hasToken = _holder.accessToken != null || await _storage.getAccessToken() != null;
    try {
      if (hasToken) {
        await _remote.logout();
      }
    } catch (_) {
      // Best-effort — always clear local session.
    } finally {
      await clearSession();
    }
  }

  Future<void> forgotPassword(String email) => _publicRemote.forgotPassword(email);

  Future<void> _persist(AuthSession session) async {
    // In-memory token must be set before any authenticated API call.
    _holder.setAccessToken(session.tokens.accessToken);
    try {
      await _storage
          .saveTokens(
            accessToken: session.tokens.accessToken,
            refreshToken: session.tokens.refreshToken,
            userJson: jsonEncode(session.user.toJson()),
          )
          .timeout(const Duration(seconds: 5));
    } catch (_) {
      // Login still succeeds if secure storage is slow/unavailable (common on
      // some Windows/web hosts). Session lives in memory until refresh.
    }
  }

  Future<void> clearSession() async {
    _holder.setAccessToken(null);
    await _storage.clear();
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    ref.watch(authRemoteDataSourceProvider),
    ref.watch(publicAuthDataSourceProvider),
    ref.watch(authTokenStorageProvider),
    ref.watch(authTokenHolderProvider),
  );
});
