class QueueEntryModel {
  const QueueEntryModel({
    required this.id,
    required this.displayCode,
    required this.status,
    required this.partySize,
    this.customerName,
    this.customerPhone,
    this.position,
    this.estimatedWaitMinutes,
    this.priority = 0,
    this.isVip = false,
    this.calledAt,
    this.joinedAt,
    this.notes,
    this.metadata,
    this.serviceMode = 'DINE_IN',
  });

  final String id;
  final String displayCode;
  final String status;
  final int partySize;
  final String? customerName;
  final String? customerPhone;
  final int? position;
  final double? estimatedWaitMinutes;
  final int priority;
  final bool isVip;
  final DateTime? calledAt;
  final DateTime? joinedAt;
  final String? notes;
  final Map<String, dynamic>? metadata;
  final String serviceMode;

  bool get isWaiting => status == 'WAITING';
  bool get isCalled => status == 'CALLED';
  bool get isHolding => status == 'HOLDING';

  factory QueueEntryModel.fromJson(Map<String, dynamic> json) => QueueEntryModel(
        id: json['id'] as String,
        displayCode: json['displayCode'] as String? ?? '',
        status: json['status'] as String? ?? 'WAITING',
        partySize: _asInt(json['partySize']) ?? 1,
        customerName: json['customerName'] as String?,
        customerPhone: json['customerPhone'] as String?,
        position: _asInt(json['position']),
        estimatedWaitMinutes: _asDouble(json['estimatedWaitMinutes']),
        priority: _asInt(json['priority']) ?? 0,
        isVip: json['isVip'] as bool? ?? false,
        calledAt: json['calledAt'] != null ? DateTime.tryParse(json['calledAt'] as String) : null,
        joinedAt: json['joinedAt'] != null ? DateTime.tryParse(json['joinedAt'] as String) : null,
        notes: json['notes'] as String?,
        metadata: json['metadata'] is Map<String, dynamic>
            ? json['metadata'] as Map<String, dynamic>
            : json['metadata'] is Map
                ? Map<String, dynamic>.from(json['metadata'] as Map)
                : null,
        serviceMode: json['serviceMode'] as String? ?? 'DINE_IN',
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'displayCode': displayCode,
        'status': status,
        'partySize': partySize,
        if (customerName != null) 'customerName': customerName,
        if (customerPhone != null) 'customerPhone': customerPhone,
        if (position != null) 'position': position,
        if (estimatedWaitMinutes != null) 'estimatedWaitMinutes': estimatedWaitMinutes,
        'priority': priority,
        'isVip': isVip,
        if (calledAt != null) 'calledAt': calledAt!.toIso8601String(),
        if (joinedAt != null) 'joinedAt': joinedAt!.toIso8601String(),
        if (notes != null) 'notes': notes,
        if (metadata != null) 'metadata': metadata,
        'serviceMode': serviceMode,
      };
}

int? _asInt(dynamic value) {
  if (value == null) return null;
  if (value is int) return value;
  if (value is num) return value.round();
  if (value is String) return int.tryParse(value);
  return null;
}

double? _asDouble(dynamic value) {
  if (value == null) return null;
  if (value is double) return value;
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value);
  return null;
}
