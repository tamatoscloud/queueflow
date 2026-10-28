// Renders the Quyk admin screens with fixture data for visual review.
// Not part of the regular suite (outside test/).
//   flutter test test_preview --update-goldens
import 'dart:io';

import 'package:admin_panel/core/models/platform_models.dart';
import 'package:admin_panel/features/analytics/analytics_screen.dart';
import 'package:admin_panel/features/auth/data/auth_user.dart';
import 'package:admin_panel/features/auth/presentation/auth_controller.dart';
import 'package:admin_panel/features/dashboard/dashboard_screen.dart';
import 'package:admin_panel/features/health/health_screen.dart';
import 'package:admin_panel/features/notifications/notifications_screen.dart';
import 'package:admin_panel/features/shell/admin_shell.dart';
import 'package:admin_panel/features/subscriptions/subscriptions_screen.dart';
import 'package:admin_panel/features/support/support_screen.dart';
import 'package:admin_panel/features/tenants/tenants_screen.dart';
import 'package:admin_panel/features/users/users_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_models/queueflow_models.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

Future<void> _loadFonts() async {
  TestWidgetsFlutterBinding.ensureInitialized();
  final hanken = FontLoader('HankenGrotesk');
  for (final w in ['Regular', 'Medium', 'SemiBold', 'Bold']) {
    hanken.addFont(rootBundle.load('assets/fonts/HankenGrotesk-$w.ttf'));
  }
  await hanken.load();
  final root = Platform.environment['FLUTTER_ROOT'];
  if (root != null) {
    final icons = File('$root/bin/cache/artifacts/material_fonts/MaterialIcons-Regular.otf');
    if (icons.existsSync()) {
      final bytes = icons.readAsBytesSync();
      await (FontLoader('MaterialIcons')..addFont(Future.value(ByteData.view(bytes.buffer)))).load();
    }
  }
}

const _admin = AuthUser(id: 'a1', email: 'ops@queueflow.app', fullName: 'Asad Ali', isPlatformAdmin: true);

final _health = <String, dynamic>{
  'api': {'status': 'up'},
  'database': {'status': 'up', 'latencyMs': 4},
  'redis': {'status': 'disabled'},
  'socketIo': {'status': 'up', 'clients': 12},
  'notificationQueue': {'status': 'degraded', 'failedLastHour': 6},
};

final _now = DateTime.now().toUtc();
String _ago(int days) => _now.subtract(Duration(days: days)).toIso8601String();

final _businesses = [
  BusinessSummary(id: 'b1', name: 'Bella Vista', slug: 'bella-vista', status: 'ACTIVE', email: 'hello@bellavista.example.com', createdAt: _ago(120)),
  BusinessSummary(id: 'b2', name: 'Karachi Grill House', slug: 'karachi-grill', status: 'TRIAL', email: 'owner@kgh.example.com', createdAt: _ago(9)),
  BusinessSummary(id: 'b3', name: 'Chai Point Gulberg', slug: 'chai-point', status: 'SUSPENDED', email: 'admin@chaipoint.example.com', createdAt: _ago(60)),
  BusinessSummary(id: 'b4', name: 'Sushi Lab', slug: 'sushi-lab', status: 'ACTIVE', createdAt: _ago(33)),
];

