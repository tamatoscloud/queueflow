import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../core/network/api_error_message.dart';

/// Runs [action] and reports the outcome in a snackbar. Returns true when it
/// succeeded, so callers can close dialogs or refresh only on success.
Future<bool> runWithFeedback(
  BuildContext context,
  Future<void> Function() action, {
  String? success,
  String failure = 'That didn’t work',
}) async {
  final messenger = ScaffoldMessenger.maybeOf(context);
  try {
    await action();
    if (success != null) {
      messenger?.showSnackBar(SnackBar(content: Text(success)));
    }
    return true;
  } catch (e) {
    messenger?.showSnackBar(
      SnackBar(
        backgroundColor: QuykColors.danger,
        content: Text('$failure — ${apiExceptionMessage(e)}'),
      ),
    );
    return false;
  }
}

/// Asks the user to confirm a consequential action.
Future<bool> confirmAction(
  BuildContext context, {
  required String title,
  required String message,
  required String confirmLabel,
  bool destructive = false,
}) async {
  final result = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(title),
      content: Text(message),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
        FilledButton(
          style: destructive
              ? FilledButton.styleFrom(
                  backgroundColor: QuykColors.danger,
                  foregroundColor: Colors.white,
                )
              : null,
          onPressed: () => Navigator.pop(ctx, true),
          child: Text(confirmLabel),
        ),
      ],
    ),
  );
  return result == true;
}
