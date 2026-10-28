import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../../../core/models/notification_model.dart';

/// "Your turn", "Queue joined", … for a notification type.
String guestMessageEventLabel(String type) {
  return switch (type.toUpperCase()) {
    'QUEUE_JOINED' => 'Queue joined',
    'POSITION_UPDATE' => 'Position update',
    'ALMOST_YOUR_TURN' => 'Almost your turn',
    'YOUR_TURN' => 'Your turn',
    'QUEUE_CANCELLED' => 'Visit cancelled',
    'QUEUE_PAUSED' => 'Queue paused',
    'QUEUE_RESUMED' => 'Queue resumed',
    'QUEUE_CLOSED' => 'Queue closed',
    'FEEDBACK_REQUEST' => 'Feedback request',
    'CUSTOM' => 'Custom message',
    final other when other.isEmpty => 'Guest update',
    final other => other[0] + other.substring(1).toLowerCase().replaceAll('_', ' '),
  };
}

String guestMessageChannelLabel(String? channel) {
  return switch ((channel ?? '').toUpperCase()) {
    'WHATSAPP' => 'WhatsApp',
    'SMS' => 'SMS',
    'EMAIL' => 'Email',
    '' => '—',
    final other => other[0] + other.substring(1).toLowerCase(),
  };
}

enum GuestMessageGroup { failed, pending, delivered }

GuestMessageGroup guestMessageGroup(NotificationModel n) {
  return switch (n.status.toUpperCase()) {
    'FAILED' || 'CANCELLED' => GuestMessageGroup.failed,
    'SENT' || 'DELIVERED' => GuestMessageGroup.delivered,
    _ => GuestMessageGroup.pending,
  };
}

/// Presentational Guest messages page (Figma "Quyk Redesign Staff", Alerts).
class GuestMessagesView extends StatelessWidget {
  const GuestMessagesView({
    super.key,
    required this.items,
    this.loading = false,
    this.errorMessage,
    this.onRetry,
    this.onViewQueue,
    this.scrollController,
    this.showProviderNotice = true,
  });

  final List<NotificationModel> items;
  final bool loading;
  final String? errorMessage;
  final VoidCallback? onRetry;
  final ValueChanged<NotificationModel>? onViewQueue;
  final ScrollController? scrollController;

  /// WhatsApp/SMS providers aren't wired up yet; shown when anything failed.
  final bool showProviderNotice;

  @override
  Widget build(BuildContext context) {
    final compact = MediaQuery.sizeOf(context).width < 720;
    final groups = {for (final g in GuestMessageGroup.values) g: <NotificationModel>[]};
    for (final n in items) {
      groups[guestMessageGroup(n)]!.add(n);
    }
    final failed = groups[GuestMessageGroup.failed]!;

    return ListView(
      controller: scrollController,
      padding: EdgeInsets.fromLTRB(compact ? 16 : 32, 8, compact ? 16 : 32, 32),
      children: [
        const QuykPageHeading(
          title: 'Guest messages',
          subtitle: 'Delivery history for guest alerts — not staff push alerts.',
        ),
        const SizedBox(height: 16),
        if (loading)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 48),
            child: Center(child: CircularProgressIndicator()),
          )
        else if (errorMessage != null)
          _EmptyCard(
            icon: Icons.cloud_off_rounded,
            title: errorMessage!,
            onRetry: onRetry,
          )
        else if (items.isEmpty)
          const _EmptyCard(
            icon: Icons.sms_outlined,
            title: 'No messages yet',
            subtitle: 'SMS and WhatsApp alerts to guests will show up here.',
          )
        else ...[
          if (showProviderNotice && failed.isNotEmpty) ...[
            const _ProviderNotice(),
            const SizedBox(height: 20),
          ],
          for (final g in GuestMessageGroup.values)
            if (groups[g]!.isNotEmpty) ...[
              _SectionLabel(group: g, count: groups[g]!.length),
              const SizedBox(height: 12),
              _MessagesTable(items: groups[g]!, compact: compact, onViewQueue: onViewQueue),
              const SizedBox(height: 24),
            ],
        ],
      ],
    );
  }
}

