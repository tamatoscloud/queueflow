import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../../core/network/api_error_message.dart' show apiExceptionMessage;
import '../../../core/network/business_api_client.dart';
import '../../../features/auth/presentation/auth_controller.dart';
import '../../../shared/widgets/calm/calm_card.dart';
import '../../../shared/widgets/calm/calm_empty_state.dart';
import '../../../shared/widgets/calm/calm_primary_button.dart';
import '../../../shared/widgets/calm/calm_section_label.dart';

class GuestMenuItemDraft {
  GuestMenuItemDraft({
    required this.id,
    required this.name,
    this.description = '',
    required this.price,
    this.tags = const [],
    this.available = true,
  });

  final String id;
  String name;
  String description;
  String price;
  List<String> tags;
  bool available;

  factory GuestMenuItemDraft.fromJson(Map<String, dynamic> json) {
    return GuestMenuItemDraft(
      id: (json['id'] as String?) ?? UniqueKey().toString(),
      name: (json['name'] as String?) ?? '',
      description: (json['description'] as String?) ?? '',
      price: (json['price'] as String?) ?? '0',
      tags: ((json['tags'] as List?) ?? const []).map((e) => '$e').toList(),
      available: json['available'] != false,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'description': description.isEmpty ? null : description,
        'price': price,
        'tags': tags,
        'available': available,
      };
}

class GuestMenuCategoryDraft {
  GuestMenuCategoryDraft({
    required this.id,
    required this.name,
    List<GuestMenuItemDraft>? items,
  }) : items = items ?? [];

  final String id;
  String name;
  final List<GuestMenuItemDraft> items;

  factory GuestMenuCategoryDraft.fromJson(Map<String, dynamic> json) {
    final rawItems = (json['items'] as List?) ?? const [];
    return GuestMenuCategoryDraft(
      id: (json['id'] as String?) ?? UniqueKey().toString(),
      name: (json['name'] as String?) ?? 'Category',
      items: rawItems
          .whereType<Map>()
          .map((e) => GuestMenuItemDraft.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'items': items.map((e) => e.toJson()).toList(),
      };
}

final guestMenuProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final businessId = ref.watch(currentUserProvider)?.businessId;
  if (businessId == null) {
    throw StateError('No business on session');
  }
  return ref.watch(businessApiClientProvider).getGuestMenu(businessId);
});

class MenuScreen extends ConsumerStatefulWidget {
  const MenuScreen({super.key});

  @override
  ConsumerState<MenuScreen> createState() => _MenuScreenState();
}

class _MenuScreenState extends ConsumerState<MenuScreen> {
  List<GuestMenuCategoryDraft>? _draft;
  bool _saving = false;
  String? _error;
  bool _isDefault = false;

  void _hydrate(Map<String, dynamic> payload) {
    final menu = payload['menu'] as Map<String, dynamic>? ?? const {};
    final cats = (menu['categories'] as List?) ?? const [];
    _draft = cats
        .whereType<Map>()
        .map((e) => GuestMenuCategoryDraft.fromJson(Map<String, dynamic>.from(e)))
        .toList();
    _isDefault = payload['isDefault'] == true;
  }

