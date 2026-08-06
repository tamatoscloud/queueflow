import 'package:freezed_annotation/freezed_annotation.dart';

part 'failure.freezed.dart';

/// Generic, product-agnostic failure taxonomy used by the [Result] type.
/// Feature modules define their own domain-specific failures by wrapping
/// or extending these, not by inventing a parallel error hierarchy.
@freezed
sealed class Failure with _$Failure {
  const factory Failure.network({String? message}) = NetworkFailure;

  const factory Failure.timeout({String? message}) = TimeoutFailure;

  const factory Failure.unauthorized({String? message}) = UnauthorizedFailure;

  const factory Failure.validation({
    required String message,
    Map<String, String>? fieldErrors,
  }) = ValidationFailure;

  const factory Failure.cache({String? message}) = CacheFailure;

  const factory Failure.unknown({String? message, Object? cause}) =
      UnknownFailure;
}
