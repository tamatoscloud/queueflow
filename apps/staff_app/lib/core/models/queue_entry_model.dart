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
  final int? estimatedWaitMinutes;
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
        partySize: json['partySize'] as int? ?? 1,
        customerName: json['customerName'] as String?,
        customerPhone: json['customerPhone'] as String?,
        position: json['position'] as int?,
        estimatedWaitMinutes: json['estimatedWaitMinutes'] as int?,
        priority: json['priority'] as int? ?? 0,
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
}