  Future<void> _save() async {
    final businessId = ref.read(currentUserProvider)?.businessId;
    final draft = _draft;
    if (businessId == null || draft == null) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final saved = await ref.read(businessApiClientProvider).putGuestMenu(
            businessId,
            {'categories': draft.map((c) => c.toJson()).toList()},
          );
      if (!mounted) return;
      _hydrate(saved);
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Menu saved — guests can browse it while waiting')),
      );
      ref.invalidate(guestMenuProvider);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _error = apiExceptionMessage(e);
      });
    }
  }

  Future<void> _editItem(GuestMenuCategoryDraft category, GuestMenuItemDraft? existing) async {
    final nameCtrl = TextEditingController(text: existing?.name ?? '');
    final descCtrl = TextEditingController(text: existing?.description ?? '');
    final priceCtrl = TextEditingController(text: existing?.price ?? '');
    final tagsCtrl = TextEditingController(text: existing?.tags.join(', ') ?? '');
    var available = existing?.available ?? true;

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
          title: Text(existing == null ? 'Add dish' : 'Edit dish'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(labelText: 'Name'),
                ),
                TextField(
                  controller: descCtrl,
                  decoration: const InputDecoration(labelText: 'Description'),
                  maxLines: 2,
                ),
                TextField(
                  controller: priceCtrl,
                  decoration: const InputDecoration(labelText: 'Price (e.g. 18)'),
                  keyboardType: TextInputType.number,
                ),
                TextField(
                  controller: tagsCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Tags',
                    hintText: 'Popular, Vegetarian',
                  ),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Available'),
                  value: available,
                  onChanged: (v) => setLocal(() => available = v),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Save')),
          ],
        ),
      ),
    );

    if (ok != true || !mounted) return;
    final name = nameCtrl.text.trim();
    if (name.isEmpty) return;
    final tags = tagsCtrl.text
        .split(',')
        .map((e) => e.trim())
        .where((e) => e.isNotEmpty)
        .toList();
    setState(() {
      if (existing == null) {
        category.items.add(
          GuestMenuItemDraft(
            id: 'item-${DateTime.now().millisecondsSinceEpoch}',
            name: name,
            description: descCtrl.text.trim(),
            price: priceCtrl.text.trim().isEmpty ? '0' : priceCtrl.text.trim(),
            tags: tags,
            available: available,
          ),
        );
      } else {
        existing
          ..name = name
          ..description = descCtrl.text.trim()
          ..price = priceCtrl.text.trim().isEmpty ? '0' : priceCtrl.text.trim()
          ..tags = tags
          ..available = available;
      }
    });
  }

  Future<void> _addCategory() async {
    final ctrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add category'),
        content: TextField(
          controller: ctrl,
          decoration: const InputDecoration(labelText: 'Category name'),
          autofocus: true,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Add')),
        ],
      ),
    );
    final name = ctrl.text.trim();
    if (ok != true || name.isEmpty || !mounted) return;
    setState(() {
      _draft ??= [];
      _draft!.add(
        GuestMenuCategoryDraft(
          id: 'cat-${DateTime.now().millisecondsSinceEpoch}',
          name: name,
        ),
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(guestMenuProvider);

    return Scaffold(
      backgroundColor: AppColors.calmIvory,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _draft == null ? null : _addCategory,
        icon: const Icon(Icons.create_new_folder_outlined),
        label: const Text('Category'),
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => CalmEmptyState(
          title: 'Could not load menu',
          message: apiExceptionMessage(e),
          actionLabel: 'Retry',
          onAction: () => ref.invalidate(guestMenuProvider),
        ),
        data: (payload) {
          _draft ??= () {
            final menu = payload['menu'] as Map<String, dynamic>? ?? const {};
            final cats = (menu['categories'] as List?) ?? const [];
            _isDefault = payload['isDefault'] == true;
            return cats
                .whereType<Map>()
                .map((e) => GuestMenuCategoryDraft.fromJson(Map<String, dynamic>.from(e)))
                .toList();
          }();
          final draft = _draft!;
          return ListView(
            padding: const EdgeInsets.all(AppSpacing.md),
            children: [
              Text(
                'Menu',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: AppColors.calmCharcoal,
                    ),
              ),
              const SizedBox(height: 4),
              Text(
                _isDefault
                    ? 'Showing the starter menu. Edit and save to publish your own for waiting guests.'
                    : 'Guests see this menu when they tap Browse Menu while waiting.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppColors.calmWarmGray,
                    ),
              ),
              const SizedBox(height: AppSpacing.md),
              CalmPrimaryButton(
                label: 'Save menu',
                isLoading: _saving,
                onPressed: _saving ? null : _save,
              ),
              if (_error != null) ...[
                const SizedBox(height: 8),
                Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
              ],
              const SizedBox(height: AppSpacing.lg),
              if (draft.isEmpty)
                const CalmEmptyState(
                  title: 'No categories yet',
                  message: 'Add a category, then dishes guests can browse while waiting.',
                )
              else
                for (final category in draft) ...[
                  CalmSectionLabel(category.name),
                  CalmCard(
                    child: Column(
                      children: [
                        for (var i = 0; i < category.items.length; i++) ...[
                          if (i > 0) const Divider(height: 1),
                          ListTile(
                            contentPadding: EdgeInsets.zero,
                            title: Text(category.items[i].name),
                            subtitle: Text(
                              [
                                if (category.items[i].description.isNotEmpty)
                                  category.items[i].description,
                                '\$${category.items[i].price}',
                                if (!category.items[i].available) 'Unavailable',
                              ].join(' · '),
                            ),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.edit_outlined),
                                  onPressed: () => _editItem(category, category.items[i]),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete_outline),
                                  onPressed: () => setState(() => category.items.removeAt(i)),
                                ),
                              ],
                            ),
                          ),
                        ],
                        Align(
                          alignment: Alignment.centerLeft,
                          child: TextButton.icon(
                            onPressed: () => _editItem(category, null),
                            icon: const Icon(Icons.add),
                            label: const Text('Add dish'),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                ],
              const SizedBox(height: 72),
            ],
          );
        },
      ),
    );
  }
}
