import 'queue_entry_model.dart';
import 'queue_model.dart';

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

  QueueEntryModel? get currentCalled =>
      entries.cast<QueueEntryModel?>().firstWhere(
            (e) => e?.status == 'CALLED',
            orElse: () => null,
          );

  List<QueueEntryModel> get waitingEntries =>
      entries.where((e) => e.status == 'WAITING' || e.status == 'HOLDING').toList();

  factory QueueSnapshotModel.fromJson(Map<String, dynamic> json) {
    // Engine snapshot flattens queue fields (`queueId`, `name`, …) at the root.
    final rawQueue = json['queue'] as Map<String, dynamic>? ?? json;
    final queueJson = {
      ...rawQueue,
      'id': rawQueue['id'] ?? rawQueue['queueId'],
    };
    final metricsJson = json['metrics'] as Map<String, dynamic>? ?? {};
    final entriesJson = json['entries'] as List<dynamic>? ?? [];
    final queue = QueueModel.fromJson(queueJson);
    return QueueSnapshotModel(
      queue: queue,
      entries: entriesJson.whereType<Map<String, dynamic>>().map((entry) {
        return QueueEntryModel.fromJson({
          ...entry,
          'serviceMode': entry['serviceMode'] ?? queue.serviceMode,
        });
      }).toList(),
      metrics: QueueMetricsModel.fromJson(metricsJson),
      generatedAt: DateTime.tryParse(json['generatedAt'] as String? ?? '') ?? DateTime.now(),
    );
  }
}

class QueueMetricsModel {
  const QueueMetricsModel({
    this.waitingCount = 0,
    this.calledCount = 0,
    this.completedToday = 0,
    this.averageWaitMinutes = 0,
    this.noShowCount = 0,
  });

  final int waitingCount;
  final int calledCount;
  final int completedToday;
  final int averageWaitMinutes;
  final int noShowCount;

  factory QueueMetricsModel.fromJson(Map<String, dynamic> json) => QueueMetricsModel(
        waitingCount: _metricInt(json['waitingCount']),
        calledCount: _metricInt(json['calledCount']),
        completedToday: _metricInt(json['completedToday'] ?? json['completedCount']),
        averageWaitMinutes: _metricInt(json['averageWaitMinutes']),
        noShowCount: _metricInt(json['noShowCount']),
      );
}

int _metricInt(dynamic value) {
  if (value == null) return 0;
  if (value is int) return value;
  if (value is num) return value.round();
  if (value is String) return int.tryParse(value) ?? 0;
  return 0;
}
