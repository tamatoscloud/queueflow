import '../../../core/models/queue_entry_model.dart';

int calmWaitMinutes(QueueEntryModel entry) {
  final start = entry.calledAt ?? entry.joinedAt;
  if (start == null) return entry.estimatedWaitMinutes?.round() ?? 0;
  return DateTime.now().difference(start).inMinutes;
}

String calmWaitLabel(QueueEntryModel entry) {
  final mins = calmWaitMinutes(entry);
  if (mins < 1) return '<1 min';
  return '$mins min';
}

String calmEntryTitle(QueueEntryModel entry, String serviceMode) {
  return switch (serviceMode) {
    'TAKEAWAY' => entry.customerName?.trim().isNotEmpty == true
        ? entry.customerName!
        : 'Order #${entry.displayCode}',
    'DRIVE_IN' => entry.customerName?.trim().isNotEmpty == true ? entry.customerName! : 'Vehicle',
    _ => entry.customerName?.trim().isNotEmpty == true ? entry.customerName! : 'Guest',
  };
}

String calmEntrySubtitle(QueueEntryModel entry, String serviceMode) {
  return switch (serviceMode) {
    'TAKEAWAY' => 'Order #${entry.displayCode}',
    'DRIVE_IN' => entry.customerPhone?.trim().isNotEmpty == true ? entry.customerPhone! : entry.displayCode,
    _ => 'Party of ${entry.partySize}',
  };
}
