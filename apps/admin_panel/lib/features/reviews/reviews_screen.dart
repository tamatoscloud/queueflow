import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../core/models/feedback_model.dart';
import '../../core/network/api_error_message.dart';
import '../../core/network/platform_api_client.dart';
import 'reviews_view.dart';

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
    return RefreshIndicator(
      color: QuykColors.green,
      backgroundColor: Colors.white,
      onRefresh: () async {
        ref.invalidate(adminReviewsProvider(_ratingFilter));
        await ref.read(adminReviewsProvider(_ratingFilter).future);
      },
      child: ReviewsView(
        ratingFilter: _ratingFilter,
        onFilter: (r) => setState(() => _ratingFilter = r),
        reviews: async.valueOrNull ?? const <FeedbackModel>[],
        loading: async.isLoading && !async.hasValue,
        errorMessage: async.hasError && !async.hasValue
            ? 'We couldn’t load reviews — ${apiExceptionMessage(async.error!)}'
            : null,
        onRetry: () => ref.invalidate(adminReviewsProvider(_ratingFilter)),
      ),
    );
  }
}
