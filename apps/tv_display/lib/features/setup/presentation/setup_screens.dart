import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';
import 'package:queueflow_widgets/queueflow_widgets.dart';

import '../../../core/models/display_config.dart';
import '../../../core/models/queue_models.dart';
import '../../../core/network/tv_api_client.dart';
import '../../../core/storage/display_config_storage.dart';
import '../data/staff_auth.dart';

final setupBranchesProvider = FutureProvider.autoDispose<List<BranchModel>>((ref) {
  final businessId = ref.watch(staffAuthProvider).session?.user.businessId;
  return ref.watch(staffApiClientProvider).getBranches(businessId: businessId);
});

final setupQueuesProvider =
    FutureProvider.autoDispose.family<List<QueueModel>, String>((ref, branchId) {
  final businessId = ref.watch(staffAuthProvider).session?.user.businessId;
  return ref
      .watch(staffApiClientProvider)
      .getQueues(branchId: branchId, businessId: businessId);
});

class _SetupBackdrop extends StatelessWidget {
  const _SetupBackdrop({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            QuykColors.green,
            Color(0xFF022E26),
            Color(0xFF01241D),
          ],
        ),
      ),
      child: child,
    );
  }
}

class StaffLoginScreen extends ConsumerStatefulWidget {
  const StaffLoginScreen({super.key});

  @override
  ConsumerState<StaffLoginScreen> createState() => _StaffLoginScreenState();
}

