import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_models/queueflow_models.dart';

import '../models/feedback_model.dart';
import '../models/platform_models.dart';
import 'api_response_parser.dart';
import 'dio_providers.dart';

class PlatformApiClient {
  PlatformApiClient(this._dio, this._parser);

  final Dio _dio;
  final ApiResponseParser _parser;

  Future<PlatformDashboard> getDashboard() => _parser.getData(
        () => _dio.get('/platform/dashboard'),
        PlatformDashboard.fromJson,
      );

  Future<Map<String, dynamic>> getSystemHealth() => _parser.getData(
        () => _dio.get('/platform/health'),
        (json) => json,
      );

  Future<PlatformAnalytics> getAnalytics({String? from, String? to}) =>
      _parser.getData(
        () => _dio.get('/platform/analytics', queryParameters: {
          if (from != null) 'from': from,
          if (to != null) 'to': to,
        }),
        PlatformAnalytics.fromJson,
      );

  Future<PaginatedResponse<BusinessSummary>> listBusinesses({
    int page = 1,
    int pageSize = 20,
    String? search,
    String? status,
  }) =>
      _parser.getPaginated(
        () => _dio.get('/platform/businesses', queryParameters: {
          'page': page,
          'pageSize': pageSize,
          if (search != null && search.isNotEmpty) 'search': search,
          if (status != null) 'status': status,
        }),
        BusinessSummary.fromJson,
      );

  Future<BusinessSummary> getBusiness(String id) => _parser.getData(
        () => _dio.get('/platform/businesses/$id'),
        BusinessSummary.fromJson,
      );

  Future<BusinessSummary> createBusiness(Map<String, dynamic> body) =>
      _parser.getData(
        () => _dio.post('/platform/businesses', data: body),
        BusinessSummary.fromJson,
      );

  Future<BusinessSummary> updateBusiness(String id, Map<String, dynamic> body) =>
      _parser.getData(
        () => _dio.patch('/platform/businesses/$id', data: body),
        BusinessSummary.fromJson,
      );

  Future<void> deactivateBusiness(String id) =>
      _parser.postVoid(() => _dio.post('/platform/businesses/$id/deactivate'));

  Future<void> deleteBusiness(String id) =>
      _parser.postVoid(() => _dio.delete('/platform/businesses/$id'));

  Future<List<BranchSummary>> listBranches(String businessId) => _parser.getList(
        () => _dio.get('/platform/businesses/$businessId/branches'),
        BranchSummary.fromJson,
      );

  Future<PaginatedResponse<PlatformUser>> listUsers({
    int page = 1,
    int pageSize = 20,
    String? search,
    String? status,
    String? role,
    String? businessId,
  }) =>
      _parser.getPaginated(
        () => _dio.get('/platform/users', queryParameters: {
          'page': page,
          'pageSize': pageSize,
          if (search != null && search.isNotEmpty) 'search': search,
          if (status != null) 'status': status,
          if (role != null) 'role': role,
          if (businessId != null) 'businessId': businessId,
        }),
        PlatformUser.fromJson,
      );

  Future<void> updateUserStatus(String id, String status) => _parser.postVoid(
        () => _dio.patch('/platform/users/$id/status', data: {'status': status}),
      );

  Future<String> resetUserPassword(String id) => _parser.getData(
        () => _dio.post('/platform/users/$id/reset-password'),
        (json) => json['temporaryPassword'] as String,
      );

  Future<List<SubscriptionSummary>> listSubscriptions() => _parser.getList(
        () => _dio.get('/platform/subscriptions'),
        SubscriptionSummary.fromJson,
      );

  Future<List<Map<String, dynamic>>> listPlans() => _parser.getRawData(
        () => _dio.get('/platform/plans'),
        (data) => data is List
            ? data.whereType<Map<String, dynamic>>().toList()
            : <Map<String, dynamic>>[],
      );

  Future<void> updateSubscription(String id, Map<String, dynamic> body) =>
      _parser.postVoid(
        () => _dio.patch('/platform/subscriptions/$id', data: body),
      );

  Future<Map<String, dynamic>> notificationStats() => _parser.getData(
        () => _dio.get('/platform/notifications/stats'),
        (json) => json,
      );

  Future<List<Map<String, dynamic>>> listFailedNotifications() =>
      _parser.getRawData(
        () => _dio.get('/platform/notifications/failed'),
        (data) => data is List
            ? data.whereType<Map<String, dynamic>>().toList()
            : <Map<String, dynamic>>[],
      );

  Future<void> retryNotification(String id) =>
      _parser.postVoid(() => _dio.post('/platform/notifications/$id/retry'));

  Future<PaginatedResponse<AuditLogEntry>> listAuditLogs({
    int page = 1,
    int pageSize = 50,
    String? search,
    String? action,
    String? businessId,
  }) =>
      _parser.getPaginated(
        () => _dio.get('/platform/audit-logs', queryParameters: {
          'page': page,
          'pageSize': pageSize,
          if (search != null && search.isNotEmpty) 'search': search,
          if (action != null) 'action': action,
          if (businessId != null) 'businessId': businessId,
        }),
        AuditLogEntry.fromJson,
      );

  Future<List<SupportTicket>> listSupportTickets() => _parser.getList(
        () => _dio.get('/platform/support-tickets'),
        SupportTicket.fromJson,
      );

  Future<void> createSupportTicket(Map<String, dynamic> body) => _parser.postVoid(
        () => _dio.post('/platform/support-tickets', data: body),
      );

  Future<void> updateSupportTicket(String id, Map<String, dynamic> body) =>
      _parser.postVoid(
        () => _dio.patch('/platform/support-tickets/$id', data: body),
      );

  Future<Map<String, dynamic>> getFeatureFlags() => _parser.getData(
        () => _dio.get('/platform/feature-flags'),
        (json) => json,
      );

  Future<void> updateGlobalFeatureFlags(Map<String, dynamic> flags) =>
      _parser.postVoid(
        () => _dio.patch('/platform/feature-flags/global', data: {'featureFlags': flags}),
      );

  Future<void> updateBusinessFeatureFlags(
    String businessId,
    Map<String, dynamic> flags,
  ) =>
      _parser.postVoid(
        () => _dio.patch(
          '/platform/feature-flags/businesses/$businessId',
          data: {'featureFlags': flags},
        ),
      );

  /// Cross-tenant guest reviews (platform admin sees all businesses).
  Future<List<FeedbackModel>> listFeedback({
    int page = 1,
    int? rating,
    String? businessId,
  }) =>
      _parser.getList(
        () => _dio.get('/feedback', queryParameters: {
          'page': page,
          'pageSize': 40,
          if (rating != null) 'rating': rating,
          if (businessId != null) 'businessId': businessId,
        }),
        FeedbackModel.fromJson,
      );
}

final platformApiClientProvider = Provider<PlatformApiClient>((ref) {
  final dio = ref.watch(authenticatedDioProvider);
  final factory = ref.watch(adminDioFactoryProvider);
  return PlatformApiClient(dio, ApiResponseParser(factory));
});
