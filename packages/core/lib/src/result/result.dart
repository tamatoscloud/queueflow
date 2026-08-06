import 'package:freezed_annotation/freezed_annotation.dart';

import '../error/failure.dart';

part 'result.freezed.dart';

/// A `Result<T>` is either [Success] with data, or [ResultFailure] with a
/// [Failure]. Repositories and use-cases return this instead of throwing,
/// so the presentation layer is forced to handle both branches explicitly.
@freezed
sealed class Result<T> with _$Result<T> {
  const factory Result.success(T data) = Success<T>;

  const factory Result.failure(Failure failure) = ResultFailure<T>;
}

/// Convenience checks. Prefer the generated `.when(success:, failure:)` /
/// pattern matching for branching logic; these are for quick guards.
extension ResultX<T> on Result<T> {
  bool get isSuccess => this is Success<T>;

  bool get isFailure => this is ResultFailure<T>;
}
