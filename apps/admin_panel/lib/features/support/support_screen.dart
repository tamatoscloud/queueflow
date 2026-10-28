import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../../core/models/platform_models.dart';
import '../../core/network/api_error_message.dart';
import '../../core/network/platform_api_client.dart';
import '../../shared/feedback.dart';
import '../tenants/tenants_screen.dart' show formatDate;

final supportTicketsProvider = FutureProvider.autoDispose<List<SupportTicket>>((ref) async {
  return ref.watch(platformApiClientProvider).listSupportTickets();
});

const ticketStatuses = [
  (value: 'OPEN', label: 'Open'),
  (value: 'IN_PROGRESS', label: 'In progress'),
  (value: 'RESOLVED', label: 'Resolved'),
  (value: 'CLOSED', label: 'Closed'),
];

const ticketPriorities = [
  (value: 'LOW', label: 'Low'),
  (value: 'MEDIUM', label: 'Medium'),
  (value: 'HIGH', label: 'High'),
  (value: 'URGENT', label: 'Urgent'),
];

String _label(List<({String value, String label})> options, String value) =>
    options.firstWhere((o) => o.value == value.toUpperCase(), orElse: () => (value: value, label: value)).label;

Widget ticketStatusPill(String status) {
  final (bg, fg) = switch (status.toUpperCase()) {
    'OPEN' => (QuykColors.lime, QuykColors.green),
    'IN_PROGRESS' => (QuykColors.limeSoft, QuykColors.green),
    'RESOLVED' => (QuykColors.mist, QuykColors.greenMuted),
    _ => (QuykColors.mist, QuykColors.subtle),
  };
  return QuykPill(label: _label(ticketStatuses, status), background: bg, foreground: fg, fontSize: 11);
}

Widget ticketPriorityPill(String priority) {
  final (bg, fg) = switch (priority.toUpperCase()) {
    'URGENT' => (QuykColors.dangerTint, QuykColors.danger),
    'HIGH' => (QuykColors.warningTint, const Color(0xFF7A4B0C)),
    _ => (QuykColors.mist, QuykColors.greenMuted),
  };
  return QuykPill(label: _label(ticketPriorities, priority), background: bg, foreground: fg, fontSize: 11);
}

class SupportScreen extends ConsumerStatefulWidget {
  const SupportScreen({super.key});

