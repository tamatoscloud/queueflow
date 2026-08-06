import 'package:business_app/features/auth/data/models/auth_user.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('AuthUser parses login response user object', () {
    final user = AuthUser.fromJson({
      'id': 'u1',
      'email': 'owner@test.com',
      'fullName': 'Owner',
      'businessId': 'b1',
      'roles': ['OWNER'],
      'permissions': ['queue:operate'],
      'branchIds': null,
      'isPlatformAdmin': false,
      'sessionId': 's1',
    });

    expect(user.email, 'owner@test.com');
    expect(user.permissions, contains('queue:operate'));
  });
}
