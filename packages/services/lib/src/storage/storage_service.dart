import 'package:hive_flutter/hive_flutter.dart';

/// Typed key-value local storage, backed by Hive. Feature code should
/// prefer a dedicated Hive `Box<T>` for structured data and reserve this
/// generic interface for small, ad-hoc values (flags, cached primitives).
abstract interface class StorageService {
  Future<void> init();

  Future<void> put(String key, Object? value);

  T? get<T>(String key, {T? defaultValue});

  Future<void> delete(String key);

  Future<void> clear();
}

final class HiveStorageService implements StorageService {
  HiveStorageService({this.boxName = 'queueflow_storage'});

  final String boxName;
  Box<dynamic>? _box;

  @override
  Future<void> init() async {
    await Hive.initFlutter();
    _box = await Hive.openBox<dynamic>(boxName);
  }

  Box<dynamic> get _requireBox {
    final box = _box;
    if (box == null) {
      throw StateError('HiveStorageService.init() must be awaited before use.');
    }
    return box;
  }

  @override
  Future<void> put(String key, Object? value) => _requireBox.put(key, value);

  @override
  T? get<T>(String key, {T? defaultValue}) =>
      _requireBox.get(key, defaultValue: defaultValue) as T?;

  @override
  Future<void> delete(String key) => _requireBox.delete(key);

  @override
  Future<void> clear() async {
    await _requireBox.clear();
  }
}
