import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../../core/models/platform_models.dart';
import '../../core/network/api_error_message.dart';
import '../../core/network/platform_api_client.dart';
import '../../core/routing/app_routes.dart';
import '../../shared/feedback.dart';
import '../../shared/widgets/admin_pager.dart';

typedef TenantQuery = ({int page, String? search, String? status});

final tenantsProvider = FutureProvider.autoDispose.family((ref, TenantQuery args) async {
  final api = ref.watch(platformApiClientProvider);
  return api.listBusinesses(page: args.page, search: args.search, status: args.status);
});

/// Business statuses the backend accepts as filters.
const businessStatusFilters = [
  (value: null, label: 'All'),
  (value: 'ACTIVE', label: 'Active'),
  (value: 'TRIAL', label: 'Trial'),
  (value: 'SUSPENDED', label: 'Suspended'),
  (value: 'CANCELLED', label: 'Cancelled'),
];

Widget businessStatusPill(String status) {
  final (label, bg, fg) = switch (status.toUpperCase()) {
    'ACTIVE' => ('Active', QuykColors.lime, QuykColors.green),
    'TRIAL' => ('Trial', QuykColors.limeSoft, QuykColors.green),
    'SUSPENDED' => ('Suspended', QuykColors.warningTint, const Color(0xFF7A4B0C)),
    'CANCELLED' => ('Cancelled', QuykColors.dangerTint, QuykColors.danger),
    final other => (other, QuykColors.mist, QuykColors.greenMuted),
  };
  return QuykPill(label: label, background: bg, foreground: fg, fontSize: 11);
}

String formatDate(String? iso, {bool time = false}) {
  final parsed = iso == null ? null : DateTime.tryParse(iso);
  if (parsed == null) return '—';
  final local = parsed.toLocal();
  return time ? DateFormat('d MMM yyyy, HH:mm').format(local) : DateFormat.yMMMd().format(local);
}

class TenantsScreen extends ConsumerStatefulWidget {
  const TenantsScreen({super.key});

  @override
  ConsumerState<TenantsScreen> createState() => _TenantsScreenState();
}

class _TenantsScreenState extends ConsumerState<TenantsScreen> {
  int _page = 1;
  String _search = '';
  String? _status;
  final _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  void _applySearch() => setState(() {
        _search = _searchCtrl.text.trim();
        _page = 1;
      });

  @override
  Widget build(BuildContext context) {
    final args = (page: _page, search: _search.isEmpty ? null : _search, status: _status);
    final async = ref.watch(tenantsProvider(args));

    return QuykPage(
      title: 'Businesses',
      subtitle: 'Every restaurant on Quyk.',
      onRefresh: () async => ref.invalidate(tenantsProvider(args)),
      action: FilledButton.icon(
        onPressed: () => _create(context),
        icon: const Icon(Icons.add_rounded),
        label: const Text('Add business'),
      ),
      children: [
        QuykSearchField(
          controller: _searchCtrl,
          hint: 'Search by name or email',
          onSubmitted: (_) => _applySearch(),
          trailing: FilledButton(onPressed: _applySearch, child: const Text('Search')),
        ),
        const SizedBox(height: 14),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final f in businessStatusFilters)
              QuykFilterChip(
                label: f.label,
                selected: _status == f.value,
                onTap: () => setState(() {
                  _status = f.value;
                  _page = 1;
                }),
              ),
          ],
        ),
        const SizedBox(height: 16),
        async.when(
          loading: () => const QuykLoadingBlock(),
          error: (e, _) => QuykMessageCard(
            icon: Icons.cloud_off_rounded,
            title: 'We couldn’t load businesses',
            subtitle: apiExceptionMessage(e),
            actionLabel: 'Try again',
            onAction: () => ref.invalidate(tenantsProvider(args)),
          ),
          data: (page) {
            if (page.items.isEmpty) {
              return QuykMessageCard(
                icon: Icons.storefront_outlined,
                title: _search.isEmpty && _status == null ? 'No businesses yet' : 'No businesses match',
                subtitle: _search.isEmpty && _status == null
                    ? 'Businesses that sign up, or that you add, appear here.'
                    : 'Try a different search or status.',
              );
            }
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                QuykTable(
                  columns: const [
                    QuykColumn('Business', flex: 5),
                    QuykColumn('Email', flex: 4),
                    QuykColumn('Joined', flex: 2),
                    QuykColumn('Status', flex: 2, alignEnd: true),
                  ],
                  onRowTap: (i) => context.go(AppRoutes.tenantDetail(page.items[i].id)),
                  rows: [
                    for (final b in page.items)
                      [
                        Row(
                          children: [
                            QuykAvatar(name: b.name, size: 34, initialsCount: 1),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  QuykCellText(b.name, strong: true),
                                  Text(b.slug, style: const TextStyle(fontSize: 12, color: QuykColors.subtle)),
                                ],
                              ),
                            ),
                          ],
                        ),
                        QuykCellText(b.email ?? '—'),
                        QuykCellText(formatDate(b.createdAt)),
                        businessStatusPill(b.status),
                      ],
                  ],
                ),
                const SizedBox(height: 12),
                AdminPager(
                  page: _page,
                  totalPages: page.totalPages,
                  totalItems: page.totalItems,
                  onPage: (p) => setState(() => _page = p),
                ),
              ],
            );
          },
        ),
      ],
    );
  }

  Future<void> _create(BuildContext context) async {
    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => const _CreateBusinessSheet(),
    );
    if (created == true) ref.invalidate(tenantsProvider);
  }
}

