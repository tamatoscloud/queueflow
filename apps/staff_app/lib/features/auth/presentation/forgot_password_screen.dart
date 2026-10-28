import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_utils/queueflow_utils.dart';

import '../../../core/network/api_error_message.dart' show apiExceptionMessage;
import '../../../core/routing/staff_routes.dart';
import 'auth_controller.dart';
import 'quyk_auth_layout.dart';

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _email = TextEditingController();
  bool _loading = false;
  bool _sent = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final email = _email.text.trim();
    final validation = Validators.required(email) ?? Validators.email(email);
    if (validation != null) {
      setState(() => _error = validation);
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ref.read(authControllerProvider.notifier).forgotPassword(email);
      setState(() => _sent = true);
    } catch (e) {
      setState(() => _error = apiExceptionMessage(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return QuykAuthLayout(
      title: 'Reset password',
      subtitle: _sent ? 'Check your inbox.' : "We'll email you a reset link.",
      onBack: () => context.go(StaffRoutes.login),
      child: _sent
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: QuykColors.limeTint,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: QuykColors.line),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.mark_email_read_outlined, color: QuykColors.green),
                      SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'If an account exists for that email, a reset link is on its way.',
                          style: TextStyle(fontSize: 14, color: QuykColors.ink),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                QuykAuthButton(label: 'Back to sign in', onPressed: () => context.go(StaffRoutes.login)),
              ],
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  autofillHints: const [AutofillHints.email],
                  onSubmitted: (_) => _submit(),
                  decoration: const InputDecoration(
                    labelText: 'Email',
                    prefixIcon: Icon(Icons.mail_outline_rounded),
                  ),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 14),
                  QuykAuthError(_error!),
                ],
                const SizedBox(height: 24),
                QuykAuthButton(label: 'Send reset link', loading: _loading, onPressed: _submit),
              ],
            ),
    );
  }
}
