class DailySummaryModel {
  const DailySummaryModel({
    required this.date,
    required this.totalServed,
    required this.averageWaitMinutes,
    required this.noShows,
    this.joined = 0,
    this.stillActive = 0,
  });

  final String date;
  final int totalServed;
  final int averageWaitMinutes;
  final int noShows;
  final int joined;
  final int stillActive;

  bool get hasActivity => joined > 0 || totalServed > 0;

  factory DailySummaryModel.fromJson(Map<String, dynamic> json) {
    final totals = json['totals'] as Map<String, dynamic>?;
    final waitTime = json['waitTime'] as Map<String, dynamic>?;

    final completed = json['totalServed'] as int? ??
        json['completedCount'] as int? ??
        totals?['completed'] as int? ??
        0;
    final joined = totals?['joined'] as int? ?? completed;
    final avgRaw = json['averageWaitMinutes'] ?? waitTime?['averageMinutes'];
    final avgMinutes = avgRaw is num ? avgRaw.round() : 0;

    return DailySummaryModel(
      date: json['date'] as String? ?? '',
      totalServed: completed,
      averageWaitMinutes: avgMinutes,
      noShows: json['noShows'] as int? ??
          json['noShowCount'] as int? ??
          totals?['noShows'] as int? ??
          0,
      joined: joined,
      stillActive: totals?['stillActive'] as int? ?? 0,
    );
  }
}

class PeakHourModel {
  const PeakHourModel({required this.hour, required this.count});

  final int hour;
  final int count;

  factory PeakHourModel.fromJson(Map<String, dynamic> json) => PeakHourModel(
        hour: json['hour'] as int? ?? 0,
        count: json['count'] as int? ?? 0,
      );
}
