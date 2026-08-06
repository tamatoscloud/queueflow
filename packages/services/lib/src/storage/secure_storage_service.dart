import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Storage for sensitive values only (auth tokens, refresh tokens). Never
/// use [StorageService] for these — Hive is not encrypted at rest by
/// default and secrets must never be hardcoded or logged.
abstract interface class SecureStorageService {
  Future<void> write(String key, String value);

  Future<String?> read(String key);

  Future<void> delete(String key);

  Future<void> deleteAll();
}

final class FlutterSecureStorageService implements SecureStorageService {
  FlutterSecureStorageService({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  @override
  Future<void> write(String key, String value) =>
      _storage.write(key: key, value: value);

  @override
  Future<String?> read(String key) => _storage.read(key: key);

  @override
  Future<void> delete(String key) => _storage.delete(key: key);

  @override
  Future<void> deleteAll() => _storage.deleteAll();
}
