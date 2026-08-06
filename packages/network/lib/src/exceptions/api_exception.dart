import 'package:freezed_annotation/freezed_annotation.dart';

part 'api_exception.freezed.dart';

/// Typed mapping of Dio's raw `DioException` into a closed set of cases the
/// rest of the app can pattern-match on, instead of inspecting status codes
/// or exception types ad hoc in every repository.
@freezed
sealed class ApiException with _$ApiException implements Exception {
  const factory ApiException.noConnection() = NoConnectionException;

  const factory ApiException.timeout() = TimeoutException;

  const factory ApiException.unauthorized() = UnauthorizedException;

  const factory ApiException.forbidden() = ForbiddenException;

  const factory ApiException.notFound() = NotFoundException;

  const factory ApiException.server({int? statusCode, String? message}) =
      ServerException;

  const factory ApiException.unknown({Object? cause}) = UnknownApiException;
}
