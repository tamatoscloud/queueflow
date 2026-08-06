import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';
import 'package:queueflow_utils/queueflow_utils.dart';
import 'package:queueflow_widgets/queueflow_widgets.dart';

import '../../../core/network/api_error_message.dart';
import '../../../core/network/connection_diagnostics.dart';
import '../../../core/routing/staff_routes.dart';
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
      await ref.read(authControllerProvider.notifier).login(
            _email.text.trim(),
            _password.text,
          );
      if (mounted) context.go(StaffRoutes.today);
    } catch (e) {
      setState(() => _error = apiExceptionMessage(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final diagnostics = ref.watch(connectionDiagnosticsProvider);

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      body: Column(
        children: [
          const GradientHeader(
            title: 'QueueFlow Business',
            subtitle: 'Sign in to manage your queues',
            compact: true,
          ),
          Expanded(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.lg),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: AppCard(
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          diagnostics.when(
                            loading: () => const LinearProgressIndicator(
                              color: AppColors.primary,
                              backgroundColor: AppColors.neutral100,
                            ),
                            error: (_, __) => const SizedBox.shrink(),
                            data: (result) => switch (result) {
                              ConnectionOk(:final apiBaseUrl, :final latencyMs) => Container(
                                  padding: const EdgeInsets.all(AppSpacing.sm),
                                  decoration: BoxDecoration(
                                    color: AppColors.successLight,
                                    borderRadius: AppRadius.lgAll,
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.check_circle_outline,
                                          size: 18, color: AppColors.success),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          'Connected to $apiBaseUrl (${latencyMs}ms)',
                                          style: Theme.of(context)
                                              .textTheme
                                              .bodySmall
                                              ?.copyWith(color: AppColors.success),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ConnectionFailed(:final apiBaseUrl, :final message, :final hint) =>
                                AppCard(
                                  variant: AppCardVariant.outlined,
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          const Icon(Icons.cloud_off_outlined,
                                              color: AppColors.danger, size: 20),
                                          const SizedBox(width: 8),
                                          Text(
                                            'Cannot reach backend',
                                            style: Theme.of(context)
                                                .textTheme
                                                .titleSmall
                                                ?.copyWith(color: AppColors.danger),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Text(apiBaseUrl,
                                          style: Theme.of(context).textTheme.bodySmall),
                                      const SizedBox(height: 4),
                                      Text(message),
                                      if (hint != null) ...[
                                        const SizedBox(height: 4),
                                        Text(hint,
                                            style: Theme.of(context).textTheme.bodySmall),
                                      ],
                                      AppButton(
                                        label: 'Retry connection',
                                        variant: AppButtonVariant.ghost,
                                        size: AppButtonSize.sm,
                                        onPressed: () =>
                                            ref.invalidate(connectionDiagnosticsProvider),
                                      ),
                                    ],
                                  ),
                                ),
                            },
                          ),
                          const SizedBox(height: AppSpacing.md),
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
                            Container(
                              padding: const EdgeInsets.all(AppSpacing.sm),
                              decoration: BoxDecoration(
                                color: AppColors.dangerLight,
                                borderRadius: AppRadius.lgAll,
                              ),
                              child: Text(
                                _error!,
                                style: Theme.of(context)
                                    .textTheme
                                    .bodySmall
                                    ?.copyWith(color: AppColors.danger),
                              ),
                            ),
                          ],
                          const SizedBox(height: AppSpacing.lg),
                          AppPrimaryButton(
                            label: 'Sign in',
                            isLoading: _loading,
                            onPressed: _loading ? null : _submit,
                          ),
                          AppButton(
                            label: 'Forgot password?',
                            variant: AppButtonVariant.ghost,
                            onPressed: () => context.push(StaffRoutes.forgotPassword),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
