import 'package:flutter/material.dart';

import 'tokens/app_colors.dart';
import 'tokens/app_gradients.dart';
import 'tokens/quyk_colors.dart';

/// Per-product color identity — subtle differentiation while sharing tokens.
enum ProductIdentity {
  customer,
  staff,
  owner,
  tvDisplay,
  platformAdmin,
  marketing,
}

/// Accent + gradient per product surface.
class ProductThemeData {
  const ProductThemeData({
    required this.accent,
    required this.accentLight,
    required this.gradient,
    required this.label,
  });

  final Color accent;
  final Color accentLight;
  final Gradient gradient;
  final String label;

  static ProductThemeData forIdentity(ProductIdentity id) => switch (id) {
        ProductIdentity.customer => const ProductThemeData(
              accent: AppColors.accentPurple,
              accentLight: Color(0xFFF3E8FF),
              gradient: AppGradients.primary,
              label: 'Customer',
            ),
        ProductIdentity.staff => const ProductThemeData(
              accent: QuykColors.green,
              accentLight: QuykColors.limeSoft,
              gradient: LinearGradient(
                colors: [QuykColors.green, QuykColors.greenPanel],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              label: 'Staff',
            ),
        ProductIdentity.owner => const ProductThemeData(
              accent: QuykColors.green,
              accentLight: QuykColors.limeSoft,
              gradient: LinearGradient(
                colors: [QuykColors.green, QuykColors.greenPanel],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              label: 'Owner',
            ),
        ProductIdentity.tvDisplay => const ProductThemeData(
              accent: AppColors.accent,
              accentLight: Color(0xFFFCE7F3),
              gradient: AppGradients.accent,
              label: 'Display',
            ),
        ProductIdentity.platformAdmin => const ProductThemeData(
              accent: AppColors.neutral700,
              accentLight: Color(0xFFF1F5F9),
              gradient: LinearGradient(
                colors: [AppColors.neutral800, AppColors.neutral900],
              ),
              label: 'Platform',
            ),
        ProductIdentity.marketing => const ProductThemeData(
              accent: AppColors.primary,
              accentLight: Color(0xFFEEF2FF),
              gradient: AppGradients.primary,
              label: 'Quyk',
            ),
      };
}

/// Theme extension for product-specific accents in any app.
class ProductTheme extends ThemeExtension<ProductTheme> {
  const ProductTheme({required this.identity});

  final ProductIdentity identity;

  ProductThemeData get data => ProductThemeData.forIdentity(identity);

  @override
  ProductTheme copyWith({ProductIdentity? identity}) =>
      ProductTheme(identity: identity ?? this.identity);

  @override
  ProductTheme lerp(ThemeExtension<ProductTheme>? other, double t) {
    if (other is! ProductTheme) return this;
    return t < 0.5 ? this : other;
  }
}

extension ProductThemeContext on BuildContext {
  ProductThemeData get productTheme =>
      Theme.of(this).extension<ProductTheme>()?.data ??
      ProductThemeData.forIdentity(ProductIdentity.owner);
}
