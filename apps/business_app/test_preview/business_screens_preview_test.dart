// Renders the Quyk business screens with fixture data so they can be
// reviewed without a backend. Not part of the regular suite (outside test/).
//   flutter test test_preview --update-goldens
import 'dart:async';
import 'dart:io';

import 'package:business_app/core/connectivity/connectivity_provider.dart';
import 'package:business_app/core/models/models.dart';
import 'package:business_app/core/realtime/realtime_client.dart';
import 'package:business_app/core/restaurant/restaurant_config_provider.dart';
import 'package:business_app/core/restaurant/service_mode.dart';
import 'package:business_app/features/auth/data/models/auth_user.dart';
import 'package:business_app/features/auth/presentation/auth_controller.dart';
import 'package:business_app/features/auth/presentation/login_screen.dart';
import 'package:business_app/features/branches/presentation/branches_screen.dart';
import 'package:business_app/features/customers/presentation/customers_screen.dart';
import 'package:business_app/features/dashboard/presentation/dashboard_screen.dart';
import 'package:business_app/features/menu/presentation/menu_screen.dart';
import 'package:business_app/features/queue_console/presentation/queue_console_screen.dart';
import 'package:business_app/features/queues/presentation/queues_screen.dart';
import 'package:business_app/features/reports/presentation/reports_screen.dart';
import 'package:business_app/features/restaurant_demo/presentation/qr_center_screen.dart';
import 'package:business_app/features/settings/presentation/settings_screen.dart';
import 'package:business_app/features/shell/presentation/business_shell.dart';
import 'package:business_app/features/staff/presentation/staff_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_shared/queueflow_shared.dart'
    show AppConfig, Flavor, ProductIdentity, appConfigProvider, buildQuykTheme;

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

const _user = AuthUser(
  id: 'u1',
  email: 'owner@bellavista.example.com',
  fullName: 'Marco Bellini',
  businessId: 'b1',
  roles: ['OWNER'],
);

const _branches = [
  BranchModel(id: 'br1', businessId: 'b1', name: 'Bella Vista Downtown', code: 'BVD', city: 'Lahore', address: '12 Mall Road'),
  BranchModel(id: 'br2', businessId: 'b1', name: 'Bella Vista Gulberg', code: 'BVG', city: 'Lahore', address: 'MM Alam Road'),
];

const _queues = [
  QueueModel(id: 'q1', businessId: 'b1', branchId: 'br1', name: 'Dine-In Waiting List', status: 'ACTIVE', prefix: 'A', waitingCount: 6),
  QueueModel(
    id: 'q2',
    businessId: 'b1',
    branchId: 'br1',
    name: 'VIP Guests',
    status: 'ACTIVE',
    prefix: 'V',
    waitingCount: 1,
    averageServiceTimeMinutes: 15,
  ),
  QueueModel(
    id: 'q3',
    businessId: 'b1',
    branchId: 'br1',
    name: 'Takeaway Pickup',
    status: 'PAUSED',
    prefix: 'T',
    waitingCount: 2,
    serviceMode: 'TAKEAWAY',
    averageServiceTimeMinutes: 6,
  ),
  QueueModel(
    id: 'q4',
    businessId: 'b1',
    branchId: 'br1',
    name: 'Drive-In Lane',
    status: 'CLOSED',
    prefix: 'D',
    serviceMode: 'DRIVE_IN',
  ),
];

final _now = DateTime.now();

List<QueueEntryModel> _entries() => [
      QueueEntryModel(
        id: 'e1',
        displayCode: 'A-104',
        status: 'CALLED',
        partySize: 4,
        customerName: 'Sadat Sheikh',
        customerPhone: '03060600308',
        joinedAt: _now.subtract(const Duration(minutes: 18)),
      ),
      for (var i = 0; i < 5; i++)
        QueueEntryModel(
          id: 'w$i',
          displayCode: 'A-10${5 + i}',
          status: i == 3 ? 'HOLDING' : 'WAITING',
          partySize: 2 + i % 3,
          customerName: ['Asad Ali', 'Hammad Raza', 'Akbar Ghauri', 'Sara Khan', 'Omar Farooq'][i],
          customerPhone: '0300123456$i',
          isVip: i == 1,
          joinedAt: _now.subtract(Duration(minutes: 14 - i * 3)),
        ),
    ];

