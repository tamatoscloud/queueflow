class QueueModel {
  const QueueModel({
    required this.id,
    required this.businessId,
    required this.branchId,
    required this.name,
    this.description,
    required this.status,
    required this.prefix,
    this.maxCapacity,
    this.averageServiceTimeMinutes = 10,
    this.priorityEnabled = false,
    this.isAcceptingEntries = true,
    this.waitingCount = 0,
    this.serviceMode = 'DINE_IN',
  });

  final String id;
  final String businessId;
  final String branchId;
  final String name;
  final String? description;
  final String status;
  final String prefix;
  final int? maxCapacity;
  final int averageServiceTimeMinutes;
  final bool priorityEnabled;
  final bool isAcceptingEntries;
  final int waitingCount;
  final String serviceMode;

  bool get isActive => status == 'ACTIVE';
  bool get isPaused => status == 'PAUSED';
  bool get isClosed => status == 'CLOSED';
  bool get isDineIn => serviceMode == 'DINE_IN';
  bool get isTakeaway => serviceMode == 'TAKEAWAY';
  bool get isDriveIn => serviceMode == 'DRIVE_IN';

  factory QueueModel.fromJson(Map<String, dynamic> json) => QueueModel(
        id: (json['id'] ?? json['queueId']) as String,
        businessId: json['businessId'] as String,
        branchId: json['branchId'] as String,
        name: json['name'] as String,
        description: json['description'] as String?,
        status: json['status'] as String? ?? 'ACTIVE',
        prefix: json['prefix'] as String? ?? 'A',
        maxCapacity: json['maxCapacity'] as int?,
        averageServiceTimeMinutes: json['averageServiceTimeMinutes'] as int? ?? 10,
        priorityEnabled: json['priorityEnabled'] as bool? ?? false,
        isAcceptingEntries: json['isAcceptingEntries'] as bool? ?? true,
        waitingCount: json['waitingCount'] as int? ?? 0,
        serviceMode: json['serviceMode'] as String? ?? 'DINE_IN',
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'businessId': businessId,
        'branchId': branchId,
        'name': name,
        if (description != null) 'description': description,
        'status': status,
        'prefix': prefix,
        if (maxCapacity != null) 'maxCapacity': maxCapacity,
        'averageServiceTimeMinutes': averageServiceTimeMinutes,
        'priorityEnabled': priorityEnabled,
        'isAcceptingEntries': isAcceptingEntries,
        'waitingCount': waitingCount,
        'serviceMode': serviceMode,
      };

  QueueModel copyWith({int? waitingCount}) => QueueModel(
        id: id,
        businessId: businessId,
        branchId: branchId,
        name: name,
        description: description,
        status: status,
        prefix: prefix,
        maxCapacity: maxCapacity,
        averageServiceTimeMinutes: averageServiceTimeMinutes,
        priorityEnabled: priorityEnabled,
        isAcceptingEntries: isAcceptingEntries,
        waitingCount: waitingCount ?? this.waitingCount,
        serviceMode: serviceMode,
      );
}
