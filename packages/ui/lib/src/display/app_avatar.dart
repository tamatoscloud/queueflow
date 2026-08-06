import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

/// Circular avatar with initials fallback and optional image.
class AppAvatar extends StatelessWidget {
  const AppAvatar({
    super.key,
    this.imageUrl,
    this.name,
    this.size = 40,
    this.gradient,
  });

  final String? imageUrl;
  final String? name;
  final double size;
  final Gradient? gradient;

  @override
  Widget build(BuildContext context) {
    final initials = _initials(name);
    final decoration = BoxDecoration(
      shape: BoxShape.circle,
      gradient: gradient ?? AppGradients.primary,
      boxShadow: AppShadows.sm(Theme.of(context).brightness),
    );

    if (imageUrl != null && imageUrl!.isNotEmpty) {
      return Container(
        width: size,
        height: size,
        decoration: decoration,
        clipBehavior: Clip.antiAlias,
        child: Image.network(imageUrl!, fit: BoxFit.cover),
      );
    }

    return Container(
      width: size,
      height: size,
      decoration: decoration,
      alignment: Alignment.center,
      child: Text(
        initials,
        style: TextStyle(
          color: Colors.white,
          fontSize: size * 0.38,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  String _initials(String? name) {
    if (name == null || name.isEmpty) return '?';
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.length == 1) return parts[0][0].toUpperCase();
    return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
  }
}
