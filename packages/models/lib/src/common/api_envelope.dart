import 'package:freezed_annotation/freezed_annotation.dart';

part 'api_envelope.freezed.dart';
part 'api_envelope.g.dart';

/// The generic `{ data, message, success }` wrapper the backend uses for
/// every response. Represents the wire format only — application error
/// handling uses `queueflow_core`'s `Result`/`Failure`, not this class.
@Freezed(genericArgumentFactories: true)
sealed class ApiEnvelope<T> with _$ApiEnvelope<T> {
  const factory ApiEnvelope({required bool success, T? data, String? message}) =
      _ApiEnvelope<T>;

  factory ApiEnvelope.fromJson(
    Map<String, dynamic> json,
    T Function(Object? json) fromJsonT,
  ) => _$ApiEnvelopeFromJson(json, fromJsonT);
}
