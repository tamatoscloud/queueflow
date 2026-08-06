import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../../core/persona/user_persona.dart';
import '../../../features/auth/presentation/auth_controller.dart';
import 'app_shell.dart';
import 'staff_shell.dart';

/// Picks Staff vs Owner chrome from JWT roles — no backend changes.
class AppShellResolver extends ConsumerWidget {
  const AppShellResolver({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final persona = personaFromUser(user);
    final identity =
        persona == BusinessPersona.owner ? ProductIdentity.owner : ProductIdentity.staff;
    final product = ProductThemeData.forIdentity(identity);
    final base = Theme.of(context);

    return Theme(
      data: base.copyWith(
        extensions: [
          for (final ext in base.extensions.values)
            if (ext is! ProductTheme) ext,
          ProductTheme(identity: identity),
        ],
        colorScheme: base.colorScheme.copyWith(
          primary: product.accent,
          secondary: product.accent,
        ),
      ),
      child: persona == BusinessPersona.owner
          ? AppShell(child: child)
          : StaffShell(child: child),
    );
  }
}

final businessPersonaProvider = Provider<BusinessPersona>((ref) {
  return personaFromUser(ref.watch(currentUserProvider));
});
