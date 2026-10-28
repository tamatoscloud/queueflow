import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

export 'package:queueflow_theme/queueflow_theme.dart' show quykFontFamily;

/// Staff app theme: the shared Quyk theme with the staff product identity.
ThemeData buildQuykStaffTheme() => buildQuykTheme(identity: ProductIdentity.staff);