List<Override> _overrides() => [
      currentUserProvider.overrideWithValue(_admin),
      systemHealthProvider.overrideWith((ref) async => _health),
      dashboardProvider.overrideWith(
        (ref) async => PlatformDashboard(
          kpis: const PlatformKpis(
            businesses: 42,
            activeBranches: 67,
            activeQueues: 23,
            customersServedToday: 1840,
            notificationsSent: 5120,
            failedNotifications: 6,
          ),
          systemHealth: _health,
          generatedAt: _now.toIso8601String(),
        ),
      ),
      tenantsProvider.overrideWith(
        (ref, args) async => PaginatedResponse<BusinessSummary>(
          items: _businesses,
          page: 1,
          pageSize: 20,
          totalItems: 42,
          totalPages: 3,
        ),
      ),
      tenantDetailProvider.overrideWith(
        (ref, id) async => (
          business: _businesses.first,
          branches: const [
            BranchSummary(id: 'br1', name: 'Bella Vista Downtown', status: 'ACTIVE', code: 'BVD', city: 'Lahore', queueCount: 4, staffCount: 9),
            BranchSummary(id: 'br2', name: 'Bella Vista Gulberg', status: 'ACTIVE', code: 'BVG', city: 'Lahore', queueCount: 2, staffCount: 5),
          ],
        ),
      ),
      usersProvider.overrideWith(
        (ref, args) async => PaginatedResponse<PlatformUser>(
          items: [
            PlatformUser(id: 'a1', email: 'ops@queueflow.app', fullName: 'Asad Ali', status: 'ACTIVE', roles: const ['PLATFORM_ADMIN'], isPlatformAdmin: true, lastLoginAt: _ago(0)),
            PlatformUser(id: 'u1', email: 'owner@bellavista.example.com', fullName: 'Marco Bellini', status: 'ACTIVE', businessName: 'Bella Vista', roles: const ['OWNER'], lastLoginAt: _ago(1)),
            PlatformUser(id: 'u2', email: 'manager.dt@bellavista.example.com', fullName: 'Ayesha Malik', status: 'ACTIVE', businessName: 'Bella Vista', roles: const ['MANAGER'], lastLoginAt: _ago(2)),
            const PlatformUser(id: 'u3', email: 'host@chaipoint.example.com', fullName: 'Bilal Ahmed', status: 'SUSPENDED', businessName: 'Chai Point Gulberg', roles: ['RECEPTIONIST']),
          ],
          page: 1,
          pageSize: 20,
          totalItems: 4,
          totalPages: 1,
        ),
      ),
      supportTicketsProvider.overrideWith(
        (ref) async => [
          SupportTicket(id: 't1', subject: 'Guests not getting WhatsApp alerts', status: 'OPEN', priority: 'URGENT', businessName: 'Bella Vista', createdAt: _ago(0)),
          SupportTicket(id: 't2', subject: 'Add a second location', status: 'IN_PROGRESS', priority: 'MEDIUM', businessName: 'Karachi Grill House', assignedToName: 'Asad Ali', createdAt: _ago(2)),
          SupportTicket(id: 't3', subject: 'Printing guest join codes', status: 'OPEN', priority: 'LOW', businessName: 'Sushi Lab', createdAt: _ago(3)),
        ],
      ),
      notificationDashboardProvider.overrideWith(
        (ref) async => (
          stats: <String, dynamic>{
            'byStatus': [
              {'status': 'DELIVERED', '_count': {'_all': 4890}},
              {'status': 'SENT', '_count': {'_all': 210}},
              {'status': 'FAILED', '_count': {'_all': 6}},
              {'status': 'PENDING', '_count': {'_all': 14}},
            ],
          },
          failed: [
            for (var i = 0; i < 4; i++)
              <String, dynamic>{
                'id': 'n$i',
                'type': ['YOUR_TURN', 'QUEUE_JOINED', 'FEEDBACK_REQUEST', 'YOUR_TURN'][i],
                'channel': i == 2 ? 'SMS' : 'WHATSAPP',
                'updatedAt': _now.subtract(Duration(minutes: 9 * (i + 1))).toIso8601String(),
                'business': {'name': ['Bella Vista', 'Bella Vista', 'Sushi Lab', 'Karachi Grill House'][i]},
              },
          ],
        ),
      ),
      subscriptionsProvider.overrideWith(
        (ref) async => (
          subscriptions: [
            SubscriptionSummary(id: 's1', status: 'ACTIVE', businessName: 'Bella Vista', planName: 'Growth', currentPeriodEnd: _ago(-20)),
            SubscriptionSummary(id: 's2', status: 'TRIALING', businessName: 'Karachi Grill House', planName: 'Starter', trialEndsAt: _ago(-5)),
            SubscriptionSummary(id: 's3', status: 'PAST_DUE', businessName: 'Chai Point Gulberg', planName: 'Starter', currentPeriodEnd: _ago(4)),
          ],
          plans: <Map<String, dynamic>>[
            {'name': 'Starter', 'code': 'STARTER'},
            {'name': 'Growth', 'code': 'GROWTH'},
            {'name': 'Enterprise', 'code': 'ENTERPRISE'},
          ],
        ),
      ),
      analyticsProvider.overrideWith(
        (ref, days) async => PlatformAnalytics(
          businessGrowth: 7,
          averageWaitMinutes: 11.4,
          dailyCustomers: const [
            {'status': 'COMPLETED', '_count': {'_all': 38210}},
            {'status': 'NO_SHOW', '_count': {'_all': 2104}},
            {'status': 'CANCELLED', '_count': {'_all': 1830}},
          ],
          notificationSuccess: const [
            {'status': 'DELIVERED', 'channel': 'WHATSAPP', '_count': {'_all': 51200}},
            {'status': 'FAILED', 'channel': 'WHATSAPP', '_count': {'_all': 310}},
            {'status': 'DELIVERED', 'channel': 'SMS', '_count': {'_all': 9100}},
          ],
        ),
      ),
    ];

Future<void> _render(
  WidgetTester tester, {
  required String name,
  required String path,
  required Widget page,
  Size size = const Size(1440, 1024),
}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  final router = GoRouter(
    initialLocation: path,
    routes: [
      ShellRoute(
        builder: (context, state, child) => AdminShell(child: child),
        routes: [GoRoute(path: path, builder: (_, __) => page)],
      ),
    ],
  );
  addTearDown(router.dispose);
  await tester.pumpWidget(
    ProviderScope(
      overrides: _overrides(),
      child: MaterialApp.router(
        debugShowCheckedModeBanner: false,
        theme: buildQuykTheme(identity: ProductIdentity.platformAdmin),
        routerConfig: router,
      ),
    ),
  );
  await tester.runAsync(() async {
    for (final element in find.byType(Image).evaluate()) {
      await precacheImage((element.widget as Image).image, element);
    }
  });
  await tester.pumpAndSettle();
  await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/$name.png'));
}

void main() {
  setUpAll(_loadFonts);

  testWidgets('overview', (t) => _render(t, name: 'overview', path: '/dashboard', page: const DashboardScreen()));
  testWidgets(
    'overview phone',
    (t) => _render(t, name: 'overview_phone', path: '/dashboard', page: const DashboardScreen(), size: const Size(390, 844)),
  );
  testWidgets('businesses', (t) => _render(t, name: 'businesses', path: '/tenants', page: const TenantsScreen()));
  testWidgets(
    'business detail',
    (t) => _render(t, name: 'business_detail', path: '/tenants/b1', page: const TenantDetailScreen(businessId: 'b1')),
  );
  testWidgets('users', (t) => _render(t, name: 'users', path: '/users', page: const UsersScreen()));
  testWidgets('support', (t) => _render(t, name: 'support', path: '/support', page: const SupportScreen()));
  testWidgets('alerts', (t) => _render(t, name: 'alerts', path: '/notifications', page: const NotificationsScreen()));
  testWidgets('plans', (t) => _render(t, name: 'plans', path: '/subscriptions', page: const SubscriptionsScreen()));
  testWidgets('analytics', (t) => _render(t, name: 'analytics', path: '/analytics', page: const AnalyticsScreen()));
  testWidgets('health', (t) => _render(t, name: 'health', path: '/health', page: const HealthScreen()));
}
