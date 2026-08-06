import 'package:intl/intl.dart';

/// Generic date/time formatting helpers. Locale-aware formatting is
/// delegated to `package:intl`; callers decide the pattern.
extension DateTimeExtensions on DateTime {
  String format(String pattern) => DateFormat(pattern).format(this);

  bool isSameDay(DateTime other) =>
      year == other.year && month == other.month && day == other.day;

  DateTime get startOfDay => DateTime(year, month, day);

  DateTime get endOfDay => DateTime(year, month, day, 23, 59, 59, 999);
}
