// Mock product screens: compact layout code, kept readable over lint style.
// ignore_for_file: require_trailing_commas, prefer_const_constructors, prefer_const_literals_to_create_immutables

import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

/// The four customer-facing Quyk apps, each with a short scripted walkthrough
/// of mock screens. Mock data only — nothing here calls a real API.
enum QuykApp { guest, staff, owner, tv }

class _Step {
  const _Step(this.title, this.body, this.screen);

  final String title;
  final String body;
  final WidgetBuilder screen;
}

class _AppInfo {
  const _AppInfo({
    required this.name,
    required this.who,
    required this.icon,
    required this.pitch,
    required this.steps,
  });

  final String name;
  final String who;
  final IconData icon;
  final String pitch;
  final List<_Step> steps;
}

final Map<QuykApp, _AppInfo> _apps = {
  QuykApp.guest: _AppInfo(
    name: 'Guest page',
    who: 'For your guests · any phone',
    icon: Icons.phone_iphone_rounded,
    pitch: 'Guests join from their own phone — no app, no account — and wait wherever they like.',
    steps: [
      _Step('Scan the code', 'A code at the door opens your restaurant’s page with the current wait.', (_) => const _GuestScan()),
      _Step('Join in seconds', 'Name, party size and phone. That’s it — they get a ticket instantly.', (_) => const _GuestJoin()),
      _Step('Wait anywhere', 'Their place and wait update live as guests ahead are served.', (_) => const _GuestWaiting()),
      _Step('Get called', 'When your team calls them, their phone says it’s their turn.', (_) => const _GuestCalled()),
    ],
  ),
  QuykApp.staff: _AppInfo(
    name: 'Staff app',
    who: 'For your front desk · tablet',
    icon: Icons.tablet_mac_rounded,
    pitch: 'One screen at the host stand: who’s next, every line, and walk-ins.',
    steps: [
      _Step('See who’s next', 'The next guest, their party size and how long they’ve waited.', (_) => const _StaffNext()),
      _Step('Call with one tap', 'Call next guest — or hold, skip or move them to another line.', (_) => const _StaffCalled()),
      _Step('Add walk-ins', 'No phone? Add them by name and call them by ticket number.', (_) => const _StaffWalkIn()),
      _Step('Find any guest', 'Search by name, phone or ticket to see where someone is.', (_) => const _StaffGuests()),
    ],
  ),
  QuykApp.owner: _AppInfo(
    name: 'Owner app',
    who: 'For owners & managers · any browser',
    icon: Icons.space_dashboard_outlined,
    pitch: 'Every line and location at a glance, plus the setup that keeps the door running.',
    steps: [
      _Step('Today at a glance', 'Who’s waiting, guests served, average wait and no-shows.', (_) => const _OwnerHome()),
      _Step('Run your lines', 'Dine-in, takeaway or drive-in — open, pause or close each line.', (_) => const _OwnerLines()),
      _Step('Print join codes', 'Each line gets its own code to print for the door or tables.', (_) => const _OwnerCodes()),
      _Step('Read guest reviews', 'Guests rate their visit after they’re served.', (_) => const _OwnerReviews()),
    ],
  ),
  QuykApp.tv: _AppInfo(
    name: 'TV display',
    who: 'For your lobby · any TV browser',
    icon: Icons.tv_rounded,
    pitch: 'A big, calm board so guests in the room always know who’s being served.',
    steps: [
      _Step('Pair the screen', 'Open the display on the TV and enter its code — no cables or apps.', (_) => const _TvPair()),
      _Step('Now serving', 'The called ticket fills the screen, with who’s up next below.', (_) => const _TvBoard()),
      _Step('Your message', 'Add a note for the room, like “Have your ticket ready”.', (_) => const _TvBoard(announcement: true)),
    ],
  ),
};

/// Interactive tour: pick an app, then step through its screens.
class ProductExplorer extends StatefulWidget {
  const ProductExplorer({super.key, required this.onBookDemo});

  final VoidCallback onBookDemo;

  @override
  State<ProductExplorer> createState() => _ProductExplorerState();
}