class _CreateBusinessSheet extends ConsumerStatefulWidget {
  const _CreateBusinessSheet();

  @override
  ConsumerState<_CreateBusinessSheet> createState() => _CreateBusinessSheetState();
}

class _CreateBusinessSheetState extends ConsumerState<_CreateBusinessSheet> {
  final _name = TextEditingController();
  final _slug = TextEditingController();
  final _email = TextEditingController();
  bool _slugEdited = false;
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _slug.dispose();
    _email.dispose();
    super.dispose();
  }

  String _slugify(String v) =>
      v.toLowerCase().replaceAll(RegExp('[^a-z0-9]+'), '-').replaceAll(RegExp(r'^-+|-+$'), '');

  Future<void> _save() async {
    if (_name.text.trim().isEmpty || _slug.text.trim().isEmpty) {
      setState(() => _error = 'Name and web address are required.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ref.read(platformApiClientProvider).createBusiness({
        'name': _name.text.trim(),
        'slug': _slug.text.trim(),
        if (_email.text.trim().isNotEmpty) 'email': _email.text.trim(),
      });
      if (!mounted) return;
      Navigator.of(context).pop(true);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${_name.text.trim()} created')));
    } catch (e) {
      if (mounted) setState(() => _error = apiExceptionMessage(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(24, 0, 24, 24 + MediaQuery.viewInsetsOf(context).bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Add a business',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w600, color: QuykColors.green),
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _name,
            autofocus: true,
            decoration: const InputDecoration(labelText: 'Business name'),
            onChanged: (v) {
              if (!_slugEdited) _slug.text = _slugify(v);
            },
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _slug,
            decoration: const InputDecoration(labelText: 'Web address', prefixText: 'quyk.app/'),
            onChanged: (_) => _slugEdited = true,
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(labelText: 'Contact email (optional)'),
          ),
          if (_error != null) ...[
            const SizedBox(height: 14),
            QuykAuthError(_error!),
          ],
          const SizedBox(height: 20),
          QuykAuthButton(label: 'Create business', loading: _saving, onPressed: _save),
        ],
      ),
    );
  }
}

final tenantDetailProvider = FutureProvider.autoDispose.family((ref, String id) async {
  final api = ref.watch(platformApiClientProvider);
  final results = await Future.wait([api.getBusiness(id), api.listBranches(id)]);
  return (business: results[0] as BusinessSummary, branches: results[1] as List<BranchSummary>);
});

class TenantDetailScreen extends ConsumerWidget {
  const TenantDetailScreen({super.key, required this.businessId});

  final String businessId;

  void _leave(BuildContext context) {
    if (context.canPop()) {
      context.pop();
    } else {
      context.go(AppRoutes.tenants);
    }
  }

  Future<void> _setStatus(BuildContext context, WidgetRef ref, BusinessSummary b, String status) async {
    final suspending = status == 'SUSPENDED';
    final ok = await confirmAction(
      context,
      title: suspending ? 'Suspend ${b.name}?' : 'Reactivate ${b.name}?',
      message: suspending
          ? 'Its team can’t run waiting lines and guests can’t join until you reactivate it.'
          : 'Its team and guests get access again straight away.',
      confirmLabel: suspending ? 'Suspend' : 'Reactivate',
      destructive: suspending,
    );
    if (!ok || !context.mounted) return;
    final api = ref.read(platformApiClientProvider);
    final done = await runWithFeedback(
      context,
      () => suspending ? api.deactivateBusiness(b.id) : api.updateBusiness(b.id, {'status': 'ACTIVE'}),
      success: suspending ? '${b.name} suspended' : '${b.name} is active again',
      failure: 'Couldn’t update ${b.name}',
    );
    if (done) {
      ref
        ..invalidate(tenantDetailProvider(b.id))
        ..invalidate(tenantsProvider);
    }
  }

