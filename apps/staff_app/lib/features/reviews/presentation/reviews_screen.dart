import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';
import 'package:queueflow_widgets/queueflow_widgets.dart';

import '../../../core/models/models.dart';
import '../../../core/network/business_api_client.dart';
import '../../../core/session/session_providers.dart';

final reviewsProvider = FutureProvider.autoDispose.family<List<FeedbackModel>, int?>((ref, rating) async {
  final api = ref.watch(businessApiClientProvider);
  final branchId = ref.watch(selectedBranchIdProvider);
  return api.getFeedback(rating: rating, branchId: branchId);
});

class ReviewsScreen extends ConsumerStatefulWidget {
  const ReviewsScreen({super.key});

  @override
  ConsumerState<ReviewsScreen> createState() => _ReviewsScreenState();
}

class _ReviewsScreenState extends ConsumerState<ReviewsScreen> {
  int? _ratingFilter;

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(reviewsProvider(_ratingFilter));

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(reviewsProvider(_ratingFilter));
        await ref.read(reviewsProvider(_ratingFilter).future);
      },
      child: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          Text(
            'Reviews',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 4),
          Text(
            'Guest ratings after their visit',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.neutral500),
          ),
          const SizedBox(height: AppSpacing.md),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _FilterChip(
                  label: 'All',
                  selected: _ratingFilter == null,
                  onTap: () => setState(() => _ratingFilter = null),
                ),
                for (var i = 5; i >= 1; i--)
                  Padding(
                    padding: const EdgeInsets.only(left: 8),
                    child: _FilterChip(
                      label: '$i ★',
                      selected: _ratingFilter == i,
                      onTap: () => setState(() => _ratingFilter = i),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          async.when(
            loading: () => const Padding(
              padding: EdgeInsets.symmetric(vertical: AppSpacing.xl),
              child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
            ),
            error: (_, __) => PageError(
              message: "We couldn't load reviews. Pull to retry.",
              onRetry: () => ref.invalidate(reviewsProvider(_ratingFilter)),
            ),
            data: (items) {
              if (items.isEmpty) {
                return const EmptyStateView(
                  title: 'No reviews yet',
                  message: 'When guests rate their visit, reviews show up here.',
                  icon: Icons.star_outline,
                );
              }
              return Column(
                children: [
                  for (final item in items) ...[
                    _ReviewCard(item: item),
                    const SizedBox(height: AppSpacing.sm),
                  ],
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({required this.label, required this.selected, required this.onTap});
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onTap(),
      selectedColor: AppColors.primary.withValues(alpha: 0.18),
      checkmarkColor: AppColors.primary,
    );
  }
}

class _ReviewCard extends StatelessWidget {
  const _ReviewCard({required this.item});
  final FeedbackModel item;

  @override
  Widget build(BuildContext context) {
    final when = item.submittedAt != null
        ? DateFormat.yMMMd().add_jm().format(item.submittedAt!.toLocal())
        : null;
    final subtitle = [
      if (item.displayCode != null && item.displayCode!.isNotEmpty) '#${item.displayCode}',
      if (item.customerPhone != null && item.customerPhone!.isNotEmpty) item.customerPhone!,
      if (item.branchName != null && item.branchName!.isNotEmpty) item.branchName!,
    ].join(' · ');

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  item.customerName?.isNotEmpty == true ? item.customerName! : 'Guest',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
              ),
              Row(
                children: [
                  for (var i = 1; i <= 5; i++)
                    Icon(
                      i <= item.rating ? Icons.star : Icons.star_border,
                      size: 18,
                      color: i <= item.rating ? Colors.amber.shade700 : AppColors.neutral400,
                    ),
                ],
              ),
            ],
          ),
          if (subtitle.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
          ],
          if (item.comment != null && item.comment!.trim().isNotEmpty) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(item.comment!, style: Theme.of(context).textTheme.bodyMedium),
          ],
          if (when != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(when, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: AppColors.neutral500)),
          ],
        ],
      ),
    );
  }
}
