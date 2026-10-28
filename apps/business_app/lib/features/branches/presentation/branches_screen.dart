import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../../../core/cache/cached_fetch.dart';
import '../../../core/cache/offline_cache_service.dart';
import '../../../core/models/models.dart';
import '../../../core/network/api_error_message.dart';
import '../../../core/network/business_api_client.dart';
import '../../../core/routing/app_routes.dart';
import '../../../core/session/session_providers.dart';
import '../../../features/auth/presentation/auth_controller.dart';
import '../../../shared/feedback.dart';

final branchesProvider = FutureProvider.autoDispose<List<BranchModel>>((ref) async {
  final api = ref.watch(businessApiClientProvider);
  final cache = ref.watch(offlineCacheProvider);
  final businessId = ref.watch(currentUserProvider)?.businessId;
  return cachedFetchList(
    cache: cache,
    cacheKey: 'branches:${businessId ?? 'all'}',
    fetch: () => api.getBranches(businessId: businessId),
    fromJson: BranchModel.fromJson,
    toJson: (b) => b.toJson(),
  );
});

/// Short location code the backend requires (2–20 of A–Z, 0–9, _ or -).
/// Built from the name's initials, padded from the first word, e.g.
/// "Bella Vista Downtown" → "BVD", "Gulberg" → "GULBERG".
String branchCodeFromName(String name, {Iterable<String> taken = const []}) {
  final words = name
      .toUpperCase()
      .replaceAll(RegExp('[^A-Z0-9 ]'), ' ')
      .split(RegExp(r'\s+'))
      .where((w) => w.isNotEmpty)
      .toList();
  var base = words.length > 1 ? words.map((w) => w[0]).join() : (words.isEmpty ? 'LOC' : words.first);
  if (base.length < 2) base = '${base}X';
  if (base.length > 16) base = base.substring(0, 16);
  final used = taken.map((t) => t.toUpperCase()).toSet();
  var code = base;
  var n = 2;
  while (used.contains(code)) {
    code = '$base-$n';
    n++;
  }
  return code;
}

class BranchesScreen extends ConsumerWidget {
  const BranchesScreen({super.key});

  Future<void> _remove(BuildContext context, WidgetRef ref, BranchModel b) async {
    final ok = await confirmAction(
      context,
      title: 'Remove ${b.name}?',
      message: 'Waiting lines at this location stop taking guests. This can’t be undone from the app.',
      confirmLabel: 'Remove location',
      destructive: true,
    );
    if (!ok || !context.mounted) return;
    final done = await runWithFeedback(
      context,
      () => ref.read(businessApiClientProvider).deleteBranch(b.id),
      success: '${b.name} removed',
      failure: 'Couldn’t remove ${b.name}',
    );
    if (done) {
      if (ref.read(selectedBranchIdProvider) == b.id) {
        ref.read(selectedBranchIdProvider.notifier).state = null;
        await ref.read(sessionBootstrapProvider).saveBranchId(null);
      }
      ref.invalidate(branchesProvider);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(branchesProvider);
    final selected = ref.watch(selectedBranchIdProvider);
    return QuykPage(
      title: 'Locations',
      subtitle: 'Each location has its own waiting lines and guest codes.',
      action: FilledButton.icon(
        onPressed: () => context.push(AppRoutes.branchAdd),
        icon: const Icon(Icons.add_rounded),
        label: const Text('Add location'),
      ),
      onRefresh: () async => ref.invalidate(branchesProvider),
      children: [
        async.when(
          loading: () => const QuykLoadingBlock(),
          error: (e, _) => QuykMessageCard(
            icon: Icons.cloud_off_rounded,
            title: 'We couldn’t load your locations',
            subtitle: apiExceptionMessage(e),
            actionLabel: 'Try again',
            onAction: () => ref.invalidate(branchesProvider),
          ),
          data: (branches) {
            if (branches.isEmpty) {
              return QuykMessageCard(
                icon: Icons.storefront_outlined,
                title: 'No locations yet',
                subtitle: 'Add your first location, then create waiting lines for it.',
                actionLabel: 'Add location',
                onAction: () => context.push(AppRoutes.branchAdd),
              );
            }
            return QuykGrid(
              minTileWidth: 340,
              children: [
                for (final b in branches)
                  QuykCard(
                    padding: const EdgeInsets.all(18),
                    borderColor: b.id == selected ? QuykColors.green : QuykColors.line,
                    child: Row(
                      children: [
                        const QuykIconBubble(icon: Icons.storefront_outlined, size: 44),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                b.name,
                                style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w600,
                                  color: QuykColors.ink,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                [b.address, b.city].whereType<String>().where((s) => s.trim().isNotEmpty).join(', ')
                                    .ifEmpty('No address yet'),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 12, color: QuykColors.subtle),
                              ),
                              if (b.id == selected) ...[
                                const SizedBox(height: 8),
                                const QuykPill(label: 'Showing this location', fontSize: 11),
                              ],
                            ],
                          ),
                        ),
                        PopupMenuButton<String>(
                          tooltip: 'Location options',
                          icon: const Icon(Icons.more_horiz_rounded, color: QuykColors.muted),
                          itemBuilder: (_) => [
                            const PopupMenuItem(value: 'edit', child: Text('Edit details')),
                            if (b.id != selected)
                              const PopupMenuItem(value: 'switch', child: Text('Show only this location')),
                            const PopupMenuItem(
                              value: 'delete',
                              child: Text('Remove', style: TextStyle(color: QuykColors.danger)),
                            ),
                          ],
                          onSelected: (v) async {
                            switch (v) {
                              case 'edit':
                                await context.push(AppRoutes.branchEdit(b.id));
                              case 'switch':
                                ref.read(selectedBranchIdProvider.notifier).state = b.id;
                                await ref.read(sessionBootstrapProvider).saveBranchId(b.id);
                              case 'delete':
                                if (context.mounted) await _remove(context, ref, b);
                            }
                          },
                        ),
                      ],
                    ),
                  ),
              ],
            );
          },
        ),
      ],
    );
  }
}

