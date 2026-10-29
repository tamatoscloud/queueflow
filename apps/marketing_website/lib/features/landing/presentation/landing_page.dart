import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../../../core/marketing_links.dart';
import 'product_explorer.dart';

/// Max width of landing page content.
const double _maxWidth = 1160;

/// Quyk landing page: green / lime / cream, matching the guest, staff and
/// owner apps.
class LandingPage extends StatefulWidget {
  const LandingPage({super.key});

  @override
  State<LandingPage> createState() => _LandingPageState();
}

class _LandingPageState extends State<LandingPage> {
  final _scrollController = ScrollController();
  final _tourKey = GlobalKey();
  final _howKey = GlobalKey();
  final _pricingKey = GlobalKey();
  final _faqKey = GlobalKey();

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollTo(GlobalKey key) {
    final context = key.currentContext;
    if (context == null) return;
    Scrollable.ensureVisible(context, duration: const Duration(milliseconds: 450), curve: Curves.easeInOut);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: QuykColors.cream,
      body: CustomScrollView(
        controller: _scrollController,
        slivers: [
          SliverToBoxAdapter(
            child: _NavBar(
              onTour: () => _scrollTo(_tourKey),
              onHow: () => _scrollTo(_howKey),
              onPricing: () => _scrollTo(_pricingKey),
              onFaq: () => _scrollTo(_faqKey),
            ),
          ),
          SliverToBoxAdapter(child: _Hero(onTour: () => _scrollTo(_tourKey))),
          const SliverToBoxAdapter(child: _AudienceStrip()),
          SliverToBoxAdapter(child: _Tour(key: _tourKey)),
          const SliverToBoxAdapter(child: _Benefits()),
          SliverToBoxAdapter(child: _HowItWorks(key: _howKey)),
          SliverToBoxAdapter(child: _Pricing(key: _pricingKey)),
          SliverToBoxAdapter(child: _Faq(key: _faqKey)),
          const SliverToBoxAdapter(child: _CtaBand()),
          const SliverToBoxAdapter(child: _Footer()),
        ],
      ),
    );
  }
}

bool _isWide(BuildContext context) => MediaQuery.sizeOf(context).width >= 900;

/// Centers content at [_maxWidth] with page gutters.
class _Content extends StatelessWidget {
  const _Content({required this.child, this.vertical = 0});

  final Widget child;
  final double vertical;

  @override
  Widget build(BuildContext context) {
    final gutter = MediaQuery.sizeOf(context).width < 600 ? 20.0 : 40.0;
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: gutter, vertical: vertical),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: _maxWidth),
          child: child,
        ),
      ),
    );
  }
}

class _SectionHeading extends StatelessWidget {
  const _SectionHeading({required this.eyebrow, required this.title, this.subtitle, this.light = false});

  final String eyebrow;
  final String title;
  final String? subtitle;
  final bool light;

  @override
  Widget build(BuildContext context) {
    final wide = _isWide(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          eyebrow.toUpperCase(),
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.4,
            color: light ? QuykColors.lime : QuykColors.greenMuted,
          ),
        ),
        const SizedBox(height: 10),
        Text(
          title,
          style: TextStyle(
            fontSize: wide ? 40 : 30,
            height: 1.1,
            fontWeight: FontWeight.w600,
            letterSpacing: -1,
            color: light ? Colors.white : QuykColors.green,
          ),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 12),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 620),
            child: Text(
              subtitle!,
              style: TextStyle(
                fontSize: 16.5,
                height: 1.5,
                color: light ? Colors.white.withValues(alpha: 0.75) : QuykColors.muted,
              ),
            ),
          ),
        ],
      ],
    );
  }
}

// ── Nav ─────────────────────────────────────────────────────────────────────

class _NavBar extends StatelessWidget {
  const _NavBar({required this.onTour, required this.onHow, required this.onPricing, required this.onFaq});

  final VoidCallback onTour;
  final VoidCallback onHow;
  final VoidCallback onPricing;
  final VoidCallback onFaq;

