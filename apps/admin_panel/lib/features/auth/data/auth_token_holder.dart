import 'package:flutter_riverpod/flutter_riverpod.dart';

class AuthTokenHolder {
  String? _accessToken;

  String? get accessToken => _accessToken;

  void setAccessToken(String? token) => _accessToken = token;
}

final authTokenHolderProvider = Provider<AuthTokenHolder>((ref) => AuthTokenHolder());
