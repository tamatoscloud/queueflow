class CustomerModel {
  const CustomerModel({
    required this.id,
    required this.fullName,
    required this.phone,
    this.email,
    this.totalVisits = 0,
    this.activeStatus,
    this.displayCode,
    this.queueId,
    this.queueName,
    this.entryId,
    this.visitedAt,
  });

  final String id;
  final String fullName;
  final String phone;
  final String? email;
  final int totalVisits;
  final String? activeStatus;
  final String? displayCode;
  final String? queueId;
  final String? queueName;
  final String? entryId;

  /// When the guest joined their latest visit (Guests table "Visit date").
  final DateTime? visitedAt;

  factory CustomerModel.fromJson(Map<String, dynamic> json) {
    // lookup/active wraps the profile under `customer`
    final nested = json['customer'];
    final src = nested is Map<String, dynamic> ? nested : json;
    return CustomerModel(
      id: src['id'] as String? ?? '',
      fullName: src['fullName'] as String? ?? src['name'] as String? ?? '',
      phone: src['phone'] as String? ?? '',
      email: src['email'] as String?,
      totalVisits: src['totalVisits'] as int? ?? json['totalVisits'] as int? ?? 0,
      activeStatus: src['activeStatus'] as String? ?? json['activeStatus'] as String?,
      displayCode: src['displayCode'] as String? ?? json['displayCode'] as String?,
      queueId: src['queueId'] as String? ?? json['queueId'] as String?,
      queueName: src['queueName'] as String? ?? json['queueName'] as String?,
      entryId: src['entryId'] as String? ?? json['entryId'] as String?,
      visitedAt: DateTime.tryParse(
        (src['visitedAt'] ?? json['visitedAt']) as String? ?? '',
      ),
    );
  }
}

class CustomerHistoryEntry {
  const CustomerHistoryEntry({
    required this.entryId,
    required this.queueName,
    required this.status,
    required this.joinedAt,
    this.queueId,
    this.completedAt,
    this.displayCode,
  });

  final String entryId;
  final String queueName;
  final String status;
  final DateTime joinedAt;
  final String? queueId;
  final DateTime? completedAt;
  final String? displayCode;

  factory CustomerHistoryEntry.fromJson(Map<String, dynamic> json) => CustomerHistoryEntry(
        entryId: json['entryId'] as String? ?? json['id'] as String? ?? '',
        queueId: json['queueId'] as String?,
        queueName: json['queueName'] as String? ?? '',
        status: json['status'] as String? ?? '',
        joinedAt: DateTime.tryParse(json['joinedAt'] as String? ?? '') ?? DateTime.now(),
        completedAt: json['completedAt'] != null
            ? DateTime.tryParse(json['completedAt'] as String)
            : null,
        displayCode: json['displayCode'] as String?,
      );
}
