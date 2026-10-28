import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../../../core/network/api_error_message.dart' show apiExceptionMessage;
import '../../../core/network/business_api_client.dart';
import '../../../features/auth/presentation/auth_controller.dart';

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
      // Tolerate numbers as well as strings (older menus store price as a number).
      id: json['id']?.toString() ?? UniqueKey().toString(),
      name: json['name']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      price: json['price']?.toString() ?? '0',
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
          .whereType<Map<Object?, Object?>>()
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
  bool _dirty = false;

  void _hydrate(Map<String, dynamic> payload) {
    final menu = payload['menu'] as Map<String, dynamic>? ?? const {};
    final cats = (menu['categories'] as List?) ?? const [];
    _draft = cats
        .whereType<Map<Object?, Object?>>()
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
      setState(() {
        _saving = false;
        _dirty = false;
      });
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
    final ready = _draft != null || async.hasValue;

    Future<void> addCategory() async {
      await _addCategory();
      if (mounted) setState(() => _dirty = true);
    }

    Future<void> editItem(GuestMenuCategoryDraft category, GuestMenuItemDraft? item) async {
      await _editItem(category, item);
      if (mounted) setState(() => _dirty = true);
    }

    void removeItem(GuestMenuCategoryDraft category, int index) {
      final removed = category.items[index];
      setState(() {
        category.items.removeAt(index);
        _dirty = true;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Removed ${removed.name}'),
          action: SnackBarAction(
            label: 'Undo',
            onPressed: () => setState(() => category.items.insert(index, removed)),
          ),
        ),
      );
    }

    return QuykPage(
      title: 'Menu',
      subtitle: _isDefault
          ? 'This is a starter menu. Edit it and save to publish your own for waiting guests.'
          : 'Guests can browse this while they wait.',
      action: Wrap(
        spacing: 8,
        runSpacing: 8,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          if (_dirty) const QuykPill(label: 'Unsaved changes', background: QuykColors.warningTint, foreground: Color(0xFF7A4B0C)),
          OutlinedButton.icon(
            onPressed: ready ? addCategory : null,
            icon: const Icon(Icons.create_new_folder_outlined, size: 18),
            label: const Text('Add category'),
          ),
          FilledButton.icon(
            onPressed: _saving || !(_dirty || _isDefault) ? null : _save,
            icon: _saving
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2, color: QuykColors.lime),
                  )
                : const Icon(Icons.check_rounded, size: 18),
            label: Text(_isDefault && !_dirty ? 'Publish menu' : 'Save menu'),
          ),
        ],
      ),
      onRefresh: _dirty ? null : () async => ref.invalidate(guestMenuProvider),
      children: [
        ...async.when(
          loading: () => _draft == null ? const [QuykLoadingBlock()] : _sections(_draft!, editItem, removeItem),
          error: (e, _) => [
            QuykMessageCard(
              icon: Icons.cloud_off_rounded,
              title: 'We couldn’t load your menu',
              subtitle: apiExceptionMessage(e),
              actionLabel: 'Try again',
              onAction: () => ref.invalidate(guestMenuProvider),
            ),
          ],
          data: (payload) {
            _draft ??= () {
              final menu = payload['menu'] as Map<String, dynamic>? ?? const {};
              final cats = (menu['categories'] as List?) ?? const [];
              _isDefault = payload['isDefault'] == true;
              return cats
                  .whereType<Map<Object?, Object?>>()
                  .map((e) => GuestMenuCategoryDraft.fromJson(Map<String, dynamic>.from(e)))
                  .toList();
            }();
            return _sections(_draft!, editItem, removeItem);
          },
        ),
      ],
    );
  }

  List<Widget> _sections(
    List<GuestMenuCategoryDraft> draft,
    Future<void> Function(GuestMenuCategoryDraft, GuestMenuItemDraft?) editItem,
    void Function(GuestMenuCategoryDraft, int) removeItem,
  ) {
    return [
      if (_error != null) ...[
        QuykCard(
          color: QuykColors.dangerTint,
          borderColor: null,
          child: Text(_error!, style: const TextStyle(color: QuykColors.danger)),
        ),
        const SizedBox(height: 14),
      ],
      if (draft.isEmpty)
        const QuykMessageCard(
          icon: Icons.restaurant_menu_rounded,
          title: 'No categories yet',
          subtitle: 'Add a category, then the dishes guests can browse while they wait.',
        )
      else
        for (final category in draft) ...[
          QuykSectionTitle(
            category.name,
            trailing: Text(
              '${category.items.length} dish${category.items.length == 1 ? '' : 'es'}',
              style: const TextStyle(fontSize: 12, color: QuykColors.subtle),
            ),
          ),
          const SizedBox(height: 10),
          QuykCard(
            padding: const EdgeInsets.fromLTRB(16, 6, 8, 6),
            child: Column(
              children: [
                for (var i = 0; i < category.items.length; i++) ...[
                  if (i > 0) const Divider(height: 1, color: QuykColors.line),
                  _DishRow(
                    item: category.items[i],
                    onEdit: () => editItem(category, category.items[i]),
                    onRemove: () => removeItem(category, i),
                  ),
                ],
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton.icon(
                    onPressed: () => editItem(category, null),
                    icon: const Icon(Icons.add_rounded, size: 18),
                    label: const Text('Add dish'),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
        ],
    ];
  }
}

class _DishRow extends StatelessWidget {
  const _DishRow({required this.item, required this.onEdit, required this.onRemove});

  final GuestMenuItemDraft item;
  final VoidCallback onEdit;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onEdit,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          item.name,
                          style: TextStyle(
                            fontSize: 14.5,
                            fontWeight: FontWeight.w600,
                            color: item.available ? QuykColors.ink : QuykColors.subtle,
                          ),
                        ),
                      ),
                      if (!item.available) ...[
                        const SizedBox(width: 8),
                        const QuykPill(
                          label: 'Unavailable',
                          background: QuykColors.mist,
                          foreground: QuykColors.greenMuted,
                          fontSize: 10.5,
                        ),
                      ],
                    ],
                  ),
                  if (item.description.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      item.description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12.5, color: QuykColors.muted),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 12),
            Text(
              '\$${item.price}',
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: QuykColors.green),
            ),
            IconButton(
              tooltip: 'Edit',
              onPressed: onEdit,
              icon: const Icon(Icons.edit_outlined, size: 19, color: QuykColors.greenMuted),
            ),
            IconButton(
              tooltip: 'Remove',
              onPressed: onRemove,
              icon: const Icon(Icons.delete_outline_rounded, size: 19, color: QuykColors.danger),
            ),
          ],
        ),
      ),
    );
  }
}
