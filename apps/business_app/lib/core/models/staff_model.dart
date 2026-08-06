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
}

class StaffInviteRequest {
  const StaffInviteRequest({
    required this.email,
    required this.fullName,
    required this.roleName,
    this.branchIds = const [],
  });

  final String email;
  final String fullName;
  final String roleName;
  final List<String> branchIds;

  Map<String, dynamic> toJson() => {
        'email': email,
        'fullName': fullName,
        'roleName': roleName,
        if (branchIds.isNotEmpty) 'branchIds': branchIds,
      };
}
