class QueueEntryModel {
  const QueueEntryModel({
    required this.id,
    required this.displayCode,
    required this.status,
    this.customerName,
    this.position,
    this.estimatedWaitMinutes,
  });

  final String id;
  final String displayCode;
  final String status;
  final String? customerName;
  final int? position;
  final int? estimatedWaitMinutes;

  bool get isCalled => status == 'CALLED';
  bool get isWaiting => status == 'WAITING' || status == 'HOLDING';

  factory QueueEntryModel.fromJson(Map<String, dynamic> json) => QueueEntryModel(
        id: json['id'] as String,
        displayCode: json['displayCode'] as String? ?? '',
        status: json['status'] as String? ?? 'WAITING',
        customerName: json['customerName'] as String?,
        position: json['position'] as int?,
        estimatedWaitMinutes: json['estimatedWaitMinutes'] as int?,
      );
}

class QueueModel {
  const QueueModel({
    required this.id,
    required this.name,
    required this.status,
    this.businessId,
    this.branchId,
    this.prefix = 'A',
    this.isAcceptingEntries = true,
  });

  final String id;
  final String name;
  final String status;
  final String? businessId;
  final String? branchId;
  final String prefix;
  final bool isAcceptingEntries;

  bool get isActive => status == 'ACTIVE';
  bool get isPaused => status == 'PAUSED';
  bool get isClosed => status == 'CLOSED';

  factory QueueModel.fromJson(Map<String, dynamic> json) => QueueModel(
        id: (json['id'] ?? json['queueId']) as String,
        name: json['name'] as String? ?? '',
        status: json['status'] as String? ?? 'ACTIVE',
        businessId: json['businessId'] as String?,
        branchId: json['branchId'] as String?,
        prefix: json['prefix'] as String? ?? 'A',
        isAcceptingEntries: json['isAcceptingEntries'] as bool? ?? true,
      );
}

class QueueMetricsModel {
  const QueueMetricsModel({
    this.waitingCount = 0,
    this.averageWaitMinutes = 0,
  });

  final int waitingCount;
  final int averageWaitMinutes;

  factory QueueMetricsModel.fromJson(Map<String, dynamic> json) =>
      QueueMetricsModel(
        waitingCount: json['waitingCount'] as int? ?? 0,
        averageWaitMinutes: json['averageWaitMinutes'] as int? ??
            json['averageServiceTimeMinutes'] as int? ??
            0,
      );
}

class QueueSnapshotModel {
  const QueueSnapshotModel({
    required this.queue,
    required this.entries,
    required this.metrics,
    required this.generatedAt,
  });

  final QueueModel queue;
  final List<QueueEntryModel> entries;
  final QueueMetricsModel metrics;
  final DateTime generatedAt;

  QueueEntryModel? get currentCalled {
    for (final e in entries) {
      if (e.isCalled) return e;
    }
    return null;
  }

  List<QueueEntryModel> get waitingEntries =>
      entries.where((e) => e.isWaiting).toList();

  factory QueueSnapshotModel.fromJson(Map<String, dynamic> json) {
    // Engine snapshot flattens queue fields (`queueId`, `name`, …) at the root.
    final rawQueue = json['queue'] as Map<String, dynamic>? ?? json;
    final queueJson = {
      ...rawQueue,
      'id': rawQueue['id'] ?? rawQueue['queueId'],
    };
    final metricsJson = json['metrics'] as Map<String, dynamic>? ?? {};
    final entriesJson = json['entries'] as List<dynamic>? ?? [];
    return QueueSnapshotModel(
      queue: QueueModel.fromJson(queueJson),
      entries: entriesJson
          .whereType<Map<String, dynamic>>()
          .map(QueueEntryModel.fromJson)
          .toList(),
      metrics: QueueMetricsModel.fromJson(metricsJson),
      generatedAt:
          DateTime.tryParse(json['generatedAt'] as String? ?? '') ??
              DateTime.now(),
    );
  }
}

class QueueLandingModel {
  const QueueLandingModel({
    required this.businessName,
    required this.branchName,
    required this.queue,
    this.businessLogoUrl,
    this.estimatedWaitMinutes = 0,
    this.waitingCount = 0,
  });

  final String businessName;
  final String branchName;
  final QueueModel queue;
  final String? businessLogoUrl;
  final int estimatedWaitMinutes;
  final int waitingCount;

  factory QueueLandingModel.fromJson(Map<String, dynamic> json) {
    final business = json['business'] as Map<String, dynamic>? ?? {};
    final branch = json['branch'] as Map<String, dynamic>? ?? {};
    final queue = json['queue'] as Map<String, dynamic>? ?? {};
    final live = json['live'] as Map<String, dynamic>? ?? {};
    return QueueLandingModel(
      businessName: business['name'] as String? ?? '',
      branchName: branch['name'] as String? ?? '',
      businessLogoUrl: business['logoUrl'] as String?,
      queue: QueueModel.fromJson(queue),
      estimatedWaitMinutes: live['estimatedWaitMinutes'] as int? ?? 0,
      waitingCount: live['waitingCount'] as int? ?? 0,
    );
  }
}

class BranchModel {
  const BranchModel({
    required this.id,
    required this.businessId,
    required this.name,
  });

  final String id;
  final String businessId;
  final String name;

  factory BranchModel.fromJson(Map<String, dynamic> json) => BranchModel(
        id: json['id'] as String,
        businessId: json['businessId'] as String,
        name: json['name'] as String,
      );
}

/// Response from `POST /queues/:id/display-credential`.
class DisplayCredentialModel {
  const DisplayCredentialModel({
    required this.queueId,
    required this.displayToken,
  });

  final String queueId;

  /// Backend-issued JWT — store as [DisplayConfig.displayCredential], never show in UI.
  final String displayToken;

  factory DisplayCredentialModel.fromJson(Map<String, dynamic> json) =>
      DisplayCredentialModel(
        queueId: json['queueId'] as String,
        displayToken: json['displayToken'] as String,
      );
}