  @override
  Widget build(BuildContext context) {
    final wide = _isWide(context);
    return _Content(
      vertical: 18,
      child: Row(
        children: [
          const QuykLogoTile(size: 40),
          const SizedBox(width: 10),
          const Text(
            'Quyk',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, letterSpacing: -0.5, color: QuykColors.green),
          ),
          const Spacer(),
          if (wide) ...[
            TextButton(onPressed: onTour, child: const Text('Product tour')),
            TextButton(onPressed: onHow, child: const Text('How it works')),
            TextButton(onPressed: onPricing, child: const Text('Pricing')),
            TextButton(onPressed: onFaq, child: const Text('FAQ')),
            const SizedBox(width: 8),
          ],
          const OutlinedButton(onPressed: openBusinessSignIn, child: Text('Sign in')),
          if (wide) ...[
            const SizedBox(width: 8),
            const FilledButton(onPressed: openDemoRequest, child: Text('Book a demo')),
          ],
        ],
      ),
    );
  }
}

// ── Hero ────────────────────────────────────────────────────────────────────

class _Hero extends StatelessWidget {
  const _Hero({required this.onTour});

  final VoidCallback onTour;

  @override
  Widget build(BuildContext context) {
    final wide = _isWide(context);
    final copy = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const QuykPill(
          label: 'Digital waiting lists for restaurants',
          background: QuykColors.limeSoft,
          padding: EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        ),
        const SizedBox(height: 22),
        Text.rich(
          TextSpan(
            children: [
              const TextSpan(text: 'Your queue,\nmade '),
              WidgetSpan(
                alignment: PlaceholderAlignment.baseline,
                baseline: TextBaseline.alphabetic,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  decoration: BoxDecoration(color: QuykColors.lime, borderRadius: BorderRadius.circular(14)),
                  child: Text(
                    'Quyk.',
                    style: TextStyle(
                      fontSize: wide ? 68 : 46,
                      height: 1.05,
                      fontWeight: FontWeight.w600,
                      letterSpacing: -2,
                      color: QuykColors.green,
                    ),
                  ),
                ),
              ),
            ],
          ),
          style: TextStyle(
            fontSize: wide ? 68 : 46,
            height: 1.05,
            fontWeight: FontWeight.w600,
            letterSpacing: -2,
            color: QuykColors.green,
          ),
        ),
        const SizedBox(height: 20),
        ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 520),
          child: const Text(
            'Guests scan a code and join from their phone — no app, no crowding at the door. '
            'Your team calls the next guest from a tablet, and you see every line live.',
            style: TextStyle(fontSize: 18, height: 1.5, color: QuykColors.muted),
          ),
        ),
        const SizedBox(height: 28),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            FilledButton.icon(
              onPressed: openDemoRequest,
              style: FilledButton.styleFrom(minimumSize: const Size(0, 54), padding: const EdgeInsets.symmetric(horizontal: 26)),
              icon: const Icon(Icons.calendar_month_outlined, size: 19),
              label: const Text('Book a demo'),
            ),
            OutlinedButton.icon(
              onPressed: onTour,
              style: OutlinedButton.styleFrom(minimumSize: const Size(0, 54), padding: const EdgeInsets.symmetric(horizontal: 24)),
              icon: const Icon(Icons.play_circle_outline_rounded, size: 19),
              label: const Text('Take the product tour'),
            ),
            TextButton.icon(
              onPressed: openGuestDemo,
              style: TextButton.styleFrom(minimumSize: const Size(0, 54)),
              icon: const Icon(Icons.qr_code_2_rounded, size: 19),
              label: const Text('Try it as a guest'),
            ),
          ],
        ),
        const SizedBox(height: 26),
        const Wrap(
          spacing: 18,
          runSpacing: 8,
          children: [
            _Tick('No app for guests'),
            _Tick('Any tablet or phone'),
            _Tick('Live in a day'),
          ],
        ),
      ],
    );

    return _Content(
      vertical: wide ? 48 : 24,
      child: wide
          ? Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Expanded(flex: 11, child: copy),
                const SizedBox(width: 48),
                const Expanded(flex: 9, child: _HeroVisual()),
              ],
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [copy, const SizedBox(height: 36), const _HeroVisual()],
            ),
    );
  }
}

class _Tick extends StatelessWidget {
  const _Tick(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Icon(Icons.check_circle_rounded, size: 18, color: QuykColors.greenMuted),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: QuykColors.ink)),
      ],
    );
  }
}

/// Staff "who's next" card with a guest's phone view tucked beside it.
class _HeroVisual extends StatelessWidget {
  const _HeroVisual();

