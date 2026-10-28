import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';
import 'package:queueflow_widgets/queueflow_widgets.dart';

import '../../../core/models/display_config.dart';
import '../../../core/models/queue_models.dart';
import '../../../core/realtime/tv_realtime_client.dart';
import '../../../core/storage/display_config_storage.dart';
import '../providers/display_board_provider.dart';

class DisplayScreen extends ConsumerWidget {
  const DisplayScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final configAsync = ref.watch(displayConfigProvider);
    final config = configAsync.valueOrNull;
    if (config == null) {
      return const Scaffold(
        backgroundColor: QuykColors.green,
        body: Center(child: AppLoadingIndicator(size: 48)),
      );
    }

    ref.watch(displayRealtimeBindingProvider);
    final board = ref.watch(displayBoardProvider);
    final realtimeStatus = ref.watch(tvRealtimeStatusProvider);

    if (config.landscapeOnly) {
      final orientation = MediaQuery.orientationOf(context);
      if (orientation == Orientation.portrait) {
        return Scaffold(
          backgroundColor: QuykColors.green,
          body: Center(
            child: Text(
              'Please rotate to landscape',
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    color: Colors.white,
                  ),
            ),
          ),
        );
      }
    }

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Stack(
        fit: StackFit.expand,
        children: [
          _DisplayBackdrop(config: config),
          _DisplayBody(config: config, board: board),
          if (board.highlightToken != null)
            const Positioned.fill(child: _ConfettiBurst()),
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: _ConnectionBanner(
              status: realtimeStatus.valueOrNull,
              board: board,
              refreshIntervalSeconds: config.refreshIntervalSeconds,
            ),
          ),
          Positioned(
            top: 12,
            right: 12,
            child: _SettingsButton(config: config),
          ),
        ],
      ),
    );
  }
}

class _DisplayBackdrop extends StatelessWidget {
  const _DisplayBackdrop({required this.config});

  final DisplayConfig config;

  @override
  Widget build(BuildContext context) {
    final preset = config.themePreset;
    final accent = _accentColor(config);

    final gradient = switch (preset) {
      DisplayThemePreset.luxury => const LinearGradient(
          colors: [Color(0xFF1a0a2e), Color(0xFF3d1f00), Color(0xFF0f0f0f)],
        ),
      DisplayThemePreset.kids => const LinearGradient(
          colors: [Color(0xFF4F46E5), Color(0xFFEC4899), Color(0xFFF59E0B)],
        ),
      DisplayThemePreset.holiday => const LinearGradient(
          colors: [Color(0xFF14532D), Color(0xFF7F1D1D), Color(0xFF0F172A)],
        ),
      DisplayThemePreset.minimal => LinearGradient(
          colors: [
            config.darkMode ? AppColors.darkBackground : Colors.white,
            config.darkMode ? AppColors.neutral900 : AppColors.neutral100,
          ],
        ),
      DisplayThemePreset.light => const LinearGradient(
          colors: [Color(0xFFF8FAFC), Color(0xFFE2E8F0)],
        ),
      _ => config.darkMode
          ? LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                QuykColors.green,
                const Color(0xFF022E26),
                accent.withValues(alpha: 0.10),
              ],
              stops: const [0.0, 0.55, 1.0],
            )
          : const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                QuykColors.cream,
                QuykColors.mist,
                QuykColors.limeSoft,
              ],
            ),
    };

    return DecoratedBox(
      decoration: BoxDecoration(gradient: gradient),
      child: const SizedBox.expand(),
    );
  }
}

class _SettingsButton extends StatelessWidget {
  const _SettingsButton({required this.config});

  final DisplayConfig config;

  @override
  Widget build(BuildContext context) {
    final brightness = config.darkMode ? Brightness.dark : Brightness.light;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => const DisplaySettingsScreen(),
          ),
        ),
        borderRadius: AppRadius.fullAll,
        child: Ink(
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: QuykColors.greenPanel.withValues(alpha: 0.8),
            border: Border.all(
              color: Colors.white.withValues(alpha: 0.12),
            ),
            boxShadow: AppShadows.sm(brightness),
          ),
          child: const Padding(
            padding: EdgeInsets.all(12),
            child: Icon(Icons.settings_outlined, color: Colors.white70, size: 22),
          ),
        ),
      ),
    );
  }
}

class _DisplayBody extends StatelessWidget {
  const _DisplayBody({required this.config, required this.board});

  final DisplayConfig config;
  final DisplayBoardState board;

