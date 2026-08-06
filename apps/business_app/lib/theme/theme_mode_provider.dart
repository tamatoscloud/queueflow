import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// App-level UI preference — not a design token (tokens live in
/// `packages/theme`). Defaults to system; a future settings feature will
/// persist the user's choice via `StorageService`.
final StateProvider<ThemeMode> themeModeProvider = StateProvider<ThemeMode>(
  (ref) => ThemeMode.system,
);