class _ProviderNotice extends StatelessWidget {
  const _ProviderNotice();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      decoration: BoxDecoration(
        color: QuykColors.warningTint,
        borderRadius: BorderRadius.circular(18),
      ),
      child: const Row(
        children: [
          QuykIconBubble(
            icon: Icons.info_outline_rounded,
            background: QuykColors.warning,
            foreground: QuykColors.ink,
            size: 34,
          ),
          SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "WhatsApp and SMS sending isn't connected yet",
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: QuykColors.ink),
                ),
                SizedBox(height: 2),
                Text(
                  'Alerts are logged here and show as failed. Guests still see live updates on their tracking page.',
                  style: TextStyle(fontSize: 12.5, color: QuykColors.muted),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel({required this.group, required this.count});

  final GuestMessageGroup group;
  final int count;

  @override
  Widget build(BuildContext context) {
    final (String label, Color bg, Color fg) = switch (group) {
      GuestMessageGroup.failed => ('Failed delivery', QuykColors.dangerTint, QuykColors.danger),
      GuestMessageGroup.pending => ('Pending', QuykColors.mist, QuykColors.greenMuted),
      GuestMessageGroup.delivered => ('Sent', QuykColors.limeSoft, QuykColors.green),
    };
    return Row(
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: QuykColors.ink),
        ),
        const SizedBox(width: 10),
        QuykPill(label: '$count', background: bg, foreground: fg, fontSize: 11),
      ],
    );
  }
}

class _MessagesTable extends StatelessWidget {
  const _MessagesTable({required this.items, required this.compact, this.onViewQueue});

  final List<NotificationModel> items;
  final bool compact;
  final ValueChanged<NotificationModel>? onViewQueue;

  @override
  Widget build(BuildContext context) {
    if (compact) {
      return Column(
        children: [
          for (final n in items) ...[
            QuykCard(
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        QuykCellText(
                          '${n.displayCode ?? '—'} · ${guestMessageEventLabel(n.type)}',
                          strong: true,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          [
                            if (n.queueName != null) n.queueName!,
                            guestMessageChannelLabel(n.channel),
                            if (n.recipientPhone != null) n.recipientPhone!,
                          ].join(' · '),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 12, color: QuykColors.subtle),
                        ),
                      ],
                    ),
                  ),
                  QuykStatusPill(status: n.status),
                ],
              ),
            ),
            const SizedBox(height: 10),
          ],
        ],
      );
    }
    return QuykTable(
      columns: const [
        QuykColumn('Ticket', flex: 2),
        QuykColumn('Event', flex: 3),
        QuykColumn('Line', flex: 4),
        QuykColumn('Channel', flex: 2),
        QuykColumn('Phone', flex: 3),
        QuykColumn('Status', flex: 4, alignEnd: true),
      ],
      rows: [
        for (final n in items)
          [
            QuykCellText(n.displayCode ?? '—', strong: true, green: true),
            QuykCellText(guestMessageEventLabel(n.type)),
            QuykCellText(n.queueName ?? '—'),
            QuykCellText(guestMessageChannelLabel(n.channel)),
            QuykCellText(n.recipientPhone ?? '—'),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                QuykStatusPill(status: n.status),
                if (onViewQueue != null) ...[
                  const SizedBox(width: 8),
                  OutlinedButton(
                    onPressed: () => onViewQueue!(n),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(0, 34),
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      foregroundColor: QuykColors.green,
                      side: const BorderSide(color: QuykColors.field),
                      shape: const StadiumBorder(),
                      textStyle: const TextStyle(fontFamily: quykFontFamily, fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                    child: const Text('View queue'),
                  ),
                ],
              ],
            ),
          ],
      ],
    );
  }
}

class _EmptyCard extends StatelessWidget {
  const _EmptyCard({required this.icon, required this.title, this.subtitle, this.onRetry});

  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return QuykCard(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 36),
      child: Column(
        children: [
          QuykIconBubble(icon: icon, size: 48),
          const SizedBox(height: 12),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: QuykColors.ink),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 4),
            Text(
              subtitle!,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: QuykColors.muted),
            ),
          ],
          if (onRetry != null) ...[
            const SizedBox(height: 14),
            OutlinedButton(onPressed: onRetry, child: const Text('Try again')),
          ],
        ],
      ),
    );
  }
}
