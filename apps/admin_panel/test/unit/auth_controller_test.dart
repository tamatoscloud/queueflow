import 'package:admin_panel/features/auth/data/auth_user.dart';
import 'package:admin_panel/features/auth/presentation/auth_controller.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('AuthUser', () {
    test('fromJson parses platform admin flag', () {
      final user = AuthUser.fromJson({
        'id': '1',
        'email': 'ops@queueflow.app',
        'fullName': 'Ops',
        'isPlatformAdmin': true,
        'roles': ['PLATFORM_ADMIN'],
        'permissions': ['platform:manage_tenants'],
      });
      expect(user.isPlatformAdmin, isTrue);
      expect(user.email, 'ops@queueflow.app');
    });
  });

  group('AuthState', () {
    test('isAuthenticated reflects status', () {
      const authed = AuthState(
        status: AuthStatus.authenticated,
        session: AuthSession(
          tokens: AuthTokens(accessToken: 'a', refreshToken: 'r', expiresIn: 3600),
          user: AuthUser(id: '1', email: 'a@b.c', fullName: 'A'),
        ),
      );
      expect(authed.isAuthenticated, isTrue);

      const unauthed = AuthState(status: AuthStatus.unauthenticated);
      expect(unauthed.isAuthenticated, isFalse);
    });
  });
}
