import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Staff floor UI is designed for the calm light (ivory) theme.
/// System dark mode was making Guests/Reviews cards unreadable against the shell.
final StateProvider<ThemeMode> themeModeProvider = StateProvider<ThemeMode>(
  (ref) => ThemeMode.light,
);
