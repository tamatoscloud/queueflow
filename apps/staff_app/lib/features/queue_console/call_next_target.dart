/// Pure helpers for staff "call next" targeting.
/// Search/filter must never redefine who is truly next in line.
library;

import '../../core/models/queue_entry_model.dart';

List<QueueEntryModel> waitingEntriesSorted(Iterable<QueueEntryModel> entries) {
  final waiting = entries.where((e) => e.status == 'WAITING').toList()
    ..sort((a, b) => (a.position ?? 999).compareTo(b.position ?? 999));
  return waiting;
}

QueueEntryModel? trueNextWaiting(Iterable<QueueEntryModel> entries) {
  final waiting = waitingEntriesSorted(entries);
  return waiting.isEmpty ? null : waiting.first;
}

/// Whether [focus] is allowed to auto-call via call-next.
/// Filtered UI lists must pass the unfiltered [trueNext].
bool canAutoCallFocus({
  required QueueEntryModel? focus,
  required QueueEntryModel? trueNext,
}) {
  if (focus == null || trueNext == null) return false;
  return focus.id == trueNext.id;
}
