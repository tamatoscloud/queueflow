import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api_response_parser.dart';
import 'dio_providers.dart';
import '../models/models.dart';
import '../models/staff_model.dart';
import '../restaurant/service_mode.dart';

class BusinessApiClient {
  BusinessApiClient(this._dio, this._parser);

  final Dio _dio;
  final ApiResponseParser _parser;

  // Branches
  Future<BranchModel> getBranch(String id) =>
      _parser.getData(() => _dio.get('/branches/$id'), BranchModel.fromJson);

  Future<List<BranchModel>> getBranches({String? businessId}) => _parser.getList(
        () => _dio.get('/branches', queryParameters: {if (businessId != null) 'businessId': businessId}),
        BranchModel.fromJson,
      );

  Future<BranchModel> createBranch(Map<String, dynamic> body) =>
      _parser.getData(() => _dio.post('/branches', data: body), BranchModel.fromJson);

  Future<BranchModel> updateBranch(String id, Map<String, dynamic> body) =>
      _parser.getData(() => _dio.patch('/branches/$id', data: body), BranchModel.fromJson);

  Future<void> deleteBranch(String id) => _parser.postVoid(() => _dio.delete('/branches/$id'));

  // Queues
  Future<List<QueueModel>> getQueues({String? branchId, String? businessId}) => _parser.getList(
        () => _dio.get('/queues', queryParameters: {
          if (branchId != null) 'branchId': branchId,
          if (businessId != null) 'businessId': businessId,
        }),
        QueueModel.fromJson,
      );

  Future<QueueModel> getQueue(String id) =>
      _parser.getData(() => _dio.get('/queues/$id'), QueueModel.fromJson);

  Future<QueueModel> createQueue(Map<String, dynamic> body) =>
      _parser.getData(() => _dio.post('/queues', data: body), QueueModel.fromJson);

  Future<QueueModel> updateQueue(String id, Map<String, dynamic> body) =>
      _parser.getData(() => _dio.patch('/queues/$id', data: body), QueueModel.fromJson);

  Future<void> deleteQueue(String id) => _parser.postVoid(() => _dio.delete('/queues/$id'));

  Future<QueueModel> openQueue(String id) =>
      _parser.getData(() => _dio.post('/queues/$id/open'), QueueModel.fromJson);

  Future<QueueModel> pauseQueue(String id) =>
      _parser.getData(() => _dio.post('/queues/$id/pause'), QueueModel.fromJson);

  Future<QueueModel> resumeQueue(String id) =>
      _parser.getData(() => _dio.post('/queues/$id/resume'), QueueModel.fromJson);

  Future<QueueModel> closeQueue(String id) =>
      _parser.getData(() => _dio.post('/queues/$id/close'), QueueModel.fromJson);

  // Queue operations
  Future<QueueSnapshotModel> getQueueSnapshot(String queueId) => _parser.getData(
        () => _dio.get('/queues/$queueId/snapshot'),
        QueueSnapshotModel.fromJson,
      );

  Future<QueueEntryModel> callNext(String queueId) => _parser.getData(
        () => _dio.post('/queues/$queueId/call-next'),
        (json) => QueueEntryModel.fromJson(json['entry'] as Map<String, dynamic>? ?? json),
      );

  Future<void> holdEntry(String entryId) =>
      _parser.postVoid(() => _dio.post('/queue-entries/$entryId/hold'));

  Future<void> resumeHeld(String entryId) =>
      _parser.postVoid(() => _dio.post('/queue-entries/$entryId/resume-held'));

  Future<void> skipEntry(String entryId) =>
      _parser.postVoid(() => _dio.post('/queue-entries/$entryId/skip'));

  Future<void> recallEntry(String entryId) =>
      _parser.postVoid(() => _dio.post('/queue-entries/$entryId/recall'));

  Future<void> completeEntry(String entryId) =>
      _parser.postVoid(() => _dio.post('/queue-entries/$entryId/complete'));

  Future<void> cancelEntry(String entryId) =>
      _parser.postVoid(() => _dio.post('/queue-entries/$entryId/cancel'));

  Future<void> noShowEntry(String entryId) =>
      _parser.postVoid(() => _dio.post('/queue-entries/$entryId/no-show'));

  Future<QueueEntryModel> walkIn(String queueId, Map<String, dynamic> body) => _parser.getData(
        () => _dio.post('/queues/$queueId/walk-in', data: body),
        (json) => QueueEntryModel.fromJson(json['entry'] as Map<String, dynamic>? ?? json),
      );