extension on String {
  String ifEmpty(String fallback) => isEmpty ? fallback : this;
}

class BranchFormScreen extends ConsumerStatefulWidget {
  const BranchFormScreen({super.key, this.branchId});

  final String? branchId;

  @override
  ConsumerState<BranchFormScreen> createState() => _BranchFormScreenState();
}

class _BranchFormScreenState extends ConsumerState<BranchFormScreen> {
  final _name = TextEditingController();
  final _city = TextEditingController();
  final _address = TextEditingController();
  final _phone = TextEditingController();
  bool _saving = false;
  bool _loadingExisting = false;
  String? _loadError;
  String? _error;

  bool get _editing => widget.branchId != null;

  @override
  void initState() {
    super.initState();
    if (_editing) {
      _loadingExisting = true;
      WidgetsBinding.instance.addPostFrameCallback((_) => _loadBranch());
    }
  }

  Future<void> _loadBranch() async {
    setState(() {
      _loadingExisting = true;
      _loadError = null;
    });
    try {
      final branch = await ref.read(businessApiClientProvider).getBranch(widget.branchId!);
      if (!mounted) return;
      _name.text = branch.name;
      _city.text = branch.city ?? '';
      _address.text = branch.address ?? '';
      _phone.text = branch.phone ?? '';
      setState(() => _loadingExisting = false);
    } catch (e) {
      if (mounted) {
        setState(() {
          _loadingExisting = false;
          _loadError = apiExceptionMessage(e);
        });
      }
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _city.dispose();
    _address.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final name = _name.text.trim();
    if (name.isEmpty) {
      setState(() => _error = 'Give the location a name.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    final api = ref.read(businessApiClientProvider);
    final details = {
      'name': name,
      'city': _city.text.trim(),
      'address': _address.text.trim(),
      if (_phone.text.trim().isNotEmpty) 'phone': _phone.text.trim(),
    };
    try {
      if (_editing) {
        // UpdateBranchDto rejects businessId / code.
        await api.updateBranch(widget.branchId!, details);
      } else {
        final businessId = ref.read(currentUserProvider)?.businessId;
        final existing = ref.read(branchesProvider).valueOrNull ?? const <BranchModel>[];
        await api.createBranch({
          ...details,
          if (businessId != null) 'businessId': businessId,
          'code': branchCodeFromName(name, taken: existing.map((b) => b.code ?? branchCodeFromName(b.name))),
        });
      }
      ref.invalidate(branchesProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_editing ? 'Location updated' : '$name added')),
      );
      if (context.canPop()) {
        context.pop();
      } else {
        context.go(AppRoutes.branches);
      }
    } catch (e) {
      if (mounted) setState(() => _error = apiExceptionMessage(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = _editing ? 'Edit location' : 'Add location';
    if (_loadingExisting) {
      return QuykPage(title: title, back: true, children: const [QuykLoadingBlock()]);
    }
    if (_loadError != null) {
      return QuykPage(
        title: title,
        back: true,
        children: [
          QuykMessageCard(
            icon: Icons.cloud_off_rounded,
            title: 'We couldn’t load this location',
            subtitle: _loadError,
            actionLabel: 'Try again',
            onAction: _loadBranch,
          ),
        ],
      );
    }
    return QuykPage(
      title: title,
      subtitle: _editing ? null : 'Guests see the name when they join a line here.',
      back: true,
      maxWidth: 640,
      children: [
        QuykCard(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextField(
                controller: _name,
                autofocus: !_editing,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(labelText: 'Name', hintText: 'e.g. Bella Vista Downtown'),
              ),
              const SizedBox(height: 14),
              TextField(controller: _address, decoration: const InputDecoration(labelText: 'Street address')),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: TextField(controller: _city, decoration: const InputDecoration(labelText: 'City')),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: _phone,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(labelText: 'Phone (optional)'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: 14),
          QuykAuthError(_error!),
        ],
        const SizedBox(height: 20),
        Align(
          alignment: Alignment.centerLeft,
          child: SizedBox(
            width: 240,
            child: QuykAuthButton(
              label: _editing ? 'Save changes' : 'Add location',
              loading: _saving,
              onPressed: _save,
            ),
          ),
        ),
      ],
    );
  }
}
