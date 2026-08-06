import 'package:flutter/animation.dart';
import 'package:flutter/material.dart';

/// Motion tokens — 300ms page transitions, spring micro-interactions.
abstract final class AppMotion {
  static const Duration fast = Duration(milliseconds: 150);
  static const Duration normal = Duration(milliseconds: 300);
  static const Duration slow = Duration(milliseconds: 500);
  static const Duration counter = Duration(milliseconds: 800);

  static const Curve easeOut = Curves.easeOutCubic;
  static const Curve easeInOut = Curves.easeInOutCubic;
  static const Curve spring = Curves.elasticOut;

  static const SpringDescription springDescription = SpringDescription(
    mass: 1,
    stiffness: 180,
    damping: 18,
  );

  static Animation<double> scaleOnPress(AnimationController controller) =>
      Tween<double>(begin: 1, end: 0.96).animate(
        CurvedAnimation(parent: controller, curve: easeOut),
      );

  static Animation<double> cardLift(AnimationController controller) =>
      Tween<double>(begin: 0, end: -4).animate(
        CurvedAnimation(parent: controller, curve: easeOut),
      );
}
