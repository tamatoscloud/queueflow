import 'package:admin_panel/core/models/platform_models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('PlatformDashboard parses KPI payload', () {
    final dashboard = PlatformDashboard.fromJson({
      'kpis': {
        'businesses': 3,
        'activeBranches': 5,
        'activeQueues': 8,
        'customersServedToday': 42,
        'notificationsSent': 100,
        'failedNotifications': 2,
        'revenueMrr': null,
        'revenueNote': 'Billing integration pending',
      },
      'systemHealth': {'api': 'up', 'redis': {'status': 'up'}},
      'generatedAt': '2026-07-23T00:00:00.000Z',
    });

    expect(dashboard.kpis.businesses, 3);
    expect(dashboard.kpis.failedNotifications, 2);
    expect(dashboard.systemHealth['api'], 'up');
  });

  test('BusinessSummary fromJson', () {
    final b = BusinessSummary.fromJson({
      'id': 'uuid',
      'name': 'Cafe',
      'slug': 'cafe',
      'status': 'ACTIVE',
      'email': 'cafe@test.com',
    });
    expect(b.name, 'Cafe');
    expect(b.status, 'ACTIVE');
  });
}
