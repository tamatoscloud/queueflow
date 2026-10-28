import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../../core/models/feedback_model.dart';

/// Splits a guest comment into highlight tags and free text.
///
/// The guest portal stores chosen chips as a first line
/// `Highlights: Service, Wait time`, followed by the typed comment.
({List<String> tags, String text}) splitReviewComment(String? raw) {
  final lines = (raw ?? '').trim().split('\n');
  final tags = <String>[];
  final rest = <String>[];
  for (final line in lines) {
    final t = line.trim();
    if (tags.isEmpty && t.toLowerCase().startsWith('highlights:')) {
      tags.addAll(
        t.substring('highlights:'.length).split(',').map((s) => s.trim()).where((s) => s.isNotEmpty),
      );
    } else if (t.isNotEmpty) {
      rest.add(t);
    }
  }
  return (tags: tags, text: rest.join('\n'));
}

/// Presentational Reviews page (Figma "Quyk Redesign Staff", Reviews).
class ReviewsView extends StatelessWidget {
  const ReviewsView({
    super.key,
    required this.ratingFilter,
    required this.onFilter,
    required this.reviews,
    this.loading = false,
    this.errorMessage,
    this.onRetry,
  });

  final int? ratingFilter;
  final ValueChanged<int?> onFilter;
  final List<FeedbackModel> reviews;
  final bool loading;
  final String? errorMessage;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final compact = MediaQuery.sizeOf(context).width < 720;
    return ListView(
      padding: EdgeInsets.fromLTRB(compact ? 16 : 32, 8, compact ? 16 : 32, 32),
      children: [
        const QuykPageHeading(title: 'Reviews', subtitle: 'Guest ratings across every business on Quyk.'),
        const SizedBox(height: 16),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            QuykFilterChip(label: 'All', selected: ratingFilter == null, onTap: () => onFilter(null)),
            for (var i = 5; i >= 1; i--)
              QuykFilterChip(
                label: '$i',
                trailingStar: true,
                selected: ratingFilter == i,
                onTap: () => onFilter(i),
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
          _Notice(
            icon: Icons.cloud_off_rounded,
            title: errorMessage!,
            onRetry: onRetry,
          )
        else if (reviews.isEmpty)
          const _Notice(
            icon: Icons.star_outline_rounded,
            title: 'No reviews yet',
            subtitle: 'When guests rate their visit, reviews show up here.',
          )
        else
          LayoutBuilder(
            builder: (context, constraints) {
              final columns = constraints.maxWidth >= 640 ? 2 : 1;
              final rows = <Widget>[];
              for (var i = 0; i < reviews.length; i += columns) {
                final slice = reviews.skip(i).take(columns).toList();
                rows.add(
                  Padding(
                    padding: const EdgeInsets.only(bottom: 14),
                    child: IntrinsicHeight(
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          for (var c = 0; c < columns; c++) ...[
                            if (c > 0) const SizedBox(width: 14),
                            Expanded(
                              child: c < slice.length
                                  ? ReviewCard(item: slice[c])
                                  : const SizedBox.shrink(),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                );
              }
              return Column(children: rows);
            },
          ),
      ],
    );
  }
}

class ReviewCard extends StatelessWidget {
  const ReviewCard({super.key, required this.item});

  final FeedbackModel item;

  @override
  Widget build(BuildContext context) {
    final name = item.customerName?.trim().isNotEmpty == true ? item.customerName!.trim() : 'Guest';
    final meta = [
      if (item.businessName?.isNotEmpty == true) item.businessName!,
      if (item.branchName?.isNotEmpty == true) item.branchName!,
      if (item.displayCode?.isNotEmpty == true) '#${item.displayCode}',
    ].join(' · ');
    final when = item.submittedAt == null
        ? null
        : '${DateFormat.yMMMd().format(item.submittedAt!.toLocal())} · '
            '${DateFormat.jm().format(item.submittedAt!.toLocal())}';
    final parts = splitReviewComment(item.comment);

    return QuykCard(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
      radius: 22,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              QuykAvatar(name: name, size: 38, initialsCount: 1),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: QuykColors.ink,
                      ),
                    ),
                    if (meta.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(meta, style: const TextStyle(fontSize: 12, color: QuykColors.subtle)),
                    ],
                  ],
                ),
              ),
              _Stars(rating: item.rating),
            ],
          ),
          if (parts.tags.isNotEmpty) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final t in parts.tags)
                  QuykPill(label: t, background: QuykColors.limeSoft, fontSize: 11),
              ],
            ),
          ],
          if (parts.text.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(
              parts.text,
              style: const TextStyle(fontSize: 14, height: 1.4, color: QuykColors.ink),
            ),
          ],
          if (when != null) ...[
            const SizedBox(height: 12),
            Text(when, style: const TextStyle(fontSize: 12, color: QuykColors.subtle)),
          ],
        ],
      ),
    );
  }
}

class _Stars extends StatelessWidget {
  const _Stars({required this.rating});

  final int rating;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: '$rating out of 5 stars',
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var i = 1; i <= 5; i++)
            Icon(
              i <= rating ? Icons.star_rounded : Icons.star_outline_rounded,
              size: 19,
              color: i <= rating ? QuykColors.star : QuykColors.field,
            ),
        ],
      ),
    );
  }
}

class _Notice extends StatelessWidget {
  const _Notice({required this.icon, required this.title, this.subtitle, this.onRetry});

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
