import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../../../core/marketing_links.dart';

/// Premium marketing landing — hero, features, pricing, CTA.
class LandingPage extends StatefulWidget {
  const LandingPage({super.key});

  @override
  State<LandingPage> createState() => _LandingPageState();
}

class _LandingPageState extends State<LandingPage> {
  final _scrollController = ScrollController();
  final _pricingKey = GlobalKey();

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToPricing() {
    final context = _pricingKey.currentContext;
    if (context == null) return;
    Scrollable.ensureVisible(
      context,
      duration: const Duration(milliseconds: 450),
      curve: Curves.easeInOut,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        controller: _scrollController,
        slivers: [
          SliverToBoxAdapter(
            child: _HeroSection(
              onBookDemo: openDemoRequest,
              onSeePricing: _scrollToPricing,
            ),
          ),
          const SliverToBoxAdapter(child: _LogoStrip()),
          const SliverToBoxAdapter(child: _FeaturesSection()),
          const SliverToBoxAdapter(child: _HowItWorksSection()),
          SliverToBoxAdapter(
            child: _PricingSection(
              sectionKey: _pricingKey,
              onGetStarted: openGetStarted,
            ),
          ),
          const SliverToBoxAdapter(child: _TestimonialsSection()),
          const SliverToBoxAdapter(child: _FaqSection()),
          SliverToBoxAdapter(child: _CtaSection(onBookDemo: openDemoRequest)),
          const SliverToBoxAdapter(child: _Footer()),
        ],
      ),
    );
  }
}

class _HeroSection extends StatelessWidget {
  const _HeroSection({required this.onBookDemo, required this.onSeePricing});

  final VoidCallback onBookDemo;
  final VoidCallback onSeePricing;
  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final isWide = size.width > 900;

    return Container(
      decoration: BoxDecoration(
        gradient: AppGradients.meshLight,
      ),
      padding: EdgeInsets.symmetric(
        horizontal: isWide ? 80 : 24,
        vertical: isWide ? 80 : 48,
      ),
      child: isWide
          ? Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Expanded(child: _HeroCopy(onBookDemo: onBookDemo, onSeePricing: onSeePricing)),
                const SizedBox(width: 48),
                const Expanded(child: _HeroVisual()),
              ],
            )
          : Column(
              children: [
                _HeroCopy(onBookDemo: onBookDemo, onSeePricing: onSeePricing),
                const SizedBox(height: 40),
                const _HeroVisual(),
              ],
            ),
    );
  }
}

class _HeroCopy extends StatelessWidget {
  const _HeroCopy({required this.onBookDemo, required this.onSeePricing});

  final VoidCallback onBookDemo;
  final VoidCallback onSeePricing;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.1),
            borderRadius: AppRadius.fullAll,
          ),
          child: Text(
            'Queue management for modern businesses',
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w600,
                ),
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        Text(
          'Turn waiting into\na premium experience',
          style: Theme.of(context).textTheme.displaySmall?.copyWith(
                fontWeight: FontWeight.w800,
                height: 1.1,
              ),
        ),
        const SizedBox(height: AppSpacing.md),
        Text(
          'QR join, live tracking, staff console, TV displays, and owner analytics — '
          'one platform built for restaurants, clinics, and service businesses.',
          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                color: AppColors.neutral600,
                height: 1.6,
              ),
        ),
        const SizedBox(height: AppSpacing.xl),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            AppButton(
              label: 'Book a demo',
              icon: Icons.calendar_month_outlined,
              onPressed: onBookDemo,
            ),
            AppButton(
              label: 'See pricing',
              variant: AppButtonVariant.outline,
              onPressed: onSeePricing,
            ),
          ],
        ),
      ],
    );
  }
}

class _HeroVisual extends StatelessWidget {
  const _HeroVisual();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        gradient: AppGradients.primary,
        borderRadius: AppRadius.xxlAll,
        boxShadow: AppShadows.lg(Theme.of(context).brightness),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.queue, color: Colors.white),
              const SizedBox(width: 8),
              Text(
                'Live queue board',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                    ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          _MockQueueRow(token: 'A-042', label: 'Now serving', highlight: true),
          _MockQueueRow(token: 'A-043', label: 'Next'),
          _MockQueueRow(token: 'A-044', label: 'Waiting · 12 min'),
          const SizedBox(height: AppSpacing.md),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.15),
              borderRadius: AppRadius.lgAll,
            ),
            child: Row(
              children: [
                const Icon(Icons.qr_code_2, color: Colors.white, size: 40),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Customers scan to join — no app download',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.white.withValues(alpha: 0.9),
                        ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MockQueueRow extends StatelessWidget {
  const _MockQueueRow({
    required this.token,
    required this.label,
    this.highlight = false,
  });

  final String token;
  final String label;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: highlight
            ? Colors.white
            : Colors.white.withValues(alpha: 0.12),
        borderRadius: AppRadius.lgAll,
      ),
      child: Row(
        children: [
          Text(
            token,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: highlight ? AppColors.primary : Colors.white,
                ),
          ),
          const Spacer(),
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: highlight ? AppColors.neutral600 : Colors.white70,
                  fontWeight: FontWeight.w600,
                ),
          ),
        ],
      ),
    );
  }
}

