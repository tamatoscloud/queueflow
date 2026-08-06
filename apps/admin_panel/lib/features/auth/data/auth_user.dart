class AuthUser {
  const AuthUser({
    required this.id,
    required this.email,
    required this.fullName,
    this.businessId,
    this.roles = const [],
    this.permissions = const [],
    this.isPlatformAdmin = false,
  });

  final String id;
  final String email;
  final String fullName;
  final String? businessId;
  final List<String> roles;
  final List<String> permissions;
  final bool isPlatformAdmin;

  factory AuthUser.fromJson(Map<String, dynamic> json) => AuthUser(
        id: json['id'] as String,
        email: json['email'] as String,
        fullName: json['fullName'] as String? ?? json['name'] as String? ?? '',
        businessId: json['businessId'] as String?,
        roles: (json['roles'] as List<dynamic>?)
                ?.map((e) => e.toString())
                .toList() ??
            const [],
        permissions: (json['permissions'] as List<dynamic>?)
                ?.map((e) => e.toString())
                .toList() ??
            const [],
        isPlatformAdmin: json['isPlatformAdmin'] as bool? ?? false,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'fullName': fullName,
        'businessId': businessId,
        'roles': roles,
        'permissions': permissions,
        'isPlatformAdmin': isPlatformAdmin,
      };
}

class AuthTokens {
  const AuthTokens({
    required this.accessToken,
    required this.refreshToken,
    required this.expiresIn,
    this.tokenType = 'Bearer',
  });

  final String accessToken;
  final String refreshToken;
  final int expiresIn;
  final String tokenType;
}

class AuthSession {
  const AuthSession({required this.tokens, required this.user});

  final AuthTokens tokens;
  final AuthUser user;
}
