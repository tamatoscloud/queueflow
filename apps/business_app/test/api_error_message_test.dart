import 'package:business_app/core/network/api_error_message.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:queueflow_network/queueflow_network.dart';

void main() {
  test('apiExceptionMessage maps noConnection', () {
    const err = ApiException.noConnection();
    expect(apiExceptionMessage(err), contains('Cannot reach the server'));
  });

  test('apiExceptionMessage maps unauthorized', () {
    const err = ApiException.unauthorized();
    expect(apiExceptionMessage(err), contains('Invalid email or password'));
  });

  test('apiExceptionMessage sanitizes Dio 500 boilerplate', () {
    const err = ApiException.server(
      statusCode: 500,
      message: 'This exception was thrown because the response has a status code of 500',
    );
    expect(apiExceptionMessage(err), 'Server error. Please try again or contact support.');
  });
}
