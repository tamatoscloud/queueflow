import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/presentation/auth_controller.dart';
import '../models/branch_model.dart';
import '../network/business_api_client.dart';

final branchesProvider = FutureProvider.autoDispose<List<BranchModel>>((ref) async {
  final api = ref.watch(businessApiClientProvider);
  final user = ref.watch(currentUserProvider);
  return api.getBranches(businessId: user?.businessId);
});
