class DailySummaryModel {
  const DailySummaryModel({
    required this.date,
    required this.totalServed,
    required this.averageWaitMinutes,
    required this.peakHour,
    required this.noShows,
  });

  final String date;
  final int totalServed;
  final int averageWaitMinutes;
  final int peakHour;
  final int noShows;

  factory DailySummaryModel.fromJson(Map<String, dynamic> json) => DailySummaryModel(
        date: json['date'] as String? ?? '',
        totalServed: json['totalServed'] as int? ?? json['completedCount'] as int? ?? 0,
        averageWaitMinutes: json['averageWaitMinutes'] as int? ?? 0,
        peakHour: json['peakHour'] as int? ?? 0,
        noShows: json['noShows'] as int? ?? json['noShowCount'] as int? ?? 0,
      );
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
