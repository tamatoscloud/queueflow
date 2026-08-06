import '../../features/auth/data/models/auth_user.dart';

/// Client-side persona split — no backend changes.
enum BusinessPersona { staff, owner }

const _managementRoles = {'OWNER', 'MANAGER'};

/// Routes restricted to owner/manager persona.
const ownerOnlyRoutePrefixes = [
  '/branches',
  '/reports',
  '/staff',
  '/restaurant/simulator',
];

/// Settings sub-routes that staff cannot access (queue settings).
bool isOwnerOnlyPath(String path) {
  if (path.contains('/settings') && path.contains('/queues/')) return true;
  for (final prefix in ownerOnlyRoutePrefixes) {
    if (path.startsWith(prefix)) return true;
  }
  if (path.endsWith('/settings') && path.contains('/queues/')) return true;
  final settingsMatch = RegExp(r'^/queues/[^/]+/settings$');
  if (settingsMatch.hasMatch(path)) return true;
  return false;
}

BusinessPersona personaFromUser(AuthUser? user) {
  if (user == null) return BusinessPersona.staff;
  final roles = user.roles.map((r) => r.toUpperCase()).toSet();
  if (roles.intersection(_managementRoles).isNotEmpty) {
    return BusinessPersona.owner;
  }
  return BusinessPersona.staff;
}

String defaultRouteForPersona(BusinessPersona persona) =>
    persona == BusinessPersona.owner ? '/dashboard' : '/today';

bool userCanAccessPath(AuthUser? user, String path) {
  if (user == null) return false;
  if (personaFromUser(user) == BusinessPersona.owner) return true;
  return !isOwnerOnlyPath(path);
}