  @override
  Widget build(BuildContext context) {
    if (board.isLoading && board.snapshot == null) {
      return const Center(child: AppLoadingIndicator(size: 56));
    }

    return switch (config.layoutMode) {
      DisplayLayoutMode.nowServingLarge => Mode1Layout(config: config, board: board),
      DisplayLayoutMode.splitAnnouncements => Mode2Layout(config: config, board: board),
      DisplayLayoutMode.minimal => Mode3Layout(config: config, board: board),
      DisplayLayoutMode.brand => Mode4Layout(config: config, board: board),
    };
  }
}

class Mode1Layout extends StatelessWidget {
  const Mode1Layout({super.key, required this.config, required this.board});

  final DisplayConfig config;
  final DisplayBoardState board;

  @override
  Widget build(BuildContext context) {
    final snapshot = board.snapshot;
    final landing = board.landing;
    final called = snapshot?.currentCalled;
    final next = snapshot?.waitingEntries.take(3).toList() ?? [];
    final scale = config.fontScale;

    return Padding(
      padding: EdgeInsets.all(40 * scale),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DisplayHeader(config: config, landing: landing, snapshot: snapshot),
          const Spacer(),
          _TvSectionLabel(text: 'NOW SERVING', scale: scale),
          SizedBox(height: 20 * scale),
          NowServingToken(
            entry: called,
            config: config,
            highlight: board.highlightToken,
          ),
          const Spacer(),
          _TvSectionLabel(text: 'UP NEXT', scale: scale, align: TextAlign.start),
          SizedBox(height: 16 * scale),
          Expanded(
            flex: 2,
            child: NextCustomersList(entries: next, config: config, maxItems: 3),
          ),
          SizedBox(height: 16 * scale),
          DisplayFooter(config: config, snapshot: snapshot, landing: landing),
        ],
      ),
    );
  }
}

class Mode2Layout extends StatelessWidget {
  const Mode2Layout({super.key, required this.config, required this.board});

  final DisplayConfig config;
  final DisplayBoardState board;

  @override
  Widget build(BuildContext context) {
    final snapshot = board.snapshot;
    final landing = board.landing;
    final called = snapshot?.currentCalled;
    final next = snapshot?.waitingEntries.take(10).toList() ?? [];
    final scale = config.fontScale;

    return Padding(
      padding: EdgeInsets.all(32 * scale),
      child: Row(
        children: [
          Expanded(
            flex: 3,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                DisplayHeader(config: config, landing: landing, snapshot: snapshot),
                const Spacer(),
                _TvSectionLabel(text: 'NOW SERVING', scale: scale),
                SizedBox(height: 16 * scale),
                NowServingToken(
                  entry: called,
                  config: config,
                  highlight: board.highlightToken,
                ),
                const Spacer(),
                DisplayFooter(config: config, snapshot: snapshot, landing: landing),
              ],
            ),
          ),
          SizedBox(width: 32 * scale),
          Expanded(
            flex: 2,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _TvSectionLabel(text: 'NEXT IN LINE', scale: scale, align: TextAlign.start),
                SizedBox(height: 16 * scale),
                Expanded(
                  child: NextCustomersList(entries: next, config: config, maxItems: 10),
                ),
                if (config.announcementMessage?.isNotEmpty == true) ...[
                  SizedBox(height: 20 * scale),
                  AnnouncementCard(message: config.announcementMessage!),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class Mode3Layout extends StatelessWidget {
  const Mode3Layout({super.key, required this.config, required this.board});

  final DisplayConfig config;
  final DisplayBoardState board;

  @override
  Widget build(BuildContext context) {
    final called = board.snapshot?.currentCalled;
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _TvSectionLabel(text: 'NOW SERVING', scale: config.fontScale),
          SizedBox(height: 24 * config.fontScale),
          NowServingToken(
            entry: called,
            config: config,
            highlight: board.highlightToken,
            minimal: true,
          ),
        ],
      ),
    );
  }
}

class Mode4Layout extends StatelessWidget {
  const Mode4Layout({super.key, required this.config, required this.board});

  final DisplayConfig config;
  final DisplayBoardState board;

  @override
  Widget build(BuildContext context) {
    final primary = _accentColor(config);

    return DecoratedBox(
      decoration: BoxDecoration(
        image: config.backgroundImageUrl != null
            ? DecorationImage(
                image: NetworkImage(config.backgroundImageUrl!),
                fit: BoxFit.cover,
                colorFilter: ColorFilter.mode(
                  Colors.black.withValues(alpha: 0.55),
                  BlendMode.darken,
                ),
              )
            : null,
        gradient: config.backgroundImageUrl == null
            ? LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  primary,
                  primary.withValues(alpha: 0.75),
                  QuykColors.green,
                ],
              )
            : null,
      ),
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Colors.transparent,
              Colors.black.withValues(alpha: 0.35),
            ],
          ),
        ),
        child: Mode1Layout(config: config, board: board),
      ),
    );
  }
}

