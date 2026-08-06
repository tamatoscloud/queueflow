import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Customer-facing portal base URL for QR codes and join links.
abstract final class CustomerPortalUrl {
  static String get base =>
      dotenv.env['CUSTOMER_PORTAL_URL']?.trim().isNotEmpty == true
          ? dotenv.env['CUSTOMER_PORTAL_URL']!.trim()
          : 'http://localhost:3001';

  static String joinUrl(String queueId) {
    final normalized = base.endsWith('/') ? base.substring(0, base.length - 1) : base;
    return '$normalized/q/$queueId';
  }

  static String branchModeUrl({
    required String mode,
    required String branchId,
    required String queueId,
  }) {
    final normalized = base.endsWith('/') ? base.substring(0, base.length - 1) : base;
    return '$normalized/$mode/$branchId?queue=$queueId';
  }
}
