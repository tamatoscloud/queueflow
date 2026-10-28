import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_ui/queueflow_ui.dart';
import 'package:queueflow_utils/queueflow_utils.dart';

import '../../../core/network/api_error_message.dart';
import '../data/auth_repository.dart';
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

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ref.read(authControllerProvider.notifier).login(_email.text.trim(), _password.text);
      // The router redirect takes the admin to where they were going.
    } on PlatformAdminRequiredException {
      setState(() => _error = 'This account isn’t a Quyk platform admin. Use the business app instead.');
    } catch (e) {
      setState(() => _error = apiExceptionMessage(e, signIn: true));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return QuykAuthLayout(
      title: 'Platform admin',
      subtitle: 'Sign in to manage Quyk.',
      panelHeadline: 'Every restaurant\non Quyk, in one place.',
      panelBody: 'Businesses, users, support requests and platform health — with the controls to act on them.',
      panelChips: const ['Businesses', 'Users', 'Support', 'Health'],
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
                validator: (v) => Validators.required(v) ?? Validators.email(v),
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
                validator: Validators.required,
              ),
              if (_error != null) ...[
                const SizedBox(height: 14),
                QuykAuthError(_error!),
              ],
              const SizedBox(height: 24),
              QuykAuthButton(label: 'Sign in', loading: _loading, onPressed: _submit),
            ],
          ),
        ),
      ),
    );
  }
}
