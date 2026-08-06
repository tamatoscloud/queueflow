/// Generic, domain-agnostic `String` helpers. Anything specific to a
/// QueueFlow business concept (e.g. queue codes, ticket numbers) belongs in
/// the consuming feature module, not here.
extension StringExtensions on String {
  bool get isBlank => trim().isEmpty;

  bool get isNotBlank => !isBlank;

  String capitalize() {
    if (isEmpty) return this;
    return this[0].toUpperCase() + substring(1);
  }

  String? get orNullIfBlank => isBlank ? null : this;
}