class _ProductExplorerState extends State<ProductExplorer> {
  QuykApp _app = QuykApp.guest;

  /// Remembers the step per app so switching back keeps your place.
  final Map<QuykApp, int> _steps = {for (final a in QuykApp.values) a: 0};

  int get _step => _steps[_app]!;
  _AppInfo get _info => _apps[_app]!;

  void _go(int step) => setState(() => _steps[_app] = step.clamp(0, _info.steps.length - 1));

  void _next() {
    if (_step < _info.steps.length - 1) {
      _go(_step + 1);
    } else {
      _nextApp();
    }
  }

  void _nextApp() {
    final next = QuykApp.values[(_app.index + 1) % QuykApp.values.length];
    setState(() {
      _app = next;
      _steps[next] = 0;
    });
  }

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 980;
    final reduce = MediaQuery.of(context).disableAnimations;
    final duration = reduce ? Duration.zero : const Duration(milliseconds: 320);
    final info = _info;
    final step = info.steps[_step];
    final last = _step == info.steps.length - 1;

    final tabs = Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final a in QuykApp.values)
          _AppTab(
            info: _apps[a]!,
            selected: a == _app,
            onTap: () => setState(() => _app = a),
          ),
      ],
    );

    final story = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(info.who.toUpperCase(),
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 1.2, color: QuykColors.greenMuted)),
        const SizedBox(height: 8),
        Text(info.pitch, style: const TextStyle(fontSize: 17, height: 1.45, color: QuykColors.muted)),
        const SizedBox(height: 22),
        for (var i = 0; i < info.steps.length; i++)
          _StepRow(
            index: i,
            step: info.steps[i],
            active: i == _step,
            done: i < _step,
            onTap: () => _go(i),
          ),
        const SizedBox(height: 18),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            OutlinedButton.icon(
              onPressed: _step == 0 ? null : () => _go(_step - 1),
              icon: const Icon(Icons.arrow_back_rounded, size: 18),
              label: const Text('Back'),
            ),
            FilledButton.icon(
              onPressed: _next,
              icon: Icon(last ? Icons.swap_horiz_rounded : Icons.arrow_forward_rounded, size: 18),
              label: Text(last ? 'Next app: ${_apps[QuykApp.values[(_app.index + 1) % 4]]!.name}' : 'Next step'),
            ),
            if (last)
              TextButton.icon(
                onPressed: () => _go(0),
                icon: const Icon(Icons.replay_rounded, size: 18),
                label: const Text('Restart'),
              ),
          ],
        ),
        if (last) ...[
          const SizedBox(height: 14),
          TextButton(onPressed: widget.onBookDemo, child: const Text('See it with your own lines — book a demo →')),
        ],
      ],
    );

    final stage = Semantics(
      label: '${info.name}, step ${_step + 1} of ${info.steps.length}: ${step.title}',
      child: Container(
        padding: EdgeInsets.all(wide ? 36 : 18),
        decoration: BoxDecoration(
          color: QuykColors.green,
          borderRadius: BorderRadius.circular(36),
          gradient: const RadialGradient(
            center: Alignment(0.6, -0.7),
            radius: 1.3,
            colors: [QuykColors.greenPanel, QuykColors.green],
          ),
        ),
        child: Column(
          children: [
            Row(
              children: [
                QuykPill(label: '${_step + 1} / ${info.steps.length}'),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(step.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.white)),
                ),
                for (var i = 0; i < info.steps.length; i++)
                  Padding(
                    padding: const EdgeInsets.only(left: 6),
                    child: AnimatedContainer(
                      duration: duration,
                      width: i == _step ? 22 : 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: i <= _step ? QuykColors.lime : Colors.white24,
                        borderRadius: BorderRadius.circular(99),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 22),
            SizedBox(
              height: wide ? 470 : 430,
              child: AnimatedSwitcher(
                duration: duration,
                switchInCurve: Curves.easeOutCubic,
                transitionBuilder: (child, anim) => FadeTransition(
                  opacity: anim,
                  child: SlideTransition(
                    position: Tween(begin: const Offset(0.04, 0), end: Offset.zero).animate(anim),
                    child: child,
                  ),
                ),
                child: KeyedSubtree(
                  key: ValueKey('${_app.name}-$_step'),
                  child: _DeviceFrame(app: _app, child: step.screen(context)),
                ),
              ),
            ),
          ],
        ),
      ),
    );

    return CallbackShortcuts(
      bindings: {
        const SingleActivator(LogicalKeyboardKey.arrowRight): _next,
        const SingleActivator(LogicalKeyboardKey.arrowLeft): () => _go(_step - 1),
      },
      child: Focus(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            tabs,
            const SizedBox(height: 24),
            if (wide)
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(flex: 5, child: story),
                  const SizedBox(width: 36),
                  Expanded(flex: 7, child: stage),
                ],
              )
            else ...[
              stage,
              const SizedBox(height: 22),
              story,
            ],
          ],
        ),
      ),
    );
  }
}