  Future<void> setPriority(String entryId, int priority) => _parser.postVoid(
        () => _dio.post('/queue-entries/$entryId/priority', data: {'priority': priority}),
      );

  Future<void> transferEntry(String entryId, String targetQueueId) => _parser.postVoid(
        () => _dio.post('/queue-entries/$entryId/transfer', data: {'targetQueueId': targetQueueId}),
      );

  // Customers
  Future<CustomerModel?> lookupCustomer(String phone) async {
    try {
      return await _parser.getData(
        () => _dio.get('/customers/lookup/active', queryParameters: {'phone': phone}),
        CustomerModel.fromJson,
      );
    } catch (_) {
      return null;
    }
  }

  Future<CustomerModel> getCustomer(String id) =>
      _parser.getData(() => _dio.get('/customers/$id'), CustomerModel.fromJson);

  Future<List<CustomerHistoryEntry>> getCustomerHistory(String id) => _parser.getList(
        () => _dio.get('/customers/$id/history'),
        CustomerHistoryEntry.fromJson,
      );

  // Reports
  Future<DailySummaryModel> getDailySummary({String? businessId, String? queueId}) =>
      _parser.getData(
        () => _dio.get(
          queueId != null ? '/reports/queues/$queueId/daily-summary' : '/reports/daily-summary',
          queryParameters: {if (businessId != null) 'businessId': businessId},
        ),
        DailySummaryModel.fromJson,
      );

  Future<QueueMetricsModel> getQueueMetrics(String queueId) => _parser.getData(
        () => _dio.get('/reports/queues/$queueId/metrics'),
        QueueMetricsModel.fromJson,
      );

  // Notifications
  Future<List<NotificationModel>> getNotifications({int page = 1}) => _parser.getList(
        () => _dio.get('/notifications', queryParameters: {'page': page, 'pageSize': 20}),
        NotificationModel.fromJson,
      );

  // Staff
  Future<void> inviteStaff(StaffInviteRequest request) =>
      _parser.postVoid(() => _dio.post('/staff/invitations', data: request.toJson()));

  Future<void> disableStaff(String userId) =>
      _parser.postVoid(() => _dio.patch('/staff/$userId/disable'));

  Future<void> updateStaffRole(String userId, String roleName) => _parser.postVoid(
        () => _dio.put('/staff/$userId/role', data: {'roleName': roleName}),
      );

  Future<void> assignStaffBranches(String userId, List<String> branchIds) => _parser.postVoid(
        () => _dio.put('/staff/$userId/branches', data: {'branchIds': branchIds}),
      );

  // Business
  Future<Map<String, dynamic>> getBusiness(String id) =>
      _parser.getData(() => _dio.get('/businesses/$id'), (json) => json);

  // Restaurant platform
  Future<RestaurantConfig> getRestaurantConfig() => _parser.getData(
        () => _dio.get('/restaurant/config'),
        RestaurantConfig.fromJson,
      );

  Future<Map<String, dynamic>> getModeAnalytics({String? branchId}) => _parser.getData(
        () => _dio.get('/restaurant/analytics', queryParameters: {
          if (branchId != null) 'branchId': branchId,
        }),
        (json) => json,
      );

  Future<List<Map<String, dynamic>>> getRestaurantTables(String branchId) =>
      _parser.getList(
        () => _dio.get('/restaurant/tables', queryParameters: {'branchId': branchId}),
        (json) => json,
      );

  Future<List<Map<String, dynamic>>> getWaiters(String branchId) => _parser.getList(
        () => _dio.get('/restaurant/waiters', queryParameters: {'branchId': branchId}),
        (json) => json,
      );

  Future<Map<String, dynamic>> getKitchenBoard(String branchId) => _parser.getData(
        () => _dio.get('/restaurant/kitchen', queryParameters: {'branchId': branchId}),
        (json) => json,
      );

  Future<List<Map<String, dynamic>>> getQrCodes({String? branchId}) => _parser.getList(
        () => _dio.get('/restaurant/qr-codes', queryParameters: {
          if (branchId != null) 'branchId': branchId,
        }),
        (json) => json,
      );
}

final businessApiClientProvider = Provider<BusinessApiClient>((ref) {
  final dio = ref.watch(authenticatedDioProvider);
  final factory = ref.watch(businessDioFactoryProvider);
  return BusinessApiClient(dio, ApiResponseParser(factory));
});
