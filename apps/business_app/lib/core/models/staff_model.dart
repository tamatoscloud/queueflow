class StaffMemberModel {
  const StaffMemberModel({
    required this.id,
    required this.email,
    required this.fullName,
    required this.role,
    required this.status,
    this.branchIds = const [],
  });

  final String id;
  final String email;
  final String fullName;
  final String role;
  final String status;
  final List<String> branchIds;

  factory StaffMemberModel.fromJson(Map<String, dynamic> json) => StaffMemberModel(
        id: json['id'] as String,
        email: json['email'] as String? ?? '',
        fullName: json['fullName'] as String? ?? '',
        role: json['role'] as String? ?? json['roleName'] as String? ?? '',
        status: json['status'] as String? ?? 'ACTIVE',
        branchIds: (json['branchIds'] as List<dynamic>?)?.cast<String>() ?? [],
      );

  bool get isActive => status.toUpperCase() == 'ACTIVE';
}

class StaffInvitationModel {
  const StaffInvitationModel({
    required this.id,
    required this.email,
    required this.role,
    required this.status,
    this.expiresAt,
  });

  final String id;
  final String email;
  final String role;
  final String status;
  final DateTime? expiresAt;

  factory StaffInvitationModel.fromJson(Map<String, dynamic> json) => StaffInvitationModel(
        id: json['id'] as String,
        email: json['email'] as String? ?? '',
        role: json['role'] as String? ?? json['roleName'] as String? ?? '',
        status: json['status'] as String? ?? 'PENDING',
        expiresAt: json['expiresAt'] != null ? DateTime.tryParse(json['expiresAt'] as String) : null,
      );
}

class StaffRosterModel {
  const StaffRosterModel({
    this.members = const [],
    this.invitations = const [],
  });

  final List<StaffMemberModel> members;
  final List<StaffInvitationModel> invitations;

  factory StaffRosterModel.fromJson(Map<String, dynamic> json) => StaffRosterModel(
        members: (json['members'] as List<dynamic>?)
                ?.map((e) => StaffMemberModel.fromJson(e as Map<String, dynamic>))
                .toList() ??
            const [],
        invitations: (json['invitations'] as List<dynamic>?)
                ?.map((e) => StaffInvitationModel.fromJson(e as Map<String, dynamic>))
                .toList() ??
            const [],
      );
}

class StaffInviteRequest {
  const StaffInviteRequest({
    required this.email,
    required this.fullName,
    required this.roleName,
    this.businessId,
    this.branchIds = const [],
  });

  final String email;
  final String fullName;
  final String roleName;
  final String? businessId;
  final List<String> branchIds;

  Map<String, dynamic> toJson() => {
        'email': email,
        'fullName': fullName,
        'roleName': roleName,
        if (businessId != null) 'businessId': businessId,
        if (branchIds.isNotEmpty) 'branchId': branchIds.first,
      };
}

String staffRoleLabel(String role) => switch (role.toUpperCase()) {
      'OWNER' => 'Owner',
      'MANAGER' => 'Manager — full access',
      'RECEPTIONIST' => 'Host — run the waiting line',
      'STAFF' => 'Team member — help serve guests',
      'VIEWER' => 'View only',
      _ => role,
    };

String staffRoleShortLabel(String role) => switch (role.toUpperCase()) {
      'OWNER' => 'Owner',
      'MANAGER' => 'Manager',
      'RECEPTIONIST' => 'Host',
      'STAFF' => 'Team',
      'VIEWER' => 'View only',
      _ => role,
    };