class _AppTab extends StatelessWidget {
  const _AppTab({required this.info, required this.selected, required this.onTap});

  final _AppInfo info;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      selected: selected,
      button: true,
      child: Material(
        color: selected ? QuykColors.green : Colors.white,
        shape: StadiumBorder(side: BorderSide(color: selected ? QuykColors.green : QuykColors.line)),
        child: InkWell(
          customBorder: const StadiumBorder(),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(8, 8, 18, 8),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                QuykIconBubble(
                  icon: info.icon,
                  size: 34,
                  background: selected ? QuykColors.lime : QuykColors.limeSoft,
                ),
                const SizedBox(width: 10),
                Text(info.name,
                    style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: selected ? Colors.white : QuykColors.green)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _StepRow extends StatelessWidget {
  const _StepRow({required this.index, required this.step, required this.active, required this.done, required this.onTap});

  final int index;
  final _Step step;
  final bool active;
  final bool done;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: active ? Colors.white : Colors.transparent,
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: active ? QuykColors.line : Colors.transparent),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 28,
                  height: 28,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: active ? QuykColors.green : (done ? QuykColors.lime : QuykColors.mist),
                  ),
                  child: done
                      ? const Icon(Icons.check_rounded, size: 16, color: QuykColors.green)
                      : Text('${index + 1}',
                          style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: active ? QuykColors.lime : QuykColors.greenMuted)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(step.title,
                          style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: active ? QuykColors.green : QuykColors.ink)),
                      if (active) ...[
                        const SizedBox(height: 4),
                        Text(step.body, style: const TextStyle(fontSize: 14, height: 1.45, color: QuykColors.muted)),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ── Device frames ───────────────────────────────────────────────────────────

class _DeviceFrame extends StatelessWidget {
  const _DeviceFrame({required this.app, required this.child});

  final QuykApp app;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    switch (app) {
      case QuykApp.guest:
        return Center(
          child: AspectRatio(
            aspectRatio: 9 / 18,
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF0B1F1A),
                borderRadius: BorderRadius.circular(38),
                boxShadow: const [BoxShadow(color: Color(0x55000000), blurRadius: 30, offset: Offset(0, 16))],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(30),
                child: ColoredBox(color: QuykColors.cream, child: child),
              ),
            ),
          ),
        );
      case QuykApp.tv:
        return Center(
          child: AspectRatio(
            aspectRatio: 16 / 9.6,
            child: Column(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0B1F1A),
                      borderRadius: BorderRadius.circular(14),
                      boxShadow: const [BoxShadow(color: Color(0x55000000), blurRadius: 30, offset: Offset(0, 16))],
                    ),
                    child: ClipRRect(borderRadius: BorderRadius.circular(8), child: child),
                  ),
                ),
                Container(width: 90, height: 10, color: const Color(0xFF0B1F1A)),
              ],
            ),
          ),
        );
      case QuykApp.staff:
      case QuykApp.owner:
        return Container(
          decoration: BoxDecoration(
            color: QuykColors.cream,
            borderRadius: BorderRadius.circular(app == QuykApp.staff ? 26 : 16),
            border: Border.all(color: app == QuykApp.staff ? const Color(0xFF0B1F1A) : Colors.white24, width: app == QuykApp.staff ? 10 : 1),
            boxShadow: const [BoxShadow(color: Color(0x55000000), blurRadius: 30, offset: Offset(0, 16))],
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            children: [
              if (app == QuykApp.owner)
                Container(
                  height: 30,
                  color: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: const Row(
                    children: [
                      _Dot(Color(0xFFFF6159)),
                      _Dot(Color(0xFFFFBD2E)),
                      _Dot(Color(0xFF28C941)),
                      SizedBox(width: 12),
                      Text('business.quyk.app', style: TextStyle(fontSize: 11, color: QuykColors.subtle)),
                    ],
                  ),
                ),
              Expanded(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _MiniRail(owner: app == QuykApp.owner),
                    Expanded(child: Padding(padding: const EdgeInsets.all(16), child: child)),
                  ],
                ),
              ),
            ],
          ),
        );
    }
  }
}

