import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/presentation/auth_controller.dart';

final sessionInitProvider = FutureProvider<void>((ref) async {
  await ref.read(authControllerProvider.notifier).bootstrap();
});