  @override
  ConsumerState<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends ConsumerState<SupportScreen> {
  final _search = TextEditingController();
  String _query = '';
  String? _status = 'ACTIVE';

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  bool _matches(SupportTicket t) {
    final status = t.status.toUpperCase();
    final statusOk = switch (_status) {
      null => true,
      'ACTIVE' => status == 'OPEN' || status == 'IN_PROGRESS',
      final s => status == s,
    };
    if (!statusOk) return false;
    if (_query.isEmpty) return true;
    final q = _query.toLowerCase();
    return t.subject.toLowerCase().contains(q) || (t.businessName?.toLowerCase().contains(q) ?? false);
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(supportTicketsProvider);
    return QuykPage(
      title: 'Support',
      subtitle: 'Requests from restaurants that need a hand.',
      onRefresh: () async => ref.invalidate(supportTicketsProvider),
      action: FilledButton.icon(
        onPressed: _create,
        icon: const Icon(Icons.add_rounded),
        label: const Text('New ticket'),
      ),
      children: [
        QuykSearchField(
          controller: _search,
          hint: 'Search by subject or business',
          onChanged: (v) => setState(() => _query = v.trim()),
        ),
        const SizedBox(height: 14),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final f in const [
              (value: 'ACTIVE', label: 'Needs work'),
              (value: null, label: 'All'),
              (value: 'RESOLVED', label: 'Resolved'),
              (value: 'CLOSED', label: 'Closed'),
            ])
              QuykFilterChip(label: f.label, selected: _status == f.value, onTap: () => setState(() => _status = f.value)),
          ],
        ),
        const SizedBox(height: 16),
        async.when(
          loading: () => const QuykLoadingBlock(),
          error: (e, _) => QuykMessageCard(
            icon: Icons.cloud_off_rounded,
            title: 'We couldn’t load support requests',
            subtitle: apiExceptionMessage(e),
            actionLabel: 'Try again',
            onAction: () => ref.invalidate(supportTicketsProvider),
          ),
          data: (tickets) {
            final shown = tickets.where(_matches).toList();
            if (shown.isEmpty) {
              return QuykMessageCard(
                icon: Icons.support_agent_outlined,
                title: _query.isNotEmpty
                    ? 'No requests match “$_query”'
                    : _status == 'ACTIVE'
                        ? 'Nothing waiting on you'
                        : 'No requests here',
                subtitle: _query.isNotEmpty ? 'Try a different search.' : 'New support requests show up here.',
              );
            }
            return QuykTable(
              columns: const [
                QuykColumn('Request', flex: 5),
                QuykColumn('Business', flex: 3),
                QuykColumn('Priority', flex: 2),
                QuykColumn('Opened', flex: 2),
                QuykColumn('Status', flex: 2),
                QuykColumn('', flex: 1, alignEnd: true),
              ],
              rows: [
                for (final t in shown)
                  [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        QuykCellText(t.subject, strong: true),
                        if (t.assignedToName != null)
                          Text(
                            'Assigned to ${t.assignedToName}',
                            style: const TextStyle(fontSize: 12, color: QuykColors.subtle),
                          ),
                      ],
                    ),
                    QuykCellText(t.businessName ?? 'Platform'),
                    ticketPriorityPill(t.priority),
                    QuykCellText(formatDate(t.createdAt)),
                    ticketStatusPill(t.status),
                    PopupMenuButton<String>(
                      tooltip: 'Update request',
                      icon: const Icon(Icons.more_horiz_rounded, color: QuykColors.muted),
                      onSelected: (v) => _update(t, v),
                      itemBuilder: (_) => [
                        for (final s in ticketStatuses)
                          CheckedPopupMenuItem(
                            value: 'status:${s.value}',
                            checked: t.status.toUpperCase() == s.value,
                            child: Text('Mark ${s.label.toLowerCase()}'),
                          ),
                        const PopupMenuDivider(),
                        for (final p in ticketPriorities)
                          CheckedPopupMenuItem(
                            value: 'priority:${p.value}',
                            checked: t.priority.toUpperCase() == p.value,
                            child: Text('${p.label} priority'),
                          ),
                      ],
                    ),
                  ],
              ],
            );
          },
        ),
      ],
    );
  }

  Future<void> _update(SupportTicket t, String action) async {
    final [field, value] = action.split(':');
    final done = await runWithFeedback(
      context,
      () => ref.read(platformApiClientProvider).updateSupportTicket(t.id, {field: value}),
      success: field == 'status'
          ? '“${t.subject}” marked ${_label(ticketStatuses, value).toLowerCase()}'
          : 'Priority set to ${_label(ticketPriorities, value).toLowerCase()}',
      failure: 'Couldn’t update the request',
    );
    if (done) ref.invalidate(supportTicketsProvider);
  }

  Future<void> _create() async {
    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => const _NewTicketSheet(),
    );
    if (created == true) ref.invalidate(supportTicketsProvider);
  }
}

class _NewTicketSheet extends ConsumerStatefulWidget {
  const _NewTicketSheet();

  @override
  ConsumerState<_NewTicketSheet> createState() => _NewTicketSheetState();
}

class _NewTicketSheetState extends ConsumerState<_NewTicketSheet> {
  final _subject = TextEditingController();
  final _details = TextEditingController();
  String _priority = 'MEDIUM';
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _subject.dispose();
    _details.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_subject.text.trim().isEmpty || _details.text.trim().isEmpty) {
      setState(() => _error = 'Add a subject and describe the problem.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ref.read(platformApiClientProvider).createSupportTicket({
        'subject': _subject.text.trim(),
        'description': _details.text.trim(),
        'priority': _priority,
      });
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) setState(() => _error = apiExceptionMessage(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(24, 0, 24, 24 + MediaQuery.viewInsetsOf(context).bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'New support ticket',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w600, color: QuykColors.green),
          ),
          const SizedBox(height: 20),
          TextField(controller: _subject, autofocus: true, decoration: const InputDecoration(labelText: 'Subject')),
          const SizedBox(height: 14),
          TextField(
            controller: _details,
            maxLines: 4,
            decoration: const InputDecoration(labelText: 'What’s going on?', alignLabelWithHint: true),
          ),
          const SizedBox(height: 14),
          SegmentedButton<String>(
            segments: [for (final p in ticketPriorities) ButtonSegment(value: p.value, label: Text(p.label))],
            selected: {_priority},
            showSelectedIcon: false,
            onSelectionChanged: (s) => setState(() => _priority = s.first),
          ),
          if (_error != null) ...[
            const SizedBox(height: 14),
            QuykAuthError(_error!),
          ],
          const SizedBox(height: 20),
          QuykAuthButton(label: 'Create ticket', loading: _saving, onPressed: _save),
        ],
      ),
    );
  }
}
