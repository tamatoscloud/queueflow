import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';
import 'package:queueflow_utils/queueflow_utils.dart';

import '../../../core/network/api_error_message.dart';
import '../../../core/routing/app_routes.dart';
import '../../../shared/widgets/calm/calm_card.dart';
import '../../../shared/widgets/calm/calm_primary_button.dart';
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
      if (mounted) context.go(AppRoutes.dashboard);
    } catch (e) {
      setState(() => _error = apiExceptionMessage(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.calmIvory,
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: CalmCard(
              padding: const EdgeInsets.all(AppSpacing.xl),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Quyk',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.w800,
                            color: AppColors.calmCharcoal,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Platform Administration',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.calmWarmGray),
                    ),
                    const SizedBox(height: AppSpacing.xl),
                    AppTextField(
                      controller: _email,
                      label: 'Email',
                      keyboardType: TextInputType.emailAddress,
                      validator: (v) => Validators.required(v) ?? Validators.email(v),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    AppTextField(
                      controller: _password,
                      label: 'Password',
                      obscureText: true,
                      validator: Validators.required,
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: AppSpacing.sm),
                      Text(_error!, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.danger)),
                    ],
                    const SizedBox(height: AppSpacing.lg),
                    CalmPrimaryButton(label: 'Sign in', isLoading: _loading, onPressed: _loading ? null : _submit),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