class _StaffLoginScreenState extends ConsumerState<StaffLoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  var _loading = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ref.read(staffAuthProvider.notifier).login(
            _email.text.trim(),
            _password.text,
          );
      if (mounted) context.go('/setup/configure');
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: _SetupBackdrop(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.xl),
              child: AppCard(
                padding: const EdgeInsets.all(AppSpacing.xl),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Staff Configuration',
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      'Sign in as Business Owner or Manager to configure this display.',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                    ),
                    const SizedBox(height: AppSpacing.xl),
                    AppTextField(
                      controller: _email,
                      label: 'Email',
                      keyboardType: TextInputType.emailAddress,
                    ),
                    const SizedBox(height: AppSpacing.md),
                    TextFormField(
                      controller: _password,
                      decoration: const InputDecoration(labelText: 'Password'),
                      obscureText: true,
                      onFieldSubmitted: (_) => _submit(),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: AppSpacing.md),
                      AppCard(
                        variant: AppCardVariant.filled,
                        padding: const EdgeInsets.all(AppSpacing.md),
                        child: Row(
                          children: [
                            const Icon(Icons.error_outline, color: AppColors.danger, size: 20),
                            const SizedBox(width: AppSpacing.sm),
                            Expanded(
                              child: Text(
                                _error!,
                                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                      color: AppColors.danger,
                                    ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: AppSpacing.lg),
                    AppButton(
                      label: 'Sign in',
                      onPressed: _loading ? null : _submit,
                      isLoading: _loading,
                      fullWidth: true,
                      icon: Icons.login,
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    AppButton(
                      label: 'Back to public pairing',
                      onPressed: () => context.go('/pair'),
                      variant: AppButtonVariant.ghost,
                      fullWidth: true,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class StaffConfigureScreen extends ConsumerStatefulWidget {
  const StaffConfigureScreen({super.key});

  @override
  ConsumerState<StaffConfigureScreen> createState() => _StaffConfigureScreenState();
}

class _StaffConfigureScreenState extends ConsumerState<StaffConfigureScreen> {
  String? _branchId;
  String? _queueId;
  DisplayLayoutMode _layout = DisplayLayoutMode.nowServingLarge;
  bool _showNames = true;
  bool _darkMode = true;

  Future<void> _save() async {
    if (_branchId == null || _queueId == null) return;
    final api = ref.read(staffApiClientProvider);
    final landing = await api.getQueueLanding(_queueId!);
    final credential = await api.issueDisplayCredential(_queueId!);
    final branches = await ref.read(setupBranchesProvider.future);
    final branch = branches.firstWhere((b) => b.id == _branchId);

    final existing = await ref.read(displayConfigStorageProvider).load();
    final pairingCode = (existing?.queueId == _queueId && existing != null)
        ? existing.displayToken
        : generateDisplayToken();

    final config = DisplayConfig(
      displayToken: pairingCode,
      displayCredential: credential.displayToken,
      queueId: _queueId!,
      queueName: landing.queue.name,
      branchName: branch.name,
      businessName: landing.businessName,
      businessId: branch.businessId,
      branchId: branch.id,
      businessLogoUrl: landing.businessLogoUrl,
      layoutMode: _layout,
      showCustomerNames: _showNames,
      darkMode: _darkMode,
    );

    await ref.read(displayConfigProvider.notifier).save(config);
    if (mounted) context.go('/display');
  }

  @override
  Widget build(BuildContext context) {
    final branches = ref.watch(setupBranchesProvider);
    final queues = _branchId == null
        ? const AsyncValue<List<QueueModel>>.data([])
        : ref.watch(setupQueuesProvider(_branchId!));

    return Scaffold(
      backgroundColor: QuykColors.green,
      appBar: AppBar(
        title: const Text('Configure Display'),
        backgroundColor: QuykColors.greenPanel,
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          const GradientHeader(
            title: 'Display Setup',
            subtitle: 'Choose branch, queue, and layout for this screen.',
            compact: true,
          ),
          const SizedBox(height: AppSpacing.lg),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                branches.when(
                  data: (items) => DropdownButtonFormField<String>(
                    initialValue: _branchId,
                    decoration: const InputDecoration(labelText: 'Branch'),
                    items: items
                        .map((b) => DropdownMenuItem(value: b.id, child: Text(b.name)))
                        .toList(),
                    onChanged: (v) => setState(() {
                      _branchId = v;
                      _queueId = null;
                    }),
                  ),
                  loading: () => const AppLoadingIndicator(),
                  error: (e, _) => Text('$e'),
                ),
                const SizedBox(height: AppSpacing.md),
                queues.when(
                  data: (items) => DropdownButtonFormField<String>(
                    initialValue: _queueId,
                    decoration: const InputDecoration(labelText: 'Queue'),
                    items: items
                        .map((q) => DropdownMenuItem(value: q.id, child: Text(q.name)))
                        .toList(),
                    onChanged: (v) => setState(() => _queueId = v),
                  ),
                  loading: () => const AppLoadingIndicator(),
                  error: (e, _) => Text('$e'),
                ),
                const SizedBox(height: AppSpacing.md),
                DropdownButtonFormField<DisplayLayoutMode>(
                  initialValue: _layout,
                  decoration: const InputDecoration(labelText: 'Display mode'),
                  items: const [
                    DropdownMenuItem(
                      value: DisplayLayoutMode.nowServingLarge,
                      child: Text('Mode 1 — Large Now Serving'),
                    ),
                    DropdownMenuItem(
                      value: DisplayLayoutMode.splitAnnouncements,
                      child: Text('Mode 2 — Split + Announcements'),
                    ),
                    DropdownMenuItem(
                      value: DisplayLayoutMode.minimal,
                      child: Text('Mode 3 — Minimal'),
                    ),
                    DropdownMenuItem(
                      value: DisplayLayoutMode.brand,
                      child: Text('Mode 4 — Brand'),
                    ),
                  ],
                  onChanged: (v) => setState(() => _layout = v ?? _layout),
                ),
                SwitchListTile(
                  title: const Text('Show customer names'),
                  value: _showNames,
                  onChanged: (v) => setState(() => _showNames = v),
                ),
                SwitchListTile(
                  title: const Text('Dark mode'),
                  value: _darkMode,
                  onChanged: (v) => setState(() => _darkMode = v),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          AppButton(
            label: 'Save & start display',
            onPressed: _branchId != null && _queueId != null ? _save : null,
            fullWidth: true,
            icon: Icons.tv,
            size: AppButtonSize.lg,
          ),
        ],
      ),
    );
  }
}

class PublicPairScreen extends ConsumerStatefulWidget {
  const PublicPairScreen({super.key});

  @override
  ConsumerState<PublicPairScreen> createState() => _PublicPairScreenState();
}

class _PublicPairScreenState extends ConsumerState<PublicPairScreen> {
  final _codeController = TextEditingController();
  var _loading = false;
  String? _error;

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _pair() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final storage = ref.read(displayConfigStorageProvider);
      final queueId = await storage.resolveQueueId(_codeController.text);
      if (queueId == null) {
        throw Exception('Display code not found on this device. Use Staff Configuration or enter the Queue ID.');
      }

      final api = ref.read(tvApiClientProvider);
      final landing = await api.getQueueLanding(queueId);
      final existing = await storage.load();

      // Public pairing keeps local pairing UX. Realtime JWT is only issued via
      // authenticated staff setup — never invent a client-side credential.
      final DisplayConfig config;
      if (existing?.queueId == queueId) {
        config = existing!.copyWith(
          queueName: landing.queue.name,
          branchName: landing.branchName,
          businessName: landing.businessName,
          businessLogoUrl: landing.businessLogoUrl,
        );
      } else {
        config = DisplayConfig(
          displayToken: generateDisplayToken(),
          queueId: queueId,
          queueName: landing.queue.name,
          branchName: landing.branchName,
          businessName: landing.businessName,
          businessLogoUrl: landing.businessLogoUrl,
        );
      }

      await ref.read(displayConfigProvider.notifier).save(config);
      if (mounted) context.go('/display');
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: _SetupBackdrop(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.xl),
              child: AppCard(
                padding: const EdgeInsets.all(AppSpacing.xl),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 96,
                      height: 96,
                      decoration: const BoxDecoration(
                        color: QuykColors.lime,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.tv_rounded, size: 48, color: QuykColors.green),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    Text(
                      'Quyk Display',
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      'Waiting for a queue to be connected.\nEnter your display code or queue ID to start.',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                    ),
                    const SizedBox(height: AppSpacing.xl),
                    TextFormField(
                      controller: _codeController,
                      decoration: const InputDecoration(
                        labelText: 'Display code or Queue ID',
                        hintText: 'ABC12345 or UUID',
                      ),
                      textCapitalization: TextCapitalization.characters,
                      onFieldSubmitted: (_) => _pair(),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: AppSpacing.md),
                      AppCard(
                        variant: AppCardVariant.filled,
                        padding: const EdgeInsets.all(AppSpacing.md),
                        child: Row(
                          children: [
                            const Icon(Icons.error_outline, color: AppColors.danger, size: 20),
                            const SizedBox(width: AppSpacing.sm),
                            Expanded(
                              child: Text(
                                _error!,
                                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                      color: AppColors.danger,
                                    ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: AppSpacing.lg),
                    AppButton(
                      label: 'Connect display',
                      onPressed: _loading ? null : _pair,
                      isLoading: _loading,
                      fullWidth: true,
                      icon: Icons.link,
                      size: AppButtonSize.lg,
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    AppButton(
                      label: 'Staff configuration',
                      onPressed: () => context.go('/setup'),
                      variant: AppButtonVariant.ghost,
                      fullWidth: true,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
