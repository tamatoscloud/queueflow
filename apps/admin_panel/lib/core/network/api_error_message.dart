import 'package:queueflow_network/queueflow_network.dart';

String apiExceptionMessage(Object error, {bool signIn = false}) {
  if (error is ApiException) {
    return error.when(
      noConnection: () =>
          'Cannot reach the server. Check that the backend is running and the API URL is correct.',
      timeout: () => 'Request timed out. The server may be slow or unreachable.',
      unauthorized: () => signIn ? 'Invalid email or password.' : 'Your session has ended. Please sign in again.',
      forbidden: () => 'You do not have permission to perform this action.',
      notFound: () => 'The requested resource was not found.',
      server: (statusCode, message) => message?.isNotEmpty == true
          ? message!
          : 'Server error (${statusCode ?? 'unknown'}). Please try again.',
      unknown: (_) => 'An unexpected error occurred. Please try again.',
    );
  }
  return error.toString();
}
