// Renders the redesigned staff screens with fixture data so they can be
// compared against the Figma "Quyk Redesign Staff" frames.
//
// Not part of the regular suite (lives outside test/). Generate with:
//   flutter test test_preview --update-goldens
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:staff_app/core/models/models.dart';
import 'package:staff_app/features/customers/presentation/guests_view.dart';
import 'package:staff_app/features/notifications/presentation/guest_messages_view.dart';
import 'package:staff_app/features/profile/profile_view.dart';
import 'package:staff_app/features/reviews/presentation/reviews_view.dart';
import 'package:staff_app/features/today/live_queue_board.dart';
import 'package:staff_app/shared/widgets/quyk/quyk_frame.dart';
import 'package:staff_app/shared/widgets/quyk/quyk_widgets.dart';
import 'package:staff_app/theme/quyk_staff_theme.dart';

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
      final loader = FontLoader('MaterialIcons')
        ..addFont(Future.value(ByteData.view(bytes.buffer)));
      await loader.load();
    }
  }
}

Future<void> _render(
  WidgetTester tester, {
  required String name,
  required int tab,
  required Widget child,
  Size size = const Size(1366, 1024),
}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);

  await tester.pumpWidget(
    MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: buildQuykStaffTheme(),
      home: QuykStaffFrame(
        selectedIndex: tab,
        onSelect: (_) {},
        greetingName: 'Marco',
        venueName: 'Bella Vista Downtown',
        branchPicker: const QuykBranchPill(label: 'All branches'),
        onSignOut: () {},
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: quykContentMaxWidth),
            child: SizedBox.expand(child: child),
          ),
        ),
      ),
    ),
  );
  await tester.runAsync(() async {
    for (final element in find.byType(Image).evaluate()) {
      final image = element.widget as Image;
      await precacheImage(image.image, element);
    }
  });
  await tester.pumpAndSettle();
  await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/$name.png'));
}

final _guests = <CustomerModel>[
  CustomerModel(
    id: '1',
    fullName: 'Sadat Sheikh',
    phone: '03060600308',
    activeStatus: 'CALLED',
    displayCode: 'A-108',
    queueName: 'Dine-In Waiting List',
    visitedAt: DateTime(2026, 10, 23, 18, 4),
  ),
  CustomerModel(
    id: '2',
    fullName: 'Asad Ali',
    phone: '+923312229030',
    activeStatus: 'WAITING',
    displayCode: 'A-109',
    queueName: 'Dine-In Waiting List',
    visitedAt: DateTime(2026, 10, 23, 18, 11),
  ),
  CustomerModel(
    id: '3',
    fullName: 'Akbar Ghauri',
    phone: '03123456789',
    activeStatus: 'WAITING',
    displayCode: 'V-004',
    queueName: 'VIP Guests',
    visitedAt: DateTime(2026, 10, 23, 18, 20),
  ),
];

final _reviews = <FeedbackModel>[
  FeedbackModel(
    id: 'r1',
    rating: 1,
    customerName: 'Sadat Sheikh',
    customerPhone: '03060600308',
    displayCode: 'A-106',
    comment: 'Highlights: Service\nBekar fazol app hai me smjhta hun but maza aya',
    submittedAt: DateTime(2026, 10, 22, 5, 1),
  ),
  FeedbackModel(
    id: 'r2',
    rating: 5,
    customerName: 'asad ali',
    customerPhone: '+923312229030',
    displayCode: 'A-042',
    comment: 'Highlights: Service\nWorking',
    submittedAt: DateTime(2026, 8, 27, 5, 55),
  ),
  FeedbackModel(
    id: 'r3',
    rating: 4,
    customerName: 'asad ali',
    customerPhone: '+923312229030',
    displayCode: 'A-033',
    comment: 'Highlights: Service, Wait time\ngreat app',
    submittedAt: DateTime(2026, 8, 24, 7, 16),
  ),
  FeedbackModel(
    id: 'r4',
    rating: 1,
    customerName: 'Akbar Ghauri',
    customerPhone: '03123456789',
    displayCode: 'A-022',
    comment: 'Highlights: Cleanliness\nBohot intezar karwadia mein ghar jaa raha hoon',
    submittedAt: DateTime(2026, 8, 24, 6, 21),
  ),
];

