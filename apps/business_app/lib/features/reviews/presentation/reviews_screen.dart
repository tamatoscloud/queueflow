import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../../core/models/models.dart';
import '../../../core/network/business_api_client.dart';
import '../../../core/session/session_providers.dart';
import 'reviews_view.dart';

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
      color: QuykColors.green,
      backgroundColor: Colors.white,
      onRefresh: () async {
        ref.invalidate(reviewsProvider(_ratingFilter));
        await ref.read(reviewsProvider(_ratingFilter).future);
      },
      child: ReviewsView(
        ratingFilter: _ratingFilter,
        onFilter: (r) => setState(() => _ratingFilter = r),
        reviews: async.valueOrNull ?? const <FeedbackModel>[],
        loading: async.isLoading && !async.hasValue,
        errorMessage: async.hasError && !async.hasValue
            ? "We couldn't load reviews. Pull to retry."
            : null,
        onRetry: () => ref.invalidate(reviewsProvider(_ratingFilter)),
      ),
    );
  }
}