class _LogoStrip extends StatelessWidget {
  const _LogoStrip();

  @override
  Widget build(BuildContext context) {
    const logos = ['Restaurants', 'Clinics', 'Salons', 'Government', 'Retail'];
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.xl),
      child: Wrap(
        alignment: WrapAlignment.center,
        spacing: 32,
        runSpacing: 12,
        children: logos
            .map(
              (l) => Text(
                l,
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      color: AppColors.neutral400,
                      fontWeight: FontWeight.w600,
                    ),
              ),
            )
            .toList(),
      ),
    );
  }
}

class _FeaturesSection extends StatelessWidget {
  const _FeaturesSection();

  @override
  Widget build(BuildContext context) {
    const features = [
      (Icons.qr_code_scanner, 'QR join', 'Customers join in seconds from any phone.'),
      (Icons.bolt, 'Staff console', 'One-tap call, skip, hold — built for front desk speed.'),
      (Icons.tv, 'TV display', 'Lobby boards with live tokens and branding.'),
      (Icons.insights, 'Owner analytics', 'KPIs, reports, and branch insights at a glance.'),
      (Icons.notifications_active, 'Smart alerts', 'SMS, WhatsApp, and push when it\'s their turn.'),
      (Icons.hub, 'Realtime', 'Socket-powered updates across every screen.'),
    ];

    return _Section(
      title: 'Everything you need to run queues',
      subtitle: 'Six products, one platform — designed for operators and executives alike.',
      child: LayoutBuilder(
        builder: (context, constraints) {
          final cols = constraints.maxWidth > 900 ? 3 : 1;
          return GridView.count(
            crossAxisCount: cols,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 16,
            crossAxisSpacing: 16,
            childAspectRatio: cols == 3 ? 1.4 : 2.2,
            children: [
              for (final f in features)
                AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          gradient: AppGradients.primary,
                          borderRadius: AppRadius.lgAll,
                        ),
                        child: Icon(f.$1, color: Colors.white, size: 22),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        f.$2,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(f.$3, style: Theme.of(context).textTheme.bodySmall),
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

class _HowItWorksSection extends StatelessWidget {
  const _HowItWorksSection();

  @override
  Widget build(BuildContext context) {
    const steps = [
      ('1', 'Scan QR', 'Customer opens your branded join page.'),
      ('2', 'Join queue', 'Get a digital pass with live position.'),
      ('3', 'Get notified', 'Alerts when almost ready and when called.'),
      ('4', 'Serve & delight', 'Staff operates from a fast console; you track KPIs.'),
    ];

    return _Section(
      title: 'How it works',
      child: Column(
        children: [
          for (final s in steps)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: AppCard(
                child: Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: AppColors.primary.withValues(alpha: 0.12),
                      child: Text(
                        s.$1,
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            s.$2,
                            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                  fontWeight: FontWeight.w700,
                                ),
                          ),
                          Text(s.$3, style: Theme.of(context).textTheme.bodySmall),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _PricingSection extends StatelessWidget {
  const _PricingSection({required this.sectionKey, required this.onGetStarted});

  final Key sectionKey;
  final void Function({String plan}) onGetStarted;

  @override
  Widget build(BuildContext context) {
    return _Section(
      key: sectionKey,
      title: 'Simple pricing',
      subtitle: 'Start free. Scale as you grow.',
      child: LayoutBuilder(
        builder: (context, constraints) {
          final isWide = constraints.maxWidth > 800;
          if (isWide) {
            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: _PriceCard(
                    name: 'Starter',
                    price: 'Free',
                    features: const ['2 queues', '1 branch', 'QR portal', 'Email support'],
                    onGetStarted: () => onGetStarted(plan: 'Starter'),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _PriceCard(
                    name: 'Growth',
                    price: '\$29',
                    highlighted: true,
                    features: const ['10 queues per branch', '5 branches', 'TV display', 'SMS alerts'],
                    onGetStarted: () => onGetStarted(plan: 'Growth'),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _PriceCard(
                    name: 'Scale',
                    price: '\$99',
                    features: const [
                      'Unlimited branches',
                      'Unlimited queues',
                      'Priority support',
                      'Custom branding',
                    ],
                    onGetStarted: () => onGetStarted(plan: 'Scale'),
                  ),
                ),
              ],
            );
          }
          return Column(
            children: [
              _PriceCard(
                name: 'Starter',
                price: 'Free',
                features: const ['2 queues', '1 branch', 'QR portal', 'Email support'],
                onGetStarted: () => onGetStarted(plan: 'Starter'),
              ),
              const SizedBox(height: 16),
              _PriceCard(
                name: 'Growth',
                price: '\$29',
                highlighted: true,
                features: const ['10 queues per branch', '5 branches', 'TV display', 'SMS alerts'],
                onGetStarted: () => onGetStarted(plan: 'Growth'),
              ),
              const SizedBox(height: 16),
              _PriceCard(
                name: 'Scale',
                price: '\$99',
                features: const [
                  'Unlimited branches',
                  'Unlimited queues',
                  'Priority support',
                  'Custom branding',
                ],
                onGetStarted: () => onGetStarted(plan: 'Scale'),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _PriceCard extends StatelessWidget {
  const _PriceCard({
    required this.name,
    required this.price,
    required this.features,
    required this.onGetStarted,
    this.highlighted = false,
  });

  final String name;
  final String price;
  final List<String> features;
  final VoidCallback onGetStarted;
  final bool highlighted;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Container(
        decoration: highlighted
            ? BoxDecoration(
                borderRadius: AppRadius.xlAll,
                border: Border.all(color: AppColors.primary, width: 2),
              )
            : null,
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(name, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Text(
              price,
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: AppColors.primary,
                  ),
            ),
            if (price.toLowerCase() != 'free')
              Text('/ month', style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 16),
            for (final f in features)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle, size: 18, color: AppColors.success),
                    const SizedBox(width: 8),
                    Text(f),
                  ],
                ),
              ),
            const SizedBox(height: 16),
            AppButton(label: 'Get started', fullWidth: true, onPressed: onGetStarted),
          ],
        ),
      ),
    );
  }
}

class _TestimonialsSection extends StatelessWidget {
  const _TestimonialsSection();

  @override
  Widget build(BuildContext context) {
    return _Section(
      title: 'Loved by operators',
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '"QueueFlow cut our front-desk chaos in half. Guests love the digital pass."',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(height: 1.5),
            ),
            const SizedBox(height: 12),
            Text(
              '— Maria R., Bella Vista Restaurant',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }
}

class _FaqSection extends StatelessWidget {
  const _FaqSection();

  @override
  Widget build(BuildContext context) {
    return _Section(
      title: 'FAQ',
      child: Column(
        children: [
          _FaqTile(
            q: 'Do customers need to download an app?',
            a: 'No — they scan a QR and join in the browser as a PWA.',
          ),
          _FaqTile(
            q: 'Can staff work offline?',
            a: 'The staff app shows cached data and syncs when connectivity returns.',
          ),
        ],
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
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(q, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text(a, style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }
}

class _CtaSection extends StatelessWidget {
  const _CtaSection({required this.onBookDemo});

  final VoidCallback onBookDemo;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(24),
      padding: const EdgeInsets.all(40),
      decoration: BoxDecoration(
        gradient: AppGradients.primary,
        borderRadius: AppRadius.xxlAll,
      ),
      child: Column(
        children: [
          Text(
            'Ready to modernize your queue?',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                ),
          ),
          const SizedBox(height: 16),
          AppButton(
            label: 'Book a demo',
            variant: AppButtonVariant.secondary,
            onPressed: onBookDemo,
          ),
        ],
      ),
    );
  }
}

class _Footer extends StatelessWidget {
  const _Footer();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Text(
        '© ${DateTime.now().year} QueueFlow. All rights reserved.',
        textAlign: TextAlign.center,
        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.neutral500),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({
    super.key,
    required this.title,
    required this.child,
    this.subtitle,
  });

  final String title;
  final String? subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.sizeOf(context).width > 900;
    return Padding(
      padding: EdgeInsets.symmetric(
        horizontal: isWide ? 80 : 24,
        vertical: AppSpacing.xl,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w800),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 8),
            Text(subtitle!, style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: AppColors.neutral600)),
          ],
          const SizedBox(height: AppSpacing.lg),
          child,
        ],
      ),
    );
  }
}