class _Dot extends StatelessWidget {
  const _Dot(this.color);

  final Color color;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(right: 6),
        child: Container(width: 10, height: 10, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
      );
}

class _MiniRail extends StatelessWidget {
  const _MiniRail({required this.owner});

  final bool owner;

  @override
  Widget build(BuildContext context) {
    final icons = owner
        ? const [Icons.space_dashboard_outlined, Icons.format_list_numbered_rounded, Icons.qr_code_2_rounded, Icons.star_outline_rounded, Icons.insights_outlined]
        : const [Icons.campaign_outlined, Icons.people_outline_rounded, Icons.star_outline_rounded, Icons.person_outline_rounded];
    return Container(
      width: 54,
      color: QuykColors.green,
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Column(
        children: [
          const QuykLogoTile(size: 30),
          const SizedBox(height: 14),
          for (var i = 0; i < icons.length; i++)
            Container(
              margin: const EdgeInsets.only(bottom: 8),
              width: 38,
              height: 34,
              decoration: BoxDecoration(
                color: i == 0 ? QuykColors.lime : Colors.transparent,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icons[i], size: 17, color: i == 0 ? QuykColors.green : Colors.white70),
            ),
        ],
      ),
    );
  }
}

// ── Small shared mock pieces ───────────────────────────────────────────────

const _ink = TextStyle(color: QuykColors.ink);

Widget _label(String t) => Text(t, style: const TextStyle(fontSize: 11, color: QuykColors.subtle, fontWeight: FontWeight.w600));

Widget _card({required Widget child, Color color = Colors.white, EdgeInsets padding = const EdgeInsets.all(12)}) => Container(
      padding: padding,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(16),
        border: color == Colors.white ? Border.all(color: QuykColors.line) : null,
      ),
      child: child,
    );

Widget _field(String label, String value) => Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: QuykColors.field),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [_label(label), const SizedBox(height: 2), Text(value, style: _ink.copyWith(fontSize: 13))],
        ),
      ),
    );

Widget _bigButton(String label, {IconData? icon, bool lime = false}) => Container(
      height: 42,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: lime ? QuykColors.lime : QuykColors.green,
        borderRadius: BorderRadius.circular(99),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[Icon(icon, size: 16, color: lime ? QuykColors.green : QuykColors.lime), const SizedBox(width: 6)],
          Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: lime ? QuykColors.green : QuykColors.lime)),
        ],
      ),
    );

// ── Guest screens ──────────────────────────────────────────────────────────

class _GuestShell extends StatelessWidget {
  const _GuestShell({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(14, 22, 14, 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Row(children: [
              QuykLogoTile(size: 22),
              SizedBox(width: 6),
              Text('Bella Vista', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: QuykColors.green)),
            ]),
            const SizedBox(height: 14),
            ...children,
          ],
        ),
      );
}

class _GuestScan extends StatelessWidget {
  const _GuestScan();

