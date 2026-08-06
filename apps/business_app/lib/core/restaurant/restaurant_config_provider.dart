import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../network/business_api_client.dart';
import 'service_mode.dart';

final restaurantConfigProvider = FutureProvider.autoDispose<RestaurantConfig>((ref) async {
  return ref.watch(businessApiClientProvider).getRestaurantConfig();
});
