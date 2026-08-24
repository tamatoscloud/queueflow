import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../core/models/feedback_model.dart';
import '../../core/network/api_error_message.dart';
import '../../core/network/platform_api_client.dart';
import '../../shared/widgets/calm/calm_card.dart';
import '../../shared/widgets/calm/calm_empty_state.dart';
import '../../shared/widgets/calm/calm_page_scaffold.dart';
import '../../shared/widgets/calm/calm_section_label.dart';

final adminReviewsProvider =
    FutureProvider.autoDispose.family<List<FeedbackModel>, int?>((ref, rating) async {
  final api = ref.watch(platformApiClientProvider);
  return api.listFeedback(rating: rating);
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
    final async = ref.watch(adminReviewsProvider(_ratingFilter));

    return async.when(
      loading: () => const CalmPageScaffold(
        isLoading: true,
        title: 'Reviews',
        subtitle: 'Guest feedback across all businesses',
      ),
      error: (e, _) => CalmPageScaffold(
        title: 'Reviews',
        subtitle: 'Guest feedback across all businesses',
        errorMessage: apiExceptionMessage(e),
        onRetry: () => ref.invalidate(adminReviewsProvider(_ratingFilter)),
      ),
      data: (items) {
        return CalmPageScaffold(
          title: 'Reviews',
          subtitle: 'Guest feedback across all businesses',
          onRefresh: () async {
            ref.invalidate(adminReviewsProvider(_ratingFilter));
            await ref.read(adminReviewsProvider(_ratingFilter).future);
          },
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    FilterChip(
                      label: const Text('All'),
                      selected: _ratingFilter == null,
                      onSelected: (_) => setState(() => _ratingFilter = null),
                    ),
                    for (var i = 5; i >= 1; i--)
                      Padding(
                        padding: const EdgeInsets.only(left: 8),
                        child: FilterChip(
                          label: Text('$i ★'),
                          selected: _ratingFilter == i,
                          onSelected: (_) => setState(() => _ratingFilter = i),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              const CalmSectionLabel('Submitted reviews'),
              const SizedBox(height: AppSpacing.sm),
              if (items.isEmpty)
                const CalmEmptyState(
                  title: 'No reviews yet',
                  message: 'When guests rate visits, reviews appear here for every tenant.',
                  icon: Icons.star_outline,
                )
              else
                for (final item in items)
                  Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                    child: CalmCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  item.customerName?.isNotEmpty == true
                                      ? item.customerName!
                                      : 'Guest',
                                  style: Theme.of(context)
                                      .textTheme
                                      .titleSmall
                                      ?.copyWith(fontWeight: FontWeight.w700),
                                ),
                              ),
                              Row(
                                children: [
                                  for (var i = 1; i <= 5; i++)
                                    Icon(
                                      i <= item.rating ? Icons.star : Icons.star_border,
                                      size: 16,
                                      color: i <= item.rating
                                          ? Colors.amber.shade700
                                          : AppColors.calmWarmGray,
                                    ),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            [
                              if (item.businessName != null) item.businessName!,
                              if (item.branchName != null) item.branchName!,
                              if (item.displayCode != null && item.displayCode!.isNotEmpty)
                                '#${item.displayCode}',
                            ].join(' · '),
                            style: Theme.of(context)
                                .textTheme
                                .bodySmall
                                ?.copyWith(color: AppColors.calmWarmGray),
                          ),
                          if (item.comment != null && item.comment!.trim().isNotEmpty) ...[
                            const SizedBox(height: AppSpacing.sm),
                            Text(item.comment!),
                          ],
                          if (item.submittedAt != null) ...[
                            const SizedBox(height: AppSpacing.sm),
                            Text(
                              DateFormat.yMMMd().add_jm().format(item.submittedAt!.toLocal()),
                              style: Theme.of(context)
                                  .textTheme
                                  .labelSmall
                                  ?.copyWith(color: AppColors.calmWarmGray),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
            ],
          ),
        );
      },
    );
  }
}