  @override
  Widget build(BuildContext context) => _GuestShell(children: [
        const Text('Dine-in waiting list', textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: QuykColors.muted)),
        const SizedBox(height: 10),
        _card(
          color: QuykColors.green,
          child: const Column(children: [
            Text('ESTIMATED WAIT', style: TextStyle(fontSize: 9, letterSpacing: 1, color: Colors.white70)),
            SizedBox(height: 6),
            Text('7.5 min', style: TextStyle(fontSize: 30, fontWeight: FontWeight.w700, color: QuykColors.lime)),
            SizedBox(height: 4),
            Text('2 parties waiting', style: TextStyle(fontSize: 11, color: Colors.white70)),
          ]),
        ),
        const SizedBox(height: 12),
        _bigButton('Join queue'),
        const Spacer(),
        const Text('No app to download', textAlign: TextAlign.center, style: TextStyle(fontSize: 10, color: QuykColors.subtle)),
      ]);
}

class _GuestJoin extends StatelessWidget {
  const _GuestJoin();

  @override
  Widget build(BuildContext context) => _GuestShell(children: [
        const Text('Join the line', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: QuykColors.green)),
        const SizedBox(height: 10),
        _field('Your name', 'Sara Khan'),
        _field('Party size', '4 guests'),
        _field('Phone', '0300 •••• 821'),
        const SizedBox(height: 4),
        _bigButton('Get my ticket', icon: Icons.confirmation_number_outlined),
      ]);
}

class _GuestWaiting extends StatelessWidget {
  const _GuestWaiting();

  @override
  Widget build(BuildContext context) => _GuestShell(children: [
        _card(
          color: QuykColors.green,
          padding: const EdgeInsets.all(16),
          child: Column(children: [
            const QuykPill(label: 'Waiting line'),
            const SizedBox(height: 8),
            const Text('6', style: TextStyle(fontSize: 44, height: 1, fontWeight: FontWeight.w700, color: QuykColors.lime)),
            const Text('MINUTES ESTIMATED WAIT', style: TextStyle(fontSize: 8, letterSpacing: 1, color: QuykColors.lime)),
            const SizedBox(height: 12),
            SizedBox(
              width: 70,
              height: 70,
              child: CircularProgressIndicator(
                value: 0.62,
                strokeWidth: 7,
                color: QuykColors.lime,
                backgroundColor: Colors.white.withValues(alpha: 0.12),
              ),
            ),
            const SizedBox(height: 10),
            const Text('1 party ahead of you', style: TextStyle(fontSize: 12, color: Colors.white)),
          ]),
        ),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(child: _card(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [_label('TICKET'), Text('A-109', style: _ink.copyWith(fontWeight: FontWeight.w700))]))),
          const SizedBox(width: 8),
          Expanded(child: _card(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [_label('PARTY'), Text('04', style: _ink.copyWith(fontWeight: FontWeight.w700))]))),
        ]),
      ]);
}

class _GuestCalled extends StatelessWidget {
  const _GuestCalled();

  @override
  Widget build(BuildContext context) => _GuestShell(children: [
        const Spacer(),
        Container(
          width: 74,
          height: 74,
          alignment: Alignment.center,
          decoration: const BoxDecoration(color: QuykColors.lime, shape: BoxShape.circle),
          child: const Icon(Icons.notifications_active_rounded, size: 34, color: QuykColors.green),
        ),
        const SizedBox(height: 16),
        const Text('It’s your turn!', textAlign: TextAlign.center, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w600, color: QuykColors.green)),
        const SizedBox(height: 6),
        const Text('Show A-109 at the host stand', textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: QuykColors.muted)),
        const Spacer(),
        _bigButton('On my way', lime: true),
      ]);
}

// ── Staff screens ──────────────────────────────────────────────────────────

class _StaffNext extends StatelessWidget {
  const _StaffNext({this.called = false});

  final bool called;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(called ? 'Called · Dine-in' : '3 guests are waiting', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: QuykColors.green)),
          const SizedBox(height: 10),
          Expanded(
            child: Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(color: QuykColors.green, borderRadius: BorderRadius.circular(22)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  QuykPill(label: called ? 'Called' : 'Who’s next'),
                  const Spacer(),
                  const FittedBox(
                    child: Text('A-108', style: TextStyle(fontSize: 64, height: 1, fontWeight: FontWeight.w700, color: QuykColors.lime)),
                  ),
                  const SizedBox(height: 4),
                  const Text('Sara · party of 4', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white)),
                  const SizedBox(height: 4),
                  Text(called ? 'Called just now' : 'Waiting 6 min', style: const TextStyle(fontSize: 12, color: Colors.white70)),
                  const Spacer(),
                  if (called)
                    Row(children: [
                      for (final l in const ['Hold', 'Skip', 'Move'])
                        Expanded(
                          child: Container(
                            margin: const EdgeInsets.only(right: 6),
                            height: 36,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(99),
                              border: Border.all(color: Colors.white24),
                            ),
                            child: Text(l, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white)),
                          ),
                        ),
                    ])
                  else
                    _bigButton('Call next guest', icon: Icons.room_service_outlined, lime: true),
                ],
              ),
            ),
          ),
        ],
      );
}

