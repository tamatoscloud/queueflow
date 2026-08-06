import 'offline_cache_service.dart';

/// Fetches [fetch] from network, caches on success, falls back to cache on error.
Future<T> cachedFetch<T>({
  required OfflineCacheService cache,
  required String cacheKey,
  required Future<T> Function() fetch,
  required T Function(Map<String, dynamic> json) fromJson,
  required Map<String, dynamic> Function(T value) toJson,
}) async {
  try {
    final result = await fetch();
    await cache.put(cacheKey, toJson(result));
    return result;
  } catch (_) {
    final cached = await cache.get(cacheKey);
    if (cached != null) return fromJson(cached);
    rethrow;
  }
}

/// List variant of [cachedFetch].
Future<List<T>> cachedFetchList<T>({
  required OfflineCacheService cache,
  required String cacheKey,
  required Future<List<T>> Function() fetch,
  required T Function(Map<String, dynamic> json) fromJson,
  required Map<String, dynamic> Function(T value) toJson,
}) async {
  try {
    final result = await fetch();
    await cache.putList(cacheKey, result.map(toJson).toList());
    return result;
  } catch (_) {
    final cached = await cache.getList(cacheKey);
    if (cached != null) return cached.map(fromJson).toList();
    rethrow;
  }
}
