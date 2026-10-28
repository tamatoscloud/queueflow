import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_shared/queueflow_shared.dart';

import '../../../core/network/connection_diagnostics.dart' show apiExceptionMessage;
import '../../../core/routing/app_routes.dart';
import 'auth_controller.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  String _friendlyAuthError(Object e) {
    final raw = apiExceptionMessage(e);
    final lower = raw.toLowerCase();
    if (lower.contains('invalid email') || lower.contains('unauthorized') || lower.contains('password')) {
      return 'That email or password doesn’t look right. Please try again.';
    }
    if (lower.contains('reach') || lower.contains('timeout') || lower.contains('connection')) {
      return 'We can’t reach Quyk right now. Check your Wi‑Fi and try again.';
    }
    return 'Something went wrong signing in. Please try again.';
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ref.read(authControllerProvider.notifier).login(
            _email.text.trim(),
            _password.text,
          );
      // The router redirect sends the user to their home (or the link they opened).
    } catch (e) {
      setState(() => _error = _friendlyAuthError(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final config = ref.watch(appConfigProvider);
    final showDiagnostics = kDebugMode || !config.flavor.isProduction;

    return QuykAuthLayout(
      title: 'Welcome back',
      subtitle: 'Sign in to manage your restaurant.',
      panelHeadline: 'Every line,\nevery location,\none dashboard.',
      panelBody:
          'See who is waiting, how long it takes and what guests think — then tune your lines, menu and team.',
      panelChips: const ['Live lines', 'Guest codes', 'Reviews', 'Team'],
      child: AutofillGroup(
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextFormField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                autofillHints: const [AutofillHints.email],
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  prefixIcon: Icon(Icons.mail_outline_rounded),
                ),
                validator: (v) {
                  final value = v?.trim() ?? '';
                  if (value.isEmpty) return 'Enter your email';
                  if (!value.contains('@')) return 'Enter a valid email';
                  return null;
                },
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _password,
                obscureText: true,
                autofillHints: const [AutofillHints.password],
                textInputAction: TextInputAction.done,
                onFieldSubmitted: (_) => _submit(),
                decoration: const InputDecoration(
                  labelText: 'Password',
                  prefixIcon: Icon(Icons.lock_outline_rounded),
                ),
                validator: (v) => (v ?? '').isEmpty ? 'Enter your password' : null,
              ),
              if (_error != null) ...[
                const SizedBox(height: 14),
                QuykAuthError(_error!),
              ],
              const SizedBox(height: 24),
              QuykAuthButton(label: 'Sign in', loading: _loading, onPressed: _submit),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => context.push(AppRoutes.forgotPassword),
                child: const Text('Forgot password?'),
              ),
              if (showDiagnostics) ...[
                const SizedBox(height: 16),
                Text(
                  'API: ${config.apiBaseUrl}',
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 12, color: QuykColors.subtle),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
