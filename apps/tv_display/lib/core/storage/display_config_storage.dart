import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_services/queueflow_services.dart';

import '../models/display_config.dart';

const _configKey = 'tv_display_config';

class DisplayConfigStorage {
  DisplayConfigStorage(this._storage);

  final StorageService _storage;

  Future<DisplayConfig?> load() async {
    final raw = _storage.get<String>(_configKey);
    if (raw == null || raw.isEmpty) return null;
    try {
      return DisplayConfig.fromJson(
        jsonDecode(raw) as Map<String, dynamic>,
      );
    } catch (_) {
      return null;
    }
  }

  Future<void> save(DisplayConfig config) async {
    await _storage.put(_configKey, jsonEncode(config.toJson()));
    await _storage.put(
      'token:${config.displayToken.toUpperCase()}',
      config.queueId,
    );
  }

  Future<void> clear() async {
    final config = await load();
    if (config != null) {
      await _storage.delete('token:${config.displayToken.toUpperCase()}');
    }
    await _storage.delete(_configKey);
  }

  Future<String?> resolveQueueId(String code) async {
    final trimmed = code.trim();
    if (trimmed.isEmpty) return null;

    final uuidPattern = RegExp(
      r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
    );
    if (uuidPattern.hasMatch(trimmed)) return trimmed;

    final indexed = _storage.get<String>('token:${trimmed.toUpperCase()}');
    if (indexed != null && indexed.isNotEmpty) return indexed;

    final config = await load();
    if (config != null &&
        config.displayToken.toUpperCase() == trimmed.toUpperCase()) {
      return config.queueId;
    }
    return null;
  }
}

final displayConfigStorageProvider = Provider<DisplayConfigStorage>((ref) {
  return DisplayConfigStorage(ref.watch(storageServiceProvider));
});

final displayConfigProvider =
    AsyncNotifierProvider<DisplayConfigNotifier, DisplayConfig?>(
  DisplayConfigNotifier.new,
);

class DisplayConfigNotifier extends AsyncNotifier<DisplayConfig?> {
  @override
  Future<DisplayConfig?> build() async {
    return ref.read(displayConfigStorageProvider).load();
  }

  Future<void> save(DisplayConfig config) async {
    await ref.read(displayConfigStorageProvider).save(config);
    state = AsyncData(config);
  }

  Future<void> clear() async {
    await ref.read(displayConfigStorageProvider).clear();
    state = const AsyncData(null);
  }
}
