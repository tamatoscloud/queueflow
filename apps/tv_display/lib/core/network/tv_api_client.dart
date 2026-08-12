import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/queue_models.dart';
import 'dio_providers.dart';

class TvApiClient {
  TvApiClient(this._dio, this._parser);

  final Dio _dio;
  final ApiResponseParser _parser;

  Future<QueueSnapshotModel> getQueueSnapshot(String queueId) =>
      _parser.getData(
        () => _dio.get('/queues/$queueId/snapshot'),
        QueueSnapshotModel.fromJson,
      );

  Future<QueueLandingModel> getQueueLanding(String queueId) => _parser.getData(
        () => _dio.get('/customer-portal/queues/$queueId'),
        QueueLandingModel.fromJson,
      );

  /// Staff-authenticated: issues a queue-scoped JWT for TV Socket.IO auth.
  Future<DisplayCredentialModel> issueDisplayCredential(String queueId) =>
      _parser.getData(
        () => _dio.post('/queues/$queueId/display-credential'),
        DisplayCredentialModel.fromJson,
      );

  Future<List<BranchModel>> getBranches({String? businessId}) =>
      _parser.getList(
        () => _dio.get('/branches', queryParameters: {
          if (businessId != null) 'businessId': businessId,
        }),
        BranchModel.fromJson,
      );

  Future<List<QueueModel>> getQueues({String? branchId, String? businessId}) =>
      _parser.getList(
        () => _dio.get('/queues', queryParameters: {
          if (branchId != null) 'branchId': branchId,
          if (businessId != null) 'businessId': businessId,
        }),
        QueueModel.fromJson,
      );
}

final tvApiClientProvider = Provider<TvApiClient>((ref) {
  return TvApiClient(
    ref.watch(publicDioProvider),
    ref.watch(apiResponseParserProvider),
  );
});
