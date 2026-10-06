import 'package:intl/intl.dart';

/// Staff search: "#74" and "74" should hit the same ticket.
String normalizeGuestSearch(String raw) =>
    raw.trim().replaceFirst(RegExp(r'^#+'), '').trim();

String formatGuestVisitWhen(DateTime at) =>
    DateFormat('d MMM y, h:mm a').format(at.toLocal());

String guestHistoryHeadline(String queueName, String? displayCode) {
  final code = displayCode?.trim();
  if (code == null || code.isEmpty) return queueName;
  if (queueName.trim().isEmpty) return '#$code';
  return '#$code · $queueName';
}
