import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../../core/models/customer_model.dart';
import '../../../shared/widgets/quyk/quyk_widgets.dart';
import '../../../theme/quyk_staff_theme.dart';

/// Guests tab filter (Figma: All · Waiting · Called).
enum GuestFilter { all, waiting, called }

List<CustomerModel> applyGuestFilter(List<CustomerModel> guests, GuestFilter filter) {
  return switch (filter) {
    GuestFilter.all => guests,
    GuestFilter.waiting =>
      guests.where((g) => (g.activeStatus ?? '').toUpperCase() == 'WAITING').toList(),
    GuestFilter.called =>
      guests.where((g) => (g.activeStatus ?? '').toUpperCase() == 'CALLED').toList(),
  };
}

/// Presentational Guests page (Figma "Quyk Redesign Staff", Guests).
class GuestsView extends StatelessWidget {
  const GuestsView({
    super.key,
    required this.searchController,
    required this.onSearch,
    required this.filter,
    required this.onFilter,
    required this.guests,
    this.loading = false,
    this.errorMessage,
    this.onRetry,
    this.onOpenGuest,
    this.query = '',
  });

  final TextEditingController searchController;
  final VoidCallback onSearch;
  final GuestFilter filter;
  final ValueChanged<GuestFilter> onFilter;

  /// Unfiltered results; [filter] is applied here.
  final List<CustomerModel> guests;
  final bool loading;
  final String? errorMessage;
  final VoidCallback? onRetry;
  final ValueChanged<CustomerModel>? onOpenGuest;
  final String query;

  @override
  Widget build(BuildContext context) {
    final compact = MediaQuery.sizeOf(context).width < 720;
    final visible = applyGuestFilter(guests, filter);
    return ListView(
      padding: EdgeInsets.fromLTRB(compact ? 16 : 32, 8, compact ? 16 : 32, 32),
      children: [
        QuykPageHeading(
          title: 'Guests',
          subtitle: query.isEmpty
              ? 'People waiting or called right now. Search past visits by name, phone or ticket number.'
              : 'Results for “$query”',
        ),
        const SizedBox(height: 18),
        _SearchBar(controller: searchController, onSearch: onSearch),
        const SizedBox(height: 14),
        Wrap(
          spacing: 8,
          children: [
            for (final f in GuestFilter.values)
              QuykFilterChip(
                label: switch (f) {
                  GuestFilter.all => 'All',
                  GuestFilter.waiting => 'Waiting',
                  GuestFilter.called => 'Called',
                },
                selected: f == filter,
                onTap: () => onFilter(f),
              ),
          ],
        ),
        const SizedBox(height: 16),
        if (loading)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 48),
            child: Center(child: CircularProgressIndicator()),
          )
        else if (errorMessage != null)
          _Message(
            icon: Icons.cloud_off_rounded,
            title: errorMessage!,
            actionLabel: onRetry == null ? null : 'Try again',
            onAction: onRetry,
          )
        else if (visible.isEmpty)
          _Message(
            icon: Icons.person_search_outlined,
            title: query.isEmpty ? 'No guests in line' : 'No matches',
            subtitle: query.isEmpty
                ? 'When someone joins the queue, they will show up here.'
                : 'Try another name, phone number, or ticket code.',
          )
        else if (compact)
          Column(
            children: [
              for (final g in visible) ...[
                _GuestCardCompact(guest: g, onTap: () => onOpenGuest?.call(g)),
                const SizedBox(height: 10),
              ],
            ],
          )
        else
          QuykTable(
            columns: const [
              QuykColumn('Guest', flex: 5),
              QuykColumn('Ticket', flex: 2),
              QuykColumn('Phone', flex: 3),
              QuykColumn('Line', flex: 4),
              QuykColumn('Visit date', flex: 3),
              QuykColumn('Status', flex: 3, alignEnd: true),
            ],
            onRowTap: onOpenGuest == null ? null : (i) => onOpenGuest!(visible[i]),
            rows: [
              for (var i = 0; i < visible.length; i++)
                [
                  Row(
                    children: [
                      QuykAvatar(name: _name(visible[i]), size: 42, lime: i == 0),
                      const SizedBox(width: 12),
                      Flexible(child: QuykCellText(_name(visible[i]), strong: true)),
                    ],
                  ),
                  QuykCellText(visible[i].displayCode ?? '—', strong: true, green: true),
                  QuykCellText(visible[i].phone),
                  QuykCellText(visible[i].queueName ?? '—'),
                  QuykCellText(_date(visible[i].visitedAt)),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if ((visible[i].activeStatus ?? '').isNotEmpty)
                        QuykStatusPill(status: visible[i].activeStatus!),
                      const SizedBox(width: 6),
                      const Icon(Icons.chevron_right_rounded, size: 18, color: QuykColors.subtle),
                    ],
                  ),
                ],
            ],
          ),
      ],
    );
  }
}

String _name(CustomerModel g) => g.fullName.isEmpty ? 'Guest' : g.fullName;

String _date(DateTime? at) => at == null ? '—' : DateFormat.yMMMd().format(at.toLocal());

class _SearchBar extends StatelessWidget {
  const _SearchBar({required this.controller, required this.onSearch});

  final TextEditingController controller;
  final VoidCallback onSearch;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 6, 6, 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: QuykColors.line),
      ),
      child: Row(
        children: [
          const Icon(Icons.search_rounded, color: QuykColors.muted),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              controller: controller,
              textInputAction: TextInputAction.search,
              onSubmitted: (_) => onSearch(),
              style: const TextStyle(fontSize: 15, color: QuykColors.ink),
              decoration: const InputDecoration(
                hintText: 'Search name, phone or ticket #',
                filled: false,
                isDense: true,
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
              ),
            ),
          ),
          SizedBox(
            height: 44,
            child: FilledButton(
              onPressed: onSearch,
              style: FilledButton.styleFrom(
                minimumSize: const Size(110, 44),
                textStyle: const TextStyle(fontFamily: quykFontFamily, fontSize: 14, fontWeight: FontWeight.w700),
              ),
              child: const Text('Search'),
            ),
          ),
        ],
      ),
    );
  }
}

class _GuestCardCompact extends StatelessWidget {
  const _GuestCardCompact({required this.guest, required this.onTap});

  final CustomerModel guest;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final subtitle = [
      if (guest.displayCode != null && guest.displayCode!.isNotEmpty) guest.displayCode!,
      guest.phone,
      if (guest.queueName != null && guest.queueName!.isNotEmpty) guest.queueName!,
    ].where((s) => s.isNotEmpty).join(' · ');
    return QuykCard(
      onTap: onTap,
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          QuykAvatar(name: _name(guest), size: 40),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                QuykCellText(_name(guest), strong: true),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12, color: QuykColors.subtle),
                ),
              ],
            ),
          ),
          if ((guest.activeStatus ?? '').isNotEmpty) QuykStatusPill(status: guest.activeStatus!),
          const Icon(Icons.chevron_right_rounded, color: QuykColors.subtle),
        ],
      ),
    );
  }
}

class _Message extends StatelessWidget {
  const _Message({
    required this.icon,
    required this.title,
    this.subtitle,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;

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
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: QuykColors.ink,
            ),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 4),
            Text(
              subtitle!,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: QuykColors.muted),
            ),
          ],
          if (actionLabel != null) ...[
            const SizedBox(height: 14),
            OutlinedButton(onPressed: onAction, child: Text(actionLabel!)),
          ],
        ],
      ),
    );
  }
}