class _StaffCalled extends StatelessWidget {
  const _StaffCalled();

  @override
  Widget build(BuildContext context) => const _StaffNext(called: true);
}

class _StaffWalkIn extends StatelessWidget {
  const _StaffWalkIn();

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Add a walk-in', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: QuykColors.green)),
          const SizedBox(height: 4),
          const Text('For guests without a phone', style: TextStyle(fontSize: 12, color: QuykColors.muted)),
          const SizedBox(height: 14),
          _field('Name', 'Ahmed'),
          _field('Party size', '2 guests'),
          _field('Line', 'Dine-in waiting list'),
          const Spacer(),
          _bigButton('Add to line · ticket A-112', icon: Icons.person_add_alt_outlined),
        ],
      );
}

class _StaffGuests extends StatelessWidget {
  const _StaffGuests();

  @override
  Widget build(BuildContext context) {
    const rows = [
      ('Sara Khan', 'A-108', 'Called'),
      ('Ali Raza', 'A-109', 'Waiting'),
      ('Maria', 'T-021', 'Waiting'),
      ('Ahmed', 'A-112', 'Waiting'),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(99), border: Border.all(color: QuykColors.line)),
          child: const Row(children: [
            Icon(Icons.search_rounded, size: 16, color: QuykColors.muted),
            SizedBox(width: 8),
            Text('Search name, phone or ticket #', style: TextStyle(fontSize: 12, color: QuykColors.subtle)),
          ]),
        ),
        const SizedBox(height: 12),
        Expanded(
          child: _card(
            padding: EdgeInsets.zero,
            child: Column(children: [
              for (final (name, code, status) in rows)
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: Row(children: [
                      QuykAvatar(name: name, size: 28, lime: status == 'Called'),
                      const SizedBox(width: 10),
                      Expanded(child: Text(name, style: _ink.copyWith(fontSize: 13, fontWeight: FontWeight.w600))),
                      Text(code, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: QuykColors.green)),
                      const SizedBox(width: 10),
                      QuykStatusPill(status: status.toUpperCase()),
                    ]),
                  ),
                ),
            ]),
          ),
        ),
      ],
    );
  }
}

// ── Owner screens ──────────────────────────────────────────────────────────

class _OwnerHome extends StatelessWidget {
  const _OwnerHome();

  @override
  Widget build(BuildContext context) {
    Widget stat(String label, String value, {bool dark = false}) => Expanded(
          child: _card(
            color: dark ? QuykColors.green : Colors.white,
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(label, style: TextStyle(fontSize: 10, color: dark ? Colors.white70 : QuykColors.subtle)),
              const SizedBox(height: 4),
              Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: dark ? QuykColors.lime : QuykColors.ink)),
            ]),
          ),
        );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('Bella Vista · Today', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: QuykColors.green)),
        const SizedBox(height: 12),
        Row(children: [stat('Waiting now', '9', dark: true), const SizedBox(width: 8), stat('Served', '42'), const SizedBox(width: 8), stat('Avg wait', '12m')]),
        const SizedBox(height: 12),
        Expanded(
          child: _card(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              _label('GUESTS BY HOUR'),
              const SizedBox(height: 10),
              Expanded(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    for (final h in const [0.25, 0.4, 0.7, 0.95, 0.8, 0.5, 0.65, 0.9, 0.6])
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 3),
                          child: FractionallySizedBox(
                            heightFactor: h,
                            child: Container(
                              decoration: BoxDecoration(
                                color: h > 0.85 ? QuykColors.lime : QuykColors.greenMuted,
                                borderRadius: BorderRadius.circular(6),
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ]),
          ),
        ),
      ],
    );
  }
}

