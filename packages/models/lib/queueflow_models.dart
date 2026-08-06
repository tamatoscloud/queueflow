/// Shared, framework-agnostic data contracts.
///
/// Domain models (User, Business, Queue, Ticket, ...) will be added here as
/// Freezed + json_serializable classes following the [PaginatedResponse] /
/// [ApiEnvelope] pattern already established below. None are implemented
/// yet — this package currently only carries generic, product-agnostic
/// envelope types.
library;

export 'src/common/api_envelope.dart';
export 'src/common/paginated_response.dart';
