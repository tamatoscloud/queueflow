import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/presentation/auth_controller.dart';
import '../models/queue_model.dart';
import '../network/business_api_client.dart';
import '../session/session_providers.dart';

final queuesProvider = FutureProvider.autoDispose<List<QueueModel>>((ref) async {
  final api = ref.watch(businessApiClientProvider);
  final user = ref.watch(currentUserProvider);
  final branchId = ref.watch(selectedBranchIdProvider);
  return api.getQueues(branchId: branchId, businessId: user?.businessId);
});