class _OwnerLines extends StatelessWidget {
  const _OwnerLines();

  @override
  Widget build(BuildContext context) {
    const lines = [
      ('Dine-in waiting list', Icons.restaurant_rounded, '6', 'ACTIVE'),
      ('VIP guests', Icons.restaurant_rounded, '1', 'ACTIVE'),
      ('Takeaway pickup', Icons.shopping_bag_outlined, '2', 'PAUSED'),
      ('Drive-in lane', Icons.directions_car_outlined, '0', 'CLOSED'),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('Waiting lines', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: QuykColors.green)),
        const SizedBox(height: 12),
        for (final (name, icon, waiting, status) in lines)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: _card(
              child: Row(children: [
                QuykIconBubble(icon: icon, size: 32),
                const SizedBox(width: 10),
                Expanded(child: Text(name, style: _ink.copyWith(fontSize: 13, fontWeight: FontWeight.w600))),
                Text('$waiting waiting', style: const TextStyle(fontSize: 11, color: QuykColors.muted)),
                const SizedBox(width: 10),
                QuykPill(
                  label: status == 'ACTIVE' ? 'Open' : status == 'PAUSED' ? 'Paused' : 'Closed',
                  background: status == 'ACTIVE' ? QuykColors.lime : status == 'PAUSED' ? QuykColors.warningTint : QuykColors.mist,
                  foreground: status == 'ACTIVE' ? QuykColors.green : QuykColors.greenMuted,
                  fontSize: 10.5,
                ),
              ]),
            ),
          ),
      ],
    );
  }
}

class _OwnerCodes extends StatelessWidget {
  const _OwnerCodes();

  @override
  Widget build(BuildContext context) => Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Guest join codes', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: QuykColors.green)),
              const SizedBox(height: 12),
              for (final (l, sel) in const [('Dine-in', true), ('Takeaway', false), ('Drive-in', false)])
                Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: sel ? QuykColors.limeTint : Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: sel ? QuykColors.green : QuykColors.line),
                  ),
                  child: Row(children: [
                    Expanded(child: Text(l, style: _ink.copyWith(fontSize: 13, fontWeight: FontWeight.w600))),
                    if (sel) const Icon(Icons.check_circle_rounded, size: 18, color: QuykColors.green),
                  ]),
                ),
            ]),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: QuykColors.green, borderRadius: BorderRadius.circular(20)),
              child: Column(children: [
                const Text('Bella Vista', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.white)),
                const Text('SCAN TO JOIN', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: QuykColors.lime)),
                const SizedBox(height: 10),
                Expanded(
                  child: AspectRatio(
                    aspectRatio: 1,
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
                      child: const CustomPaint(painter: _MockQrPainter()),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                _bigButton('Print poster', lime: true, icon: Icons.print_outlined),
              ]),
            ),
          ),
        ],
      );
}

/// Decorative QR-like pattern (not a scannable code).
class _MockQrPainter extends CustomPainter {
  const _MockQrPainter();

