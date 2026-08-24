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
        estimatedWaitMinutes: _asInt(json['estimatedWaitMinutes']),
        priority: _asInt(json['priority']) ?? 0,
        isVip: json['isVip'] as bool? ?? false,
        calledAt: json['calledAt'] != null ? DateTime.tryParse(json['calledAt'] as String) : null,
        joinedAt: json['joinedAt'] != null ? DateTime.tryParse(json['joinedAt'] as String) : null,
      );
}

int? _asInt(dynamic value) {
  if (value == null) return null;
  if (value is int) return value;
  if (value is num) return value.round();
  if (value is String) return int.tryParse(value);
  return null;
}