  @override
  Widget build(BuildContext context) {
    final reduce = MediaQuery.of(context).disableAnimations;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: reduce ? 1 : 0, end: 1),
      duration: const Duration(milliseconds: 700),
      curve: Curves.easeOutCubic,
      builder: (context, t, child) => Opacity(
        opacity: t,
        child: Transform.translate(offset: Offset(0, 24 * (1 - t)), child: child),
      ),
      child: Padding(
        padding: const EdgeInsets.only(top: 34, left: 34),
        child: Stack(
      clipBehavior: Clip.none,
      children: [
        // Owner dashboard window peeking out behind the staff card.
        Positioned(
          left: -34,
          top: -34,
          right: 60,
          height: 150,
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: QuykColors.line),
              boxShadow: const [BoxShadow(color: Color(0x14003D32), blurRadius: 24, offset: Offset(0, 8))],
            ),
            child: const Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _MiniStat('Waiting now', '9'),
                SizedBox(width: 10),
                _MiniStat('Served today', '42'),
                SizedBox(width: 10),
                _MiniStat('Avg wait', '12m'),
              ],
            ),
          ),
        ),
        Container(
          padding: const EdgeInsets.all(28),
          decoration: BoxDecoration(color: QuykColors.green, borderRadius: BorderRadius.circular(36)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const QuykPill(label: 'Who’s next'),
                  const Spacer(),
                  Text(
                    'Dine-in · Main hall',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white.withValues(alpha: 0.85)),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              const Text(
                'A-108',
                style: TextStyle(fontSize: 84, height: 1, fontWeight: FontWeight.w700, letterSpacing: -3, color: QuykColors.lime),
              ),
              const SizedBox(height: 8),
              const Text(
                'Sara · party of 4',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.w600, color: Colors.white),
              ),
              const SizedBox(height: 14),
              const Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _DarkChip('Waiting 6 min'),
                  _DarkChip('Window table'),
                ],
              ),
              const SizedBox(height: 22),
              Container(
                height: 58,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: QuykColors.lime, borderRadius: BorderRadius.circular(999)),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.room_service_outlined, color: QuykColors.green),
                    SizedBox(width: 8),
                    Text('Call next guest', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: QuykColors.green)),
                  ],
                ),
              ),
              const SizedBox(height: 64),
            ],
          ),
        ),
        Positioned(
          right: 18,
          bottom: -22,
          child: Container(
            width: 230,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: QuykColors.line),
              boxShadow: const [BoxShadow(color: Color(0x22003D32), blurRadius: 24, offset: Offset(0, 10))],
            ),
            child: const Row(
              children: [
                QuykIconBubble(icon: Icons.phone_iphone_rounded, size: 40),
                SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('You’re 2nd in line', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: QuykColors.ink)),
                      SizedBox(height: 2),
                      Text('About 5 min · live', style: TextStyle(fontSize: 12.5, color: QuykColors.muted)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
        ),
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  const _MiniStat(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11, color: QuykColors.subtle)),
          const SizedBox(height: 2),
          Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: QuykColors.green)),
        ],
      ),
    );
  }
}

class _DarkChip extends StatelessWidget {
  const _DarkChip(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(color: QuykColors.greenPanel, borderRadius: BorderRadius.circular(999)),
      child: Text(label, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: Colors.white)),
    );
  }
}

// ── Audience ────────────────────────────────────────────────────────────────

class _AudienceStrip extends StatelessWidget {
  const _AudienceStrip();

  @override
  Widget build(BuildContext context) {
    const items = [
      (Icons.restaurant_rounded, 'Restaurants'),
      (Icons.local_cafe_outlined, 'Cafés'),
      (Icons.storefront_outlined, 'Food courts'),
      (Icons.directions_car_outlined, 'Drive-ins'),
      (Icons.account_tree_outlined, 'Multi-location'),
    ];
    return _Content(
      vertical: 40,
      child: Column(
        children: [
          const Text(
            'Built for busy front doors',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: QuykColors.subtle),
          ),
          const SizedBox(height: 14),
          Wrap(
            alignment: WrapAlignment.center,
            spacing: 10,
            runSpacing: 10,
            children: [
              for (final (icon, label) in items)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: QuykColors.line),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(icon, size: 18, color: QuykColors.green),
                      const SizedBox(width: 8),
                      Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: QuykColors.green)),
                    ],
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Three screens ───────────────────────────────────────────────────────────

class _Tour extends StatelessWidget {
  const _Tour({super.key});

  @override
  Widget build(BuildContext context) {
    return _Content(
      vertical: 56,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionHeading(
            eyebrow: 'Product tour',
            title: 'Four apps, one live line',
            subtitle: 'Pick an app and step through it. Everything updates for everyone the moment it changes — '
                'use the arrows or your keyboard (← →).',
          ),
          const SizedBox(height: 28),
          const ProductExplorer(onBookDemo: openDemoRequest),
        ],
      ),
    );
  }
}