  @override
  void paint(Canvas canvas, Size size) {
    const n = 21;
    final cell = size.width / n;
    final paint = Paint()..color = QuykColors.green;
    final rnd = math.Random(7);
    bool finder(int x, int y) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
    for (var y = 0; y < n; y++) {
      for (var x = 0; x < n; x++) {
        var on = rnd.nextDouble() > 0.55;
        if (finder(x, y)) {
          final fx = x >= n - 7 ? x - (n - 7) : x;
          final fy = y >= n - 7 ? y - (n - 7) : y;
          on = fx == 0 || fy == 0 || fx == 6 || fy == 6 || (fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4);
        }
        if (on) canvas.drawRect(Rect.fromLTWH(x * cell, y * cell, cell, cell), paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _OwnerReviews extends StatelessWidget {
  const _OwnerReviews();

  @override
  Widget build(BuildContext context) {
    const reviews = [
      ('Sara K.', 5, 'Loved not standing at the door.'),
      ('Ali R.', 4, 'Quick and easy, wait was accurate.'),
      ('Maria', 5, 'Got called right on time.'),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('Reviews', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: QuykColors.green)),
        const SizedBox(height: 4),
        const Text('Sample guest feedback', style: TextStyle(fontSize: 11, color: QuykColors.subtle)),
        const SizedBox(height: 10),
        for (final (name, stars, text) in reviews)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: _card(
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                QuykAvatar(name: name, size: 30, initialsCount: 1),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      Expanded(child: Text(name, style: _ink.copyWith(fontSize: 13, fontWeight: FontWeight.w600))),
                      for (var i = 0; i < 5; i++)
                        Icon(i < stars ? Icons.star_rounded : Icons.star_outline_rounded, size: 14, color: i < stars ? QuykColors.star : QuykColors.field),
                    ]),
                    const SizedBox(height: 4),
                    Text(text, style: const TextStyle(fontSize: 12, color: QuykColors.muted)),
                  ]),
                ),
              ]),
            ),
          ),
      ],
    );
  }
}

// ── TV screens ─────────────────────────────────────────────────────────────

class _TvPair extends StatelessWidget {
  const _TvPair();

  @override
  Widget build(BuildContext context) => ColoredBox(
        color: QuykColors.green,
        child: Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const QuykLogoTile(size: 44),
            const SizedBox(height: 12),
            const Text('Quyk Display', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: Colors.white)),
            const SizedBox(height: 4),
            const Text('Enter your display code', style: TextStyle(fontSize: 12, color: Colors.white70)),
            const SizedBox(height: 14),
            Row(mainAxisSize: MainAxisSize.min, children: [
              for (final c in 'BV7K2Q'.split(''))
                Container(
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  width: 30,
                  height: 38,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(color: QuykColors.greenPanel, borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.white24)),
                  child: Text(c, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: QuykColors.lime)),
                ),
            ]),
          ]),
        ),
      );
}

class _TvBoard extends StatelessWidget {
  const _TvBoard({this.announcement = false});

  final bool announcement;

  @override
  Widget build(BuildContext context) => ColoredBox(
        color: QuykColors.green,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                flex: 3,
                child: Column(children: [
                  const Align(
                    alignment: Alignment.centerLeft,
                    child: Text('Bella Vista · Dine-in', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.white70)),
                  ),
                  const Spacer(),
                  const Text('NOW SERVING', style: TextStyle(fontSize: 10, letterSpacing: 2, color: Colors.white70)),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                    decoration: BoxDecoration(
                      color: QuykColors.greenPanel,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: QuykColors.lime.withValues(alpha: 0.6), width: 2),
                    ),
                    child: const FittedBox(
                      child: Text('A-108', style: TextStyle(fontSize: 54, fontWeight: FontWeight.w700, color: QuykColors.lime)),
                    ),
                  ),
                  const Spacer(),
                  if (announcement)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      decoration: BoxDecoration(color: QuykColors.lime, borderRadius: BorderRadius.circular(12)),
                      child: const Row(children: [
                        Icon(Icons.campaign_outlined, size: 14, color: QuykColors.green),
                        SizedBox(width: 6),
                        Flexible(
                          child: Text('Please have your ticket ready', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: QuykColors.green)),
                        ),
                      ]),
                    ),
                ]),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('UP NEXT', style: TextStyle(fontSize: 10, letterSpacing: 2, color: Colors.white70)),
                  const SizedBox(height: 8),
                  for (final (i, code) in const [(1, 'A-109'), (2, 'A-110'), (3, 'A-111')])
                    Container(
                      margin: const EdgeInsets.only(bottom: 6),
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(color: QuykColors.greenPanel, borderRadius: BorderRadius.circular(10)),
                      child: Row(children: [
                        Container(
                          width: 20,
                          height: 20,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(color: QuykColors.lime, borderRadius: BorderRadius.circular(6)),
                          child: Text('$i', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: QuykColors.green)),
                        ),
                        const SizedBox(width: 8),
                        Text(code, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white)),
                      ]),
                    ),
                ]),
              ),
            ],
          ),
        ),
      );
}
