import 'package:flutter_riverpod/flutter_riverpod.dart';

/// In-memory access token so the first authenticated request after login
/// does not wait on async secure-storage reads (notably flaky on Windows).
class AuthTokenHolder {
  String? _accessToken;

  String? get accessToken => _accessToken;

  void setAccessToken(String? token) => _accessToken = token;
}

final authTokenHolderProvider = Provider<AuthTokenHolder>((ref) => AuthTokenHolder());
