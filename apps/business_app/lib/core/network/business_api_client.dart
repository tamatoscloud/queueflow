import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/models.dart';
import '../restaurant/service_mode.dart';
import 'api_response_parser.dart';
import 'dio_providers.dart';

class BusinessApiClient {
  BusinessApiClient(this._dio, this._parser);

  final Dio _dio;
  final ApiResponseParser _parser;

  // Branches
  Future<BranchModel> getBranch(String id) =>
      _parser.getData(() => _dio.get('/branches/$id'), BranchModel.fromJson);

  Future<List<BranchModel>> getBranches({String? businessId}) => _parser.getList(
        () => _dio.get('/branches', queryParameters: {
          'pageSize': 100,
          if (businessId != null) 'businessId': businessId,
        }),
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
          'pageSize': 100,
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
  /// Guests list; `q` matches name, phone or ticket code. `activeOnly`
  /// limits to guests currently waiting or called.
  Future<List<CustomerModel>> listCustomers({String? q, bool activeOnly = true}) =>
      _parser.getList(
        () => _dio.get('/customers', queryParameters: {
          if (q != null && q.trim().isNotEmpty) 'q': q.trim(),
          'activeOnly': activeOnly,
          'pageSize': 50,
        }),
        CustomerModel.fromJson,
      );

  Future<CustomerModel> getCustomer(String id) =>
      _parser.getData(() => _dio.get('/customers/$id'), CustomerModel.fromJson);

  Future<List<CustomerHistoryEntry>> getCustomerHistory(String id) => _parser.getList(
        () => _dio.get('/customers/$id/history'),
        CustomerHistoryEntry.fromJson,
      );

  // Feedback / reviews
  Future<List<FeedbackModel>> getFeedback({
    int page = 1,
    int? rating,
    String? branchId,
  }) =>
      _parser.getList(
        () => _dio.get('/feedback', queryParameters: {
          'page': page,
          'pageSize': 100,
          if (rating != null) 'rating': rating,
          if (branchId != null) 'branchId': branchId,
        }),
        FeedbackModel.fromJson,
      );

  // Reports
  Future<DailySummaryModel> getDailySummary({
    String? businessId,
    String? queueId,
    String? branchId,
    DateTime? date,
  }) =>
      _parser.getData(
        () => _dio.get(
          queueId != null ? '/reports/queues/$queueId/daily-summary' : '/reports/daily-summary',
          queryParameters: {
            if (businessId != null) 'businessId': businessId,
            if (branchId != null) 'branchId': branchId,
            if (date != null)
              'date': '${date.year.toString().padLeft(4, '0')}-'
                  '${date.month.toString().padLeft(2, '0')}-'
                  '${date.day.toString().padLeft(2, '0')}',
          },
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
  Future<StaffRosterModel> getStaffRoster({String? businessId}) => _parser.getData(
        () => _dio.get('/staff', queryParameters: {
          if (businessId != null) 'businessId': businessId,
        }),
        StaffRosterModel.fromJson,
      );

  Future<void> inviteStaff(StaffInviteRequest request) =>
      _parser.postVoid(() => _dio.post('/staff/invitations', data: request.toJson()));

  Future<void> resendStaffInvite(String invitationId, {String? businessId}) =>
      _parser.postVoid(
        () => _dio.post(
          '/staff/invitations/$invitationId/resend',
          queryParameters: {if (businessId != null) 'businessId': businessId},
        ),
      );

  Future<void> disableStaff(String userId, {String? businessId}) =>
      _parser.postVoid(
        () => _dio.patch(
          '/staff/$userId/disable',
          queryParameters: {if (businessId != null) 'businessId': businessId},
        ),
      );

  Future<void> updateStaffRole(String userId, String roleName, {String? businessId}) =>
      _parser.postVoid(
        () => _dio.put('/staff/$userId/role', data: {
          'roleName': roleName,
          if (businessId != null) 'businessId': businessId,
        }),
      );

  Future<void> assignStaffBranches(String userId, List<String> branchIds, {String? businessId}) =>
      _parser.postVoid(
        () => _dio.put('/staff/$userId/branches', data: {
          'branchIds': branchIds,
          if (businessId != null) 'businessId': businessId,
        }),
      );

  // Business
  Future<Map<String, dynamic>> getBusiness(String id) =>
      _parser.getData(() => _dio.get('/businesses/$id'), (json) => json);

  Future<Map<String, dynamic>> updateBusiness(String id, Map<String, dynamic> body) =>
      _parser.getData(() => _dio.patch('/businesses/$id', data: body), (json) => json);

  Future<Map<String, dynamic>> getGuestMenu(String businessId) =>
      _parser.getData(() => _dio.get('/businesses/$businessId/menu'), (json) => json);

  Future<Map<String, dynamic>> putGuestMenu(String businessId, Map<String, dynamic> body) =>
      _parser.getData(() => _dio.put('/businesses/$businessId/menu', data: body), (json) => json);

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