  Future<void> _delete(BuildContext context, WidgetRef ref, BusinessSummary b) async {
    final ok = await confirmAction(
      context,
      title: 'Delete ${b.name}?',
      message: 'This cancels the business and hides it from Quyk. Its locations, lines and team lose access.',
      confirmLabel: 'Delete business',
      destructive: true,
    );
    if (!ok || !context.mounted) return;
    final done = await runWithFeedback(
      context,
      () => ref.read(platformApiClientProvider).deleteBusiness(b.id),
      success: '${b.name} deleted',
      failure: 'Couldn’t delete ${b.name}',
    );
    if (done) {
      ref.invalidate(tenantsProvider);
      if (context.mounted) _leave(context);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(tenantDetailProvider(businessId));
    return async.when(
      loading: () => QuykPage(
        title: 'Business',
        back: true,
        onBack: () => _leave(context),
        children: const [QuykLoadingBlock()],
      ),
      error: (e, _) => QuykPage(
        title: 'Business',
        back: true,
        onBack: () => _leave(context),
        children: [
          QuykMessageCard(
            icon: Icons.cloud_off_rounded,
            title: 'We couldn’t load this business',
            subtitle: apiExceptionMessage(e),
            actionLabel: 'Try again',
            onAction: () => ref.invalidate(tenantDetailProvider(businessId)),
          ),
        ],
      ),
      data: (data) {
        final b = data.business;
        final queues = data.branches.fold<int>(0, (s, br) => s + br.queueCount);
        final staff = data.branches.fold<int>(0, (s, br) => s + br.staffCount);
        final suspended = b.status.toUpperCase() == 'SUSPENDED';
        return QuykPage(
          title: b.name,
          subtitle: [b.email, 'Joined ${formatDate(b.createdAt)}'].whereType<String>().join(' · '),
          back: true,
          onBack: () => _leave(context),
          onRefresh: () async => ref.invalidate(tenantDetailProvider(businessId)),
          action: PopupMenuButton<String>(
            tooltip: 'Business actions',
            onSelected: (v) => switch (v) {
              'suspend' => _setStatus(context, ref, b, 'SUSPENDED'),
              'activate' => _setStatus(context, ref, b, 'ACTIVE'),
              _ => _delete(context, ref, b),
            },
            itemBuilder: (_) => [
              if (suspended)
                const PopupMenuItem(value: 'activate', child: Text('Reactivate business'))
              else
                const PopupMenuItem(value: 'suspend', child: Text('Suspend business')),
              const PopupMenuItem(
                value: 'delete',
                child: Text('Delete business', style: TextStyle(color: QuykColors.danger)),
              ),
            ],
            child: IgnorePointer(
              child: OutlinedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.more_horiz_rounded, size: 18),
                label: const Text('Actions'),
              ),
            ),
          ),
          children: [
            Row(children: [businessStatusPill(b.status), const SizedBox(width: 8), Text(b.slug, style: const TextStyle(color: QuykColors.subtle))]),
            const SizedBox(height: 16),
            if (suspended) ...[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                decoration: BoxDecoration(color: QuykColors.warningTint, borderRadius: BorderRadius.circular(18)),
                child: Row(
                  children: [
                    const Expanded(
                      child: Text(
                        'This business is suspended — its team can’t serve guests.',
                        style: TextStyle(fontSize: 13.5, color: QuykColors.ink),
                      ),
                    ),
                    TextButton(onPressed: () => _setStatus(context, ref, b, 'ACTIVE'), child: const Text('Reactivate')),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],
            QuykGrid(
              minTileWidth: 200,
              children: [
                QuykStatTile(label: 'Branches', value: '${data.branches.length}', icon: Icons.location_on_outlined, highlight: true),
                QuykStatTile(label: 'Waiting lines', value: '$queues', icon: Icons.format_list_numbered_rounded),
                QuykStatTile(label: 'Team members', value: '$staff', icon: Icons.badge_outlined),
              ],
            ),
            const SizedBox(height: 24),
            const QuykSectionTitle('Branches'),
            if (data.branches.isEmpty)
              const QuykMessageCard(
                icon: Icons.location_off_outlined,
                title: 'No branches yet',
                subtitle: 'The owner hasn’t added a location.',
              )
            else
              QuykTable(
                columns: const [
                  QuykColumn('Branch', flex: 4),
                  QuykColumn('Code', flex: 2),
                  QuykColumn('City', flex: 3),
                  QuykColumn('Lines', flex: 1),
                  QuykColumn('Team', flex: 1),
                  QuykColumn('Status', flex: 2, alignEnd: true),
                ],
                rows: [
                  for (final br in data.branches)
                    [
                      QuykCellText(br.name, strong: true),
                      QuykCellText(br.code ?? '—', green: true, strong: true),
                      QuykCellText(br.city ?? '—'),
                      QuykCellText('${br.queueCount}'),
                      QuykCellText('${br.staffCount}'),
                      businessStatusPill(br.status),
                    ],
                ],
              ),
          ],
        );
      },
    );
  }
}
