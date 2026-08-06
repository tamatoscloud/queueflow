/// Generic form-field validators, independent of any specific feature.
/// Return `null` when valid, otherwise a machine-readable error code that
/// the presentation layer maps to a localized message.
abstract final class Validators {
  static final RegExp _emailPattern = RegExp(
    r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$',
  );

  static String? required(String? value) {
    if (value == null || value.trim().isEmpty) return 'field_required';
    return null;
  }

  static String? email(String? value) {
    if (value == null || value.isEmpty) return null;
    return _emailPattern.hasMatch(value) ? null : 'field_invalid_email';
  }

  static String? minLength(String? value, int min) {
    if (value == null) return null;
    return value.length >= min ? null : 'field_too_short';
  }

  static String? Function(String?) compose(
    List<String? Function(String?)> validators,
  ) {
    return (value) {
      for (final validator in validators) {
        final result = validator(value);
        if (result != null) return result;
      }
      return null;
    };
  }
}
