import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Owner portal stays light so calm ivory screens stay readable.
/// Kept for compatibility with any settings UI that still watches it.
final StateProvider<ThemeMode> themeModeProvider = StateProvider<ThemeMode>(
  (ref) => ThemeMode.light,
);
