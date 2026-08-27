import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_shared/queueflow_shared.dart';

import '../../../core/network/connection_diagnostics.dart';
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
      return 'We can’t reach QueueFlow right now. Check your Wi‑Fi and try again.';
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
      if (mounted) context.go(AppRoutes.dashboard);
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
    final diagnostics = showDiagnostics ? ref.watch(connectionDiagnosticsProvider) : null;

    return Scaffold(
      backgroundColor: AppColors.calmIvory,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: AppSpacing.lg),
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: AppColors.calmViolet,
                      borderRadius: AppRadius.lgAll,
                    ),
                    child: const Icon(Icons.storefront_outlined, color: Colors.white, size: 28),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    'QueueFlow',
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                          color: AppColors.calmCharcoal,
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Sign in to manage your restaurant waiting lines',
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: AppColors.calmWarmGray,
                        ),
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  AppCard(
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          if (diagnostics != null) ...[
                            diagnostics.when(
                              loading: () => const LinearProgressIndicator(
                                color: AppColors.primary,
                                backgroundColor: AppColors.neutral100,
                              ),
                              error: (_, __) => const SizedBox.shrink(),
                              data: (result) => switch (result) {
                                ConnectionOk() => const SizedBox.shrink(),
                                ConnectionFailed() => Container(
                                    padding: const EdgeInsets.all(AppSpacing.sm),
                                    decoration: BoxDecoration(
                                      color: AppColors.dangerLight,
                                      borderRadius: AppRadius.lgAll,
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Can’t connect right now',
                                          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                                color: AppColors.danger,
                                                fontWeight: FontWeight.w700,
                                              ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          'Check your Wi‑Fi, then try again.',
                                          style: Theme.of(context).textTheme.bodySmall,
                                        ),
                                        AppButton(
                                          label: 'Try again',
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
                          ],
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
                            onPressed: () => context.push(AppRoutes.forgotPassword),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