class DisplayHeader extends StatelessWidget {
  const DisplayHeader({
    super.key,
    required this.config,
    required this.landing,
    required this.snapshot,
  });

  final DisplayConfig config;
  final QueueLandingModel? landing;
  final QueueSnapshotModel? snapshot;

  @override
  Widget build(BuildContext context) {
    final logo = config.businessLogoUrl ?? landing?.businessLogoUrl;
    final scale = config.fontScale;
    final brightness = Theme.of(context).brightness;

    return AppCard(
      variant: AppCardVariant.filled,
      padding: EdgeInsets.symmetric(horizontal: 24 * scale, vertical: 16 * scale),
      child: Row(
        children: [
          if (logo != null) ...[
            ClipRRect(
              borderRadius: AppRadius.lgAll,
              child: Image.network(
                logo,
                height: 64 * scale,
                errorBuilder: (_, __, ___) => AppAvatar(
                  imageUrl: null,
                  name: config.businessName,
                  size: 64 * scale,
                ),
              ),
            ),
            SizedBox(width: 20 * scale),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  config.businessName,
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        fontSize: 32 * scale,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.5,
                      ),
                ),
                SizedBox(height: 4 * scale),
                Text(
                  '${config.branchName} · ${config.queueName}',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontSize: 18 * scale,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                ),
              ],
            ),
          ),
          QueueStatusChip(status: snapshot?.queue.status ?? landing?.queue.status ?? 'ACTIVE'),
          SizedBox(width: 20 * scale),
          DecoratedBox(
            decoration: BoxDecoration(
              borderRadius: AppRadius.lgAll,
              border: Border.all(
                color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.5),
              ),
              boxShadow: AppShadows.sm(brightness),
            ),
            child: ClockWidget(fontScale: config.fontScale),
          ),
        ],
      ),
    );
  }
}

class NowServingToken extends StatefulWidget {
  const NowServingToken({
    super.key,
    required this.entry,
    required this.config,
    this.highlight,
    this.minimal = false,
  });

  final QueueEntryModel? entry;
  final DisplayConfig config;
  final String? highlight;
  final bool minimal;

  @override
  State<NowServingToken> createState() => _NowServingTokenState();
}

class _NowServingTokenState extends State<NowServingToken>
    with TickerProviderStateMixin {
  late final AnimationController _blink;
  late final AnimationController _glow;

  @override
  void initState() {
    super.initState();
    _blink = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
      lowerBound: 0.4,
      upperBound: 1,
    );
    _glow = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    )..repeat(reverse: true);
    if (widget.config.blinkCurrentCustomer) {
      _blink.repeat(reverse: true);
    }
  }

  @override
  void didUpdateWidget(covariant NowServingToken oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.highlight != null && widget.highlight != oldWidget.highlight) {
      _blink
        ..reset()
        ..repeat(reverse: true);
      _glow
        ..reset()
        ..repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _blink.dispose();
    _glow.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final token = widget.entry?.displayCode ?? '—';
    final name = widget.entry?.customerName;
    final showName = widget.config.showCustomerNames &&
        !widget.config.tokensOnly &&
        name != null;
    final accent = _accentColor(widget.config);
    final scale = widget.config.fontScale;
    final baseSize = widget.minimal ? 160.0 : 120.0;

    final tokenStyle = TextStyle(
      fontSize: baseSize * scale,
      fontWeight: FontWeight.w800,
      letterSpacing: 8,
      height: 1.0,
    );

    Widget tokenWidget = AnimatedBuilder(
      animation: _glow,
      builder: (context, child) {
        final glowStrength = 0.25 + (_glow.value * 0.35);
        return Container(
          padding: EdgeInsets.symmetric(
            horizontal: 48 * scale,
            vertical: 28 * scale,
          ),
          decoration: BoxDecoration(
            borderRadius: AppRadius.xxlAll,
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                accent.withValues(alpha: 0.18 + _glow.value * 0.08),
                QuykColors.greenPanel.withValues(alpha: 0.5 + _glow.value * 0.1),
              ],
            ),
            border: Border.all(
              color: accent.withValues(alpha: 0.45 + _glow.value * 0.25),
              width: 2,
            ),
            boxShadow: AppShadows.glow(accent)
                .map(
                  (s) => s.copyWith(
                    color: accent.withValues(alpha: glowStrength),
                    blurRadius: 32 + _glow.value * 24,
                    spreadRadius: 2 + _glow.value * 4,
                  ),
                )
                .toList(),
          ),
          child: child,
        );
      },
      child: ShaderMask(
        shaderCallback: (bounds) => LinearGradient(
          colors: [accent, QuykColors.limeSoft],
        ).createShader(bounds),
        child: Text(
          token,
          style: tokenStyle.copyWith(color: Colors.white),
          textAlign: TextAlign.center,
        ),
      ),
    );

    if (widget.config.blinkCurrentCustomer && widget.entry != null) {
      tokenWidget = FadeTransition(opacity: _blink, child: tokenWidget);
    }

    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 400),
      switchInCurve: Curves.easeOutCubic,
      switchOutCurve: Curves.easeInCubic,
      child: Column(
        key: ValueKey(token),
        mainAxisSize: MainAxisSize.min,
        children: [
          tokenWidget,
          if (showName) ...[
            SizedBox(height: 20 * scale),
            Text(
              name,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontSize: 28 * scale,
                    fontWeight: FontWeight.w500,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
          ],
        ],
      ),
    );
  }
}

