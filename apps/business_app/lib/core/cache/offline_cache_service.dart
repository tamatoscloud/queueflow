import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_services/queueflow_services.dart';

class OfflineCacheService {
  OfflineCacheService(this._storage);

  final StorageService _storage;

  Future<void> put(String key, Map<String, dynamic> data) async {
    await _storage.put('cache:$key', jsonEncode({
      'data': data,
      'cachedAt': DateTime.now().toIso8601String(),
    }));
  }

  Future<Map<String, dynamic>?> get(String key, {Duration maxAge = const Duration(hours: 24)}) async {
    final raw = _storage.get<String>('cache:$key');
    if (raw == null) return null;
    try {
      final map = jsonDecode(raw) as Map<String, dynamic>;
      final cachedAt = DateTime.parse(map['cachedAt'] as String);
      if (DateTime.now().difference(cachedAt) > maxAge) return null;
      return map['data'] as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  Future<void> putList(String key, List<Map<String, dynamic>> items) async {
    await _storage.put('cache:$key', jsonEncode({
      'data': items,
      'cachedAt': DateTime.now().toIso8601String(),
    }));
  }

  Future<List<Map<String, dynamic>>?> getList(String key) async {
    final raw = _storage.get<String>('cache:$key');
    if (raw == null) return null;
    try {
      final map = jsonDecode(raw) as Map<String, dynamic>;
      final data = map['data'] as List<dynamic>?;
      return data?.whereType<Map<String, dynamic>>().toList();
    } catch (_) {
      return null;
    }
  }
}

final offlineCacheProvider = Provider<OfflineCacheService>((ref) {
  return OfflineCacheService(ref.watch(storageServiceProvider));
});
