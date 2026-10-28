import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

/// "Page 2 of 7 · 134 results" with previous / next buttons.
class AdminPager extends StatelessWidget {
  const AdminPager({
    super.key,
    required this.page,
    required this.totalPages,
    required this.onPage,
    this.totalItems,
  });

  final int page;
  final int totalPages;
  final int? totalItems;
  final ValueChanged<int> onPage;

  @override
  Widget build(BuildContext context) {
    if (totalPages <= 1 && (totalItems ?? 0) <= 0) return const SizedBox.shrink();
    return Row(
      children: [
        Text(
          [
            'Page $page of ${totalPages < 1 ? 1 : totalPages}',
            if (totalItems != null) '$totalItems result${totalItems == 1 ? '' : 's'}',
          ].join(' · '),
          style: const TextStyle(fontSize: 13, color: QuykColors.muted),
        ),
        const Spacer(),
        IconButton.outlined(
          tooltip: 'Previous page',
          onPressed: page > 1 ? () => onPage(page - 1) : null,
          icon: const Icon(Icons.chevron_left_rounded),
        ),
        const SizedBox(width: 8),
        IconButton.outlined(
          tooltip: 'Next page',
          onPressed: page < totalPages ? () => onPage(page + 1) : null,
          icon: const Icon(Icons.chevron_right_rounded),
        ),
      ],
    );
  }
}