NotificationModel _msg(String id, String code, String type, String line, String channel, String phone) {
  return NotificationModel(
    id: id,
    type: type,
    status: 'FAILED',
    createdAt: DateTime(2026, 10, 23),
    displayCode: code,
    queueId: 'q1',
    queueName: line,
    channel: channel,
    recipientPhone: phone,
  );
}

final _messages = <NotificationModel>[
  _msg('1', 'A-108', 'YOUR_TURN', 'Dine-In Waiting List', 'WHATSAPP', '03060600308'),
  _msg('2', 'A-108', 'QUEUE_JOINED', 'Dine-In Waiting List', 'WHATSAPP', '03060600308'),
  _msg('3', 'V-003', 'QUEUE_JOINED', 'VIP Guests', 'SMS', '03392002047'),
  _msg('4', 'A-107', 'FEEDBACK_REQUEST', 'Dine-In Waiting List', 'WHATSAPP', '03060600308'),
  _msg('5', 'A-107', 'YOUR_TURN', 'Dine-In Waiting List', 'WHATSAPP', '03060600308'),
  _msg('6', 'A-107', 'QUEUE_JOINED', 'Dine-In Waiting List', 'WHATSAPP', '03060600308'),
];

Widget _liveBoard() {
  return ListView(
    padding: const EdgeInsets.fromLTRB(32, 8, 32, 32),
    children: const [
      LiveQueueBoard(
        waitingCount: 3,
        callLabel: 'Call next guest',
        hero: LiveBoardGuest(
          displayCode: 'A-108',
          name: 'Sadat Sheikh',
          phone: '03060600308',
          contextLabel: '2 guests',
          waitingMinutes: 6,
          estimatedMinutes: 4,
        ),
        heroLineLabel: 'Dine-In Waiting List',
        lines: [
          LiveBoardLine(
            id: 'q1',
            name: 'Dine-In Waiting List',
            serviceMode: 'DINE_IN',
            waiting: 2,
            selected: true,
          ),
          LiveBoardLine(id: 'q2', name: 'VIP Guests', serviceMode: 'DINE_IN', waiting: 1, selected: false),
          LiveBoardLine(id: 'q3', name: 'Drive-in', serviceMode: 'DRIVE_IN', waiting: 0, selected: false),
          LiveBoardLine(id: 'q4', name: 'Takeaway', serviceMode: 'TAKEAWAY', waiting: 0, selected: false),
        ],
      ),
    ],
  );
}

void main() {
  setUpAll(_loadFonts);

  testWidgets('live queue', (tester) async {
    await _render(tester, name: 'live_queue', tab: 0, child: _liveBoard());
  });

  testWidgets('live queue phone', (tester) async {
    await _render(
      tester,
      name: 'live_queue_phone',
      tab: 0,
      size: const Size(390, 844),
      child: _liveBoard(),
    );
  });

  testWidgets('guests', (tester) async {
    final controller = TextEditingController();
    addTearDown(controller.dispose);
    await _render(
      tester,
      name: 'guests',
      tab: 1,
      child: GuestsView(
        searchController: controller,
        onSearch: () {},
        filter: GuestFilter.all,
        onFilter: (_) {},
        guests: _guests,
        onOpenGuest: (_) {},
      ),
    );
  });

  testWidgets('reviews', (tester) async {
    await _render(
      tester,
      name: 'reviews',
      tab: 2,
      child: ReviewsView(ratingFilter: null, onFilter: (_) {}, reviews: _reviews),
    );
  });

  testWidgets('guest messages', (tester) async {
    await _render(
      tester,
      name: 'guest_messages',
      tab: 3,
      child: GuestMessagesView(items: _messages, onViewQueue: (_) {}),
    );
  });

  testWidgets('profile', (tester) async {
    await _render(
      tester,
      name: 'profile',
      tab: 4,
      child: ProfileView(
        name: 'Marco Bellini',
        email: 'owner@bellavista.example.com',
        onBreak: false,
        onToggleBreak: () {},
        onSignOut: () {},
      ),
    );
  });

  testWidgets('empty states', (tester) async {
    await _render(
      tester,
      name: 'reviews_empty',
      tab: 2,
      child: ReviewsView(ratingFilter: 5, onFilter: (_) {}, reviews: const []),
    );
    expect(find.byType(QuykCard), findsOneWidget);
  });
}
