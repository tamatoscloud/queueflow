class CustomerModel {
  const CustomerModel({
    required this.id,
    required this.fullName,
    required this.phone,
    this.email,
    this.totalVisits = 0,
  });

  final String id;
  final String fullName;
  final String phone;
  final String? email;
  final int totalVisits;

  factory CustomerModel.fromJson(Map<String, dynamic> json) => CustomerModel(
        id: json['id'] as String,
        fullName: json['fullName'] as String? ?? json['name'] as String? ?? '',
        phone: json['phone'] as String? ?? '',
        email: json['email'] as String?,
        totalVisits: json['totalVisits'] as int? ?? 0,
      );
}

class CustomerHistoryEntry {
  const CustomerHistoryEntry({
    required this.entryId,
    required this.queueName,
    required this.status,
    required this.joinedAt,
    this.completedAt,
  });

  final String entryId;
  final String queueName;
  final String status;
  final DateTime joinedAt;
  final DateTime? completedAt;

  factory CustomerHistoryEntry.fromJson(Map<String, dynamic> json) => CustomerHistoryEntry(
        entryId: json['entryId'] as String? ?? json['id'] as String? ?? '',
        queueName: json['queueName'] as String? ?? '',
        status: json['status'] as String? ?? '',
        joinedAt: DateTime.tryParse(json['joinedAt'] as String? ?? '') ?? DateTime.now(),
        completedAt: json['completedAt'] != null
            ? DateTime.tryParse(json['completedAt'] as String)
            : null,
      );
}