class NextCustomersList extends StatelessWidget {
  const NextCustomersList({
    super.key,
    required this.entries,
    required this.config,
    required this.maxItems,
  });

  final List<QueueEntryModel> entries;
  final DisplayConfig config;
  final int maxItems;

  @override
  Widget build(BuildContext context) {
    final items = entries.take(maxItems).toList();
    final scale = config.fontScale;

    if (items.isEmpty) {
      return const Center(
        child: EmptyStateView(
          title: 'No customers waiting',
          icon: Icons.people_outline_rounded,
        ),
      );
    }

    return ListView.separated(
      itemCount: items.length,
      separatorBuilder: (_, __) => SizedBox(height: 10 * scale),
      itemBuilder: (context, index) {
        final e = items[index];
        final label = config.tokensOnly || !config.showCustomerNames
            ? e.displayCode
            : '${e.displayCode} · ${e.customerName ?? 'Guest'}';

        return AppCard(
          variant: AppCardVariant.filled,
          padding: EdgeInsets.symmetric(horizontal: 20 * scale, vertical: 14 * scale),
          child: Row(
            children: [
              Container(
                width: 52 * scale,
                height: 52 * scale,
                decoration: BoxDecoration(
                  color: QuykColors.lime,
                  borderRadius: AppRadius.lgAll,
                ),
                alignment: Alignment.center,
                child: Text(
                  '${index + 1}',
                  style: TextStyle(
                    color: QuykColors.green,
                    fontSize: 22 * scale,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              SizedBox(width: 16 * scale),
              Expanded(
                child: Text(
                  label,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontSize: 28 * scale,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.5,
                      ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class DisplayFooter extends StatelessWidget {
  const DisplayFooter({
    super.key,
    required this.config,
    required this.snapshot,
    required this.landing,
  });

  final DisplayConfig config;
  final QueueSnapshotModel? snapshot;
  final QueueLandingModel? landing;

  @override
  Widget build(BuildContext context) {
    final wait = landing?.estimatedWaitMinutes ??
        snapshot?.metrics.averageWaitMinutes ??
        0;
    final scale = config.fontScale;
    final footer = config.footerMessage ?? 'Estimated wait';

    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(
          child: Text(
            footer,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontSize: 20 * scale,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
          ),
        ),
        if (snapshot != null) ...[
          _WaitCountdown(minutes: wait, scale: scale),
          SizedBox(width: 32 * scale),
          MetricCard(
            label: 'Waiting',
            value: '${snapshot!.metrics.waitingCount}',
            icon: Icons.people_alt_outlined,
            accentColor: AppColors.secondary,
          ),
        ] else
          _WaitCountdown(minutes: wait, scale: scale),
      ],
    );
  }
}

class _WaitCountdown extends StatelessWidget {
  const _WaitCountdown({required this.minutes, required this.scale});

  final int minutes;
  final double scale;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      variant: AppCardVariant.gradient,
      gradient: const LinearGradient(colors: [QuykColors.greenPanel, QuykColors.greenMuted]),
      padding: EdgeInsets.symmetric(horizontal: 28 * scale, vertical: 16 * scale),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.baseline,
        textBaseline: TextBaseline.alphabetic,
        children: [
          Text(
            '~$minutes',
            style: TextStyle(
              fontSize: 56 * scale,
              fontWeight: FontWeight.w800,
              color: Colors.white,
              height: 1.0,
              letterSpacing: -1,
            ),
          ),
          SizedBox(width: 8 * scale),
          Text(
            'min',
            style: TextStyle(
              fontSize: 22 * scale,
              fontWeight: FontWeight.w500,
              color: Colors.white.withValues(alpha: 0.85),
            ),
          ),
        ],
      ),
    );
  }
}

class QueueStatusChip extends StatelessWidget {
  const QueueStatusChip({super.key, required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final variant = switch (status) {
      'PAUSED' => AppBadgeVariant.warning,
      'CLOSED' => AppBadgeVariant.danger,
      _ => AppBadgeVariant.success,
    };
    return AppBadge(
      label: status,
      variant: variant,
      icon: switch (status) {
        'PAUSED' => Icons.pause_circle_outline,
        'CLOSED' => Icons.cancel_outlined,
        _ => Icons.check_circle_outline,
      },
    );
  }
}

class ClockWidget extends StatelessWidget {
  const ClockWidget({super.key, this.fontScale = 1});

  final double fontScale;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder(
      stream: Stream<void>.periodic(const Duration(seconds: 1)),
      builder: (context, _) {
        final now = DateFormat('HH:mm').format(DateTime.now());
        return Padding(
          padding: EdgeInsets.symmetric(horizontal: 16 * fontScale, vertical: 10 * fontScale),
          child: Text(
            now,
            style: TextStyle(
              fontSize: 36 * fontScale,
              fontWeight: FontWeight.w700,
              letterSpacing: 2,
              fontFeatures: const [FontFeature.tabularFigures()],
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
        );
      },
    );
  }
}

class AnnouncementCard extends StatelessWidget {
  const AnnouncementCard({super.key, required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      variant: AppCardVariant.gradient,
      gradient: const LinearGradient(colors: [QuykColors.lime, QuykColors.limeSoft]),
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Row(
        children: [
          const Icon(Icons.campaign_outlined, color: QuykColors.green, size: 28),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Text(
              message,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: QuykColors.green,
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TvSectionLabel extends StatelessWidget {
  const _TvSectionLabel({
    required this.text,
    required this.scale,
    this.align = TextAlign.center,
  });

  final String text;
  final double scale;
  final TextAlign align;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      textAlign: align,
      style: Theme.of(context).textTheme.labelLarge?.copyWith(
            fontSize: 20 * scale,
            fontWeight: FontWeight.w600,
            letterSpacing: 6,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
    );
  }
}

class _ConnectionBanner extends ConsumerWidget {
  const _ConnectionBanner({
    required this.status,
    required this.board,
    required this.refreshIntervalSeconds,
  });

  final RealtimeStatus? status;
  final DisplayBoardState board;
  final int refreshIntervalSeconds;

  bool get _isStale {
    final updated = board.lastUpdatedAt;
    if (updated == null) return board.snapshot == null && !board.isLoading;
    final threshold = Duration(seconds: refreshIntervalSeconds * 3);
    return DateTime.now().difference(updated) > threshold;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final current = status;
    final isConnected = current == RealtimeStatus.connected;
    final hasConnectionIssue = current != null && !isConnected;
    final isStale = board.lastError != null || _isStale;

    if (!hasConnectionIssue && !isStale) {
      if (!isConnected) return const SizedBox.shrink();
      return Material(
        color: AppColors.success.withValues(alpha: 0.9),
        elevation: 2,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
              ),
              const SizedBox(width: 10),
              Text(
                'Live',
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
              ),
            ],
          ),
        ),
      );
    }

    final message = switch ((hasConnectionIssue, isStale)) {
      (true, true) => 'Connection lost · Queue information may be outdated',
      (true, false) => 'Connection lost · Updating automatically',
      (false, true) => 'Queue information may be outdated',
      _ => '',
    };

    if (message.isEmpty) return const SizedBox.shrink();

    return Material(
      color: AppColors.warning.withValues(alpha: 0.95),
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        child: Row(
          children: [
            if (hasConnectionIssue)
              const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
              )
            else
              const Icon(Icons.info_outline, color: Colors.white, size: 18),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                message,
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w500,
                    ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class DisplaySettingsScreen extends ConsumerWidget {
  const DisplaySettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final config = ref.watch(displayConfigProvider).valueOrNull;
    if (config == null) {
      return const Scaffold(body: Center(child: Text('No configuration')));
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Display Settings')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          AppCard(
            child: Column(
              children: [
                ListTile(
                  title: const Text('Display code'),
                  subtitle: Text(
                    config.displayToken,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                const Divider(height: 1),
                ListTile(
                  title: const Text('Queue ID'),
                  subtitle: Text(config.queueId),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          AppCard(
            child: Column(
              children: [
                SwitchListTile(
                  title: const Text('Show customer names'),
                  value: config.showCustomerNames,
                  onChanged: (v) => _update(ref, config.copyWith(showCustomerNames: v)),
                ),
                SwitchListTile(
                  title: const Text('Tokens only'),
                  value: config.tokensOnly,
                  onChanged: (v) => _update(ref, config.copyWith(tokensOnly: v)),
                ),
                SwitchListTile(
                  title: const Text('Dark mode'),
                  value: config.darkMode,
                  onChanged: (v) => _update(ref, config.copyWith(darkMode: v)),
                ),
                SwitchListTile(
                  title: const Text('Sound on call'),
                  value: config.soundOnCall,
                  onChanged: (v) => _update(ref, config.copyWith(soundOnCall: v)),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          AppCard(
            child: Column(
              children: [
                ListTile(
                  title: const Text('Font scale'),
                  subtitle: Slider(
                    value: config.fontScale,
                    min: 0.8,
                    max: 1.6,
                    divisions: 8,
                    label: config.fontScale.toStringAsFixed(1),
                    onChanged: (v) => _update(ref, config.copyWith(fontScale: v)),
                  ),
                ),
                ListTile(
                  title: const Text('Refresh interval (seconds)'),
                  subtitle: Slider(
                    value: config.refreshIntervalSeconds.toDouble(),
                    min: 5,
                    max: 60,
                    divisions: 11,
                    label: '${config.refreshIntervalSeconds}s',
                    onChanged: (v) => _update(
                      ref,
                      config.copyWith(refreshIntervalSeconds: v.round()),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          const AppButton(
            label: 'Enter fullscreen',
            onPressed: requestTvFullscreen,
            fullWidth: true,
            icon: Icons.fullscreen,
          ),
          const SizedBox(height: AppSpacing.md),
          AppButton(
            label: 'Unpair display',
            onPressed: () async {
              await ref.read(displayConfigProvider.notifier).clear();
              if (context.mounted) Navigator.of(context).pop();
            },
            variant: AppButtonVariant.danger,
            fullWidth: true,
            icon: Icons.link_off,
          ),
        ],
      ),
    );
  }

  Future<void> _update(WidgetRef ref, DisplayConfig config) async {
    await ref.read(displayConfigProvider.notifier).save(config);
  }
}

Color _accentColor(DisplayConfig config) {
  return config.primaryColorValue != null
      ? Color(config.primaryColorValue!)
      : QuykColors.lime;
}

/// Brief celebratory burst when a customer is called.
class _ConfettiBurst extends StatefulWidget {
  const _ConfettiBurst();

  @override
  State<_ConfettiBurst> createState() => _ConfettiBurstState();
}

class _ConfettiBurstState extends State<_ConfettiBurst> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    )..forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, _) {
          return CustomPaint(
            painter: _ConfettiPainter(progress: _controller.value),
            size: Size.infinite,
          );
        },
      ),
    );
  }
}

class _ConfettiPainter extends CustomPainter {
  _ConfettiPainter({required this.progress});

  final double progress;

  static const _colors = [
    QuykColors.lime,
    QuykColors.limeSoft,
    QuykColors.star,
    AppColors.success,
    AppColors.warning,
  ];

  @override
  void paint(Canvas canvas, Size size) {
    if (progress > 0.95) return;
    final random = [0.12, 0.28, 0.45, 0.61, 0.78, 0.91, 0.33, 0.55];
    for (var i = 0; i < random.length; i++) {
      final x = size.width * random[i];
      final y = size.height * (0.2 + progress * 0.7) + (i % 3) * 18;
      final paint = Paint()
        ..color = _colors[i % _colors.length].withValues(alpha: 1 - progress)
        ..style = PaintingStyle.fill;
      canvas.drawCircle(Offset(x, y - progress * 120), 6 - progress * 3, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _ConfettiPainter oldDelegate) =>
      oldDelegate.progress != progress;
}

void requestTvFullscreen() {
  // Web fullscreen — no-op on unsupported platforms during tests.
}