NotificationModel _alert(String id, String code, String type, String status) => NotificationModel(
      id: id,
      type: type,
      status: status,
      createdAt: _now.subtract(Duration(minutes: int.parse(id) * 7)),
      displayCode: code,
      queueId: 'q1',
      queueName: 'Dine-In Waiting List',
      channel: 'WHATSAPP',
      recipientPhone: '03060600308',
    );

final _alerts = [
  _alert('1', 'A-104', 'YOUR_TURN', 'FAILED'),
  _alert('2', 'A-108', 'QUEUE_JOINED', 'FAILED'),
  _alert('3', 'A-103', 'FEEDBACK_REQUEST', 'SENT'),
  _alert('4', 'V-002', 'QUEUE_JOINED', 'DELIVERED'),
];

const _summary = DailySummaryModel(
  date: '2026-10-28',
  totalServed: 42,
  averageWaitMinutes: 12,
  noShows: 3,
  joined: 51,
  stillActive: 9,
);

List<Override> _overrides() => [
      currentUserProvider.overrideWithValue(_user),
      connectivityProvider.overrideWith((ref) => Stream.value(true)),
      realtimeStatusProvider.overrideWith((ref) => Stream.value(RealtimeStatus.connected)),
      branchesProvider.overrideWith((ref) async => _branches),
      queuesProvider.overrideWith((ref) async => _queues),
      queuesRealtimeProvider.overrideWith((ref) {}),
      dashboardRealtimeBindingProvider.overrideWith((ref) {}),
      queueConsoleRealtimeBindingProvider.overrideWith((ref, id) {}),
      dashboardProvider.overrideWith(
        (ref) async => (queues: _queues, summary: _summary, notifications: _alerts, businessName: 'Bella Vista'),
      ),
      queueSnapshotProvider.overrideWith(
        (ref, id) async => QueueSnapshotModel(
          queue: _queues.first,
          entries: _entries(),
          metrics: const QueueMetricsModel(waitingCount: 5, calledCount: 1, averageWaitMinutes: 12),
          generatedAt: _now,
        ),
      ),
      guestsListProvider.overrideWith(
        (ref, q) async => [
          CustomerModel(
            id: 'c1',
            fullName: 'Sadat Sheikh',
            phone: '03060600308',
            activeStatus: 'CALLED',
            displayCode: 'A-104',
            queueName: 'Dine-In Waiting List',
            visitedAt: _now,
          ),
          CustomerModel(
            id: 'c2',
            fullName: 'Asad Ali',
            phone: '+923312229030',
            activeStatus: 'WAITING',
            displayCode: 'A-105',
            queueName: 'Dine-In Waiting List',
            visitedAt: _now,
          ),
          CustomerModel(
            id: 'c3',
            fullName: 'Hammad Raza',
            phone: '03392002047',
            activeStatus: 'WAITING',
            displayCode: 'V-002',
            queueName: 'VIP Guests',
            visitedAt: _now,
          ),
        ],
      ),
      staffRosterProvider.overrideWith(
        (ref) async => const StaffRosterModel(
          members: [
            StaffMemberModel(id: 'u1', email: 'owner@bellavista.example.com', fullName: 'Marco Bellini', role: 'OWNER', status: 'ACTIVE'),
            StaffMemberModel(
              id: 'u2',
              email: 'manager.dt@bellavista.example.com',
              fullName: 'Ayesha Malik',
              role: 'MANAGER',
              status: 'ACTIVE',
              branchIds: ['br1'],
            ),
            StaffMemberModel(
              id: 'u3',
              email: 'staff1.dt@bellavista.example.com',
              fullName: 'Bilal Ahmed',
              role: 'STAFF',
              status: 'ACTIVE',
              branchIds: ['br1'],
            ),
          ],
          invitations: [
            StaffInvitationModel(id: 'i1', email: 'host@bellavista.example.com', role: 'RECEPTIONIST', status: 'PENDING'),
          ],
        ),
      ),
      businessProfileProvider.overrideWith(
        (ref) async => {
          'id': 'b1',
          'name': 'Bella Vista',
          'email': 'hello@bellavista.example.com',
          'phone': '+92 42 1234567',
          'timezone': 'Asia/Karachi',
        },
      ),
      reportsProvider.overrideWith((ref, day) async => _summary),
      restaurantConfigProvider.overrideWith((ref) => Completer<RestaurantConfig>().future),
      qrCenterBusinessNameProvider.overrideWith((ref) async => 'Bella Vista'),
      guestMenuProvider.overrideWith(
        (ref) async => {
          'isDefault': false,
          'menu': {
            'categories': [
              {
                'id': 'c1',
                'name': 'Starters',
                'items': [
                  {'id': 'i1', 'name': 'Burrata Caprese', 'description': 'Heirloom tomatoes, basil oil', 'price': 16, 'available': true},
                  {'id': 'i2', 'name': 'Crispy Calamari', 'description': 'Lemon aioli, chili flakes', 'price': 14, 'available': false},
                ],
              },
              {
                'id': 'c2',
                'name': 'Pasta & risotto',
                'items': [
                  {'id': 'i3', 'name': 'Truffle Tagliatelle', 'description': 'Parmesan, black truffle', 'price': 24, 'available': true},
                ],
              },
            ],
          },
        },
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
        builder: (context, state, child) => BusinessShell(child: child),
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
        theme: buildQuykTheme(identity: ProductIdentity.owner),
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

  testWidgets('dashboard', (t) => _render(t, name: 'dashboard', path: '/dashboard', page: const DashboardScreen()));
  testWidgets(
    'dashboard phone',
    (t) => _render(t, name: 'dashboard_phone', path: '/dashboard', page: const DashboardScreen(), size: const Size(390, 844)),
  );
  testWidgets('lines', (t) => _render(t, name: 'lines', path: '/queues', page: const QueuesScreen()));
  testWidgets(
    'line detail',
    (t) => _render(t, name: 'line_detail', path: '/queues/q1', page: const QueueDetailScreen(queueId: 'q1')),
  );
  testWidgets(
    'serve guests',
    (t) => _render(t, name: 'serve_guests', path: '/queues/q1/console', page: const QueueConsoleScreen(queueId: 'q1')),
  );
  testWidgets('guests', (t) => _render(t, name: 'guests', path: '/customers', page: const CustomersScreen()));
  testWidgets('locations', (t) => _render(t, name: 'locations', path: '/branches', page: const BranchesScreen()));
  testWidgets('team', (t) => _render(t, name: 'team', path: '/staff', page: const StaffScreen()));
  testWidgets('reports', (t) => _render(t, name: 'reports', path: '/reports', page: const ReportsScreen()));
  testWidgets('settings', (t) => _render(t, name: 'settings', path: '/settings', page: const SettingsScreen()));
  testWidgets('guest_codes', (t) => _render(t, name: 'guest_codes', path: '/restaurant/qr', page: const QrCenterScreen()));
  testWidgets('menu', (t) => _render(t, name: 'menu', path: '/menu', page: const MenuScreen()));
  testWidgets(
    'dashboard_laptop',
    (t) => _render(t, name: 'dashboard_laptop', path: '/dashboard', page: const DashboardScreen(), size: const Size(1536, 674)),
  );

  testWidgets('login', (tester) async {
    tester.view.physicalSize = const Size(1440, 1024);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          appConfigProvider.overrideWithValue(
            const AppConfig(
              flavor: Flavor.production,
              apiBaseUrl: 'https://api.example.com/api/v1',
              wsBaseUrl: 'https://api.example.com',
              appName: 'Quyk Business',
              enableLogging: false,
              apiTimeoutSeconds: 15,
            ),
          ),
        ],
        child: MaterialApp(
          debugShowCheckedModeBanner: false,
          theme: buildQuykTheme(identity: ProductIdentity.owner),
          home: const LoginScreen(),
        ),
      ),
    );
    await tester.runAsync(() async {
      for (final element in find.byType(Image).evaluate()) {
        await precacheImage((element.widget as Image).image, element);
      }
    });
    await tester.pumpAndSettle();
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/login.png'));
  });
}