class _Benefits extends StatelessWidget {
  const _Benefits();

  @override
  Widget build(BuildContext context) {
    const items = [
      (Icons.qr_code_scanner_rounded, 'No app for guests', 'A camera scan opens your page. Nothing to install, no account.'),
      (Icons.bolt_rounded, 'Live for everyone', 'Guest phones, the host tablet and the lobby TV update together.'),
      (Icons.person_add_alt_outlined, 'Walk-ins welcome', 'Add guests without a phone and call them by ticket number.'),
      (Icons.call_split_rounded, 'Lines that fit you', 'Separate dine-in, takeaway and drive-in lines, each with its own code.'),
      (Icons.storefront_outlined, 'Every location', 'Switch between branches, or see them all from one owner app.'),
      (Icons.star_outline_rounded, 'Know how it went', 'Guests rate their visit, and you see waits and no-shows by day.'),
    ];
    return _Content(
      vertical: 32,
      child: LayoutBuilder(
        builder: (context, c) {
          final perRow = c.maxWidth >= 900 ? 3 : (c.maxWidth >= 560 ? 2 : 1);
          final width = (c.maxWidth - (perRow - 1) * 16) / perRow;
          return Wrap(
            spacing: 16,
            runSpacing: 16,
            children: [
              for (final (icon, title, body) in items)
                SizedBox(
                  width: width,
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      QuykIconBubble(icon: icon, size: 44),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: QuykColors.green)),
                            const SizedBox(height: 4),
                            Text(body, style: const TextStyle(fontSize: 14.5, height: 1.45, color: QuykColors.muted)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

// ── How it works ────────────────────────────────────────────────────────────

class _HowItWorks extends StatelessWidget {
  const _HowItWorks({super.key});

  @override
  Widget build(BuildContext context) {
    const steps = [
      ('Scan', 'Guests scan the code at your door or on the table.'),
      ('Join', 'Name, party size and phone — they get a ticket instantly.'),
      ('Wait anywhere', 'Their place and wait update live. No refreshing.'),
      ('Get called', 'Your team taps Call next. Their phone says it’s their turn.'),
    ];
    return Container(
      color: QuykColors.green,
      child: _Content(
        vertical: 64,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const _SectionHeading(
              eyebrow: 'How it works',
              title: 'From the door to the table in four steps',
              light: true,
            ),
            const SizedBox(height: 32),
            LayoutBuilder(
              builder: (context, c) {
                final perRow = c.maxWidth >= 900 ? 4 : (c.maxWidth >= 560 ? 2 : 1);
                final width = (c.maxWidth - (perRow - 1) * 16) / perRow;
                return Wrap(
                  spacing: 16,
                  runSpacing: 16,
                  children: [
                    for (var i = 0; i < steps.length; i++)
                      SizedBox(
                        width: width,
                        child: Container(
                          padding: const EdgeInsets.all(22),
                          decoration: BoxDecoration(
                            color: QuykColors.greenPanel,
                            borderRadius: BorderRadius.circular(24),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                width: 40,
                                height: 40,
                                alignment: Alignment.center,
                                decoration: const BoxDecoration(color: QuykColors.lime, shape: BoxShape.circle),
                                child: Text(
                                  '${i + 1}',
                                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: QuykColors.green),
                                ),
                              ),
                              const SizedBox(height: 16),
                              Text(
                                steps[i].$1,
                                style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w600, color: Colors.white),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                steps[i].$2,
                                style: TextStyle(fontSize: 14.5, height: 1.45, color: Colors.white.withValues(alpha: 0.75)),
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

// ── Pricing ─────────────────────────────────────────────────────────────────

class _Pricing extends StatelessWidget {
  const _Pricing({super.key});

  @override
  Widget build(BuildContext context) {
    final cards = [
      _PriceCard(
        name: 'Starter',
        price: 'Free',
        blurb: 'Try Quyk at one location.',
        features: const ['1 location', '2 waiting lines', 'Guest join codes', 'Email support'],
        onTap: () => openGetStarted(plan: 'Starter'),
      ),
      _PriceCard(
        name: 'Growth',
        price: r'$29',
        per: '/ month',
        blurb: 'For busy restaurants and small groups.',
        features: const [
          'Up to 5 locations',
          '10 lines per location',
          'TV display for your lobby',
          'Reports and guest reviews',
          'WhatsApp & SMS alerts (coming soon)',
        ],
        highlight: true,
        onTap: () => openGetStarted(plan: 'Growth'),
      ),
      _PriceCard(
        name: 'Scale',
        price: r'$99',
        per: '/ month',
        blurb: 'For chains and food courts.',
        features: const ['Unlimited locations', 'Unlimited lines', 'Custom branding', 'Priority support'],
        onTap: () => openGetStarted(plan: 'Scale'),
      ),
    ];
    return _Content(
      vertical: 64,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionHeading(
            eyebrow: 'Pricing',
            title: 'Simple plans that grow with you',
            subtitle: 'Start free. Upgrade when you add locations or lines.',
          ),
          const SizedBox(height: 32),
          LayoutBuilder(
            builder: (context, c) {
              if (c.maxWidth < 820) {
                return Column(children: [for (final card in cards) ...[card, const SizedBox(height: 14)]]);
              }
              return IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (var i = 0; i < cards.length; i++) ...[
                      if (i > 0) const SizedBox(width: 16),
                      Expanded(child: cards[i]),
                    ],
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _PriceCard extends StatelessWidget {
  const _PriceCard({
    required this.name,
    required this.price,
    required this.blurb,
    required this.features,
    required this.onTap,
    this.per,
    this.highlight = false,
  });

  final String name;
  final String price;
  final String? per;
  final String blurb;
  final List<String> features;
  final VoidCallback onTap;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    final titleColor = highlight ? Colors.white : QuykColors.green;
    final bodyColor = highlight ? Colors.white.withValues(alpha: 0.8) : QuykColors.muted;
    return Container(
      padding: const EdgeInsets.all(26),
      decoration: BoxDecoration(
        color: highlight ? QuykColors.green : Colors.white,
        borderRadius: BorderRadius.circular(28),
        border: highlight ? null : Border.all(color: QuykColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(name, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: titleColor)),
              if (highlight) ...[
                const SizedBox(width: 10),
                const QuykPill(label: 'Most popular'),
              ],
            ],
          ),
          const SizedBox(height: 6),
          Text(blurb, style: TextStyle(fontSize: 14, color: bodyColor)),
          const SizedBox(height: 18),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                price,
                style: TextStyle(
                  fontSize: 46,
                  height: 1,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -1.5,
                  color: highlight ? QuykColors.lime : QuykColors.green,
                ),
              ),
              if (per != null) ...[
                const SizedBox(width: 6),
                Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Text(per!, style: TextStyle(fontSize: 14, color: bodyColor)),
                ),
              ],
            ],
          ),
          const SizedBox(height: 20),
          for (final f in features)
            Padding(
              padding: const EdgeInsets.only(bottom: 9),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.check_rounded, size: 18, color: highlight ? QuykColors.lime : QuykColors.greenMuted),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      f,
                      style: TextStyle(fontSize: 14.5, color: highlight ? Colors.white : QuykColors.ink),
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: highlight
                ? FilledButton(
                    onPressed: onTap,
                    style: FilledButton.styleFrom(
                      backgroundColor: QuykColors.lime,
                      foregroundColor: QuykColors.green,
                    ),
                    child: const Text('Get started'),
                  )
                : OutlinedButton(onPressed: onTap, child: const Text('Get started')),
          ),
        ],
      ),
    );
  }
}

// ── FAQ ─────────────────────────────────────────────────────────────────────

class _Faq extends StatelessWidget {
  const _Faq({super.key});

  @override
  Widget build(BuildContext context) {
    const faqs = [
      (
        'Do guests need to download an app?',
        'No. They scan the code with their phone camera and join in the browser. No account either.',
      ),
      (
        'What hardware do we need?',
        'Any tablet or phone with a browser for your team. A TV display for the lobby is optional.',
      ),
      (
        'What if a guest doesn’t have a phone?',
        'Your team can add them as a walk-in and call them by name or ticket number.',
      ),
      (
        'Can we run more than one line or location?',
        'Yes — separate lines for dine-in, takeaway or drive-in, and as many locations as your plan allows.',
      ),
      (
        'How long does setup take?',
        'Most restaurants are live the same day: add your lines, print the join codes, and sign your team in.',
      ),
    ];
    return _Content(
      vertical: 40,
      child: LayoutBuilder(
        builder: (context, c) {
          const heading = _SectionHeading(
            eyebrow: 'FAQ',
            title: 'Questions, answered',
            subtitle: 'Anything else? Email us and a real person will reply.',
          );
          final list = Column(
            children: [for (final (q, a) in faqs) _FaqTile(q: q, a: a)],
          );
          if (c.maxWidth < 820) {
            return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [heading, const SizedBox(height: 24), list]);
          }
          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Expanded(flex: 4, child: heading),
              const SizedBox(width: 40),
              Expanded(flex: 6, child: list),
            ],
          );
        },
      ),
    );
  }
}

class _FaqTile extends StatelessWidget {
  const _FaqTile({required this.q, required this.a});

  final String q;
  final String a;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: QuykCard(
        padding: EdgeInsets.zero,
        child: Theme(
          data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
          child: ExpansionTile(
            tilePadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
            childrenPadding: const EdgeInsets.fromLTRB(20, 0, 20, 18),
            iconColor: QuykColors.green,
            collapsedIconColor: QuykColors.green,
            title: Text(q, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: QuykColors.ink)),
            expandedAlignment: Alignment.centerLeft,
            children: [
              Text(a, style: const TextStyle(fontSize: 15, height: 1.5, color: QuykColors.muted)),
            ],
          ),
        ),
      ),
    );
  }
}

// ── CTA + footer ────────────────────────────────────────────────────────────

class _CtaBand extends StatelessWidget {
  const _CtaBand();

  @override
  Widget build(BuildContext context) {
    final wide = _isWide(context);
    return _Content(
      vertical: 40,
      child: Container(
        padding: EdgeInsets.all(wide ? 48 : 28),
        decoration: BoxDecoration(color: QuykColors.lime, borderRadius: BorderRadius.circular(36)),
        child: Builder(
          builder: (context) {
            final title = Text(
              'Ready to make your line Quyk?',
              style: TextStyle(
                fontSize: wide ? 38 : 28,
                height: 1.1,
                fontWeight: FontWeight.w600,
                letterSpacing: -1,
                color: QuykColors.green,
              ),
            );
            final buttons = Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                FilledButton(
                  onPressed: openDemoRequest,
                  style: FilledButton.styleFrom(minimumSize: const Size(0, 54), padding: const EdgeInsets.symmetric(horizontal: 26)),
                  child: const Text('Book a demo'),
                ),
                OutlinedButton(
                  onPressed: openSalesContact,
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(0, 54),
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    side: const BorderSide(color: QuykColors.green, width: 1.4),
                  ),
                  child: const Text('Email us'),
                ),
              ],
            );
            return wide
                ? Row(children: [Expanded(child: title), const SizedBox(width: 24), buttons])
                : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [title, const SizedBox(height: 20), buttons]);
          },
        ),
      ),
    );
  }
}

class _Footer extends StatelessWidget {
  const _Footer();

  @override
  Widget build(BuildContext context) {
    return _Content(
      vertical: 28,
      child: Wrap(
        alignment: WrapAlignment.spaceBetween,
        crossAxisAlignment: WrapCrossAlignment.center,
        spacing: 16,
        runSpacing: 12,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const QuykLogoTile(size: 28),
              const SizedBox(width: 8),
              Text(
                '© ${DateTime.now().year} Quyk',
                style: const TextStyle(fontSize: 13, color: QuykColors.subtle),
              ),
            ],
          ),
          const Wrap(
            spacing: 4,
            children: [
              TextButton(onPressed: openBusinessSignIn, child: Text('Owner sign in')),
              TextButton(onPressed: openStaffSignIn, child: Text('Staff sign in')),
              TextButton(onPressed: openSalesContact, child: Text(salesEmail)),
            ],
          ),
        ],
      ),
    );
  }
}
