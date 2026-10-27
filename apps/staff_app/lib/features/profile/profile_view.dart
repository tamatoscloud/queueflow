import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../shared/widgets/quyk/quyk_widgets.dart';

/// Presentational Profile page (Figma "Quyk Redesign Staff", Profile).
class ProfileView extends StatelessWidget {
  const ProfileView({
    super.key,
    required this.name,
    required this.email,
    required this.onBreak,
    required this.onToggleBreak,
    required this.onSignOut,
    this.onAppearance,
  });

  final String name;
  final String email;
  final bool onBreak;
  final VoidCallback onToggleBreak;
  final VoidCallback onSignOut;
  final VoidCallback? onAppearance;

  @override
  Widget build(BuildContext context) {
    final compact = MediaQuery.sizeOf(context).width < 720;
    return ListView(
      padding: EdgeInsets.fromLTRB(compact ? 16 : 32, 12, compact ? 16 : 32, 32),
      children: [
        Align(
          alignment: Alignment.topLeft,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 640),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _IdentityCard(name: name, email: email),
                const SizedBox(height: 16),
                QuykCard(
                  radius: 24,
                  padding: const EdgeInsets.fromLTRB(8, 18, 8, 6),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Padding(
                        padding: EdgeInsets.fromLTRB(16, 0, 16, 6),
                        child: Text(
                          'Settings',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: QuykColors.green,
                          ),
                        ),
                      ),
                      _SettingsRow(
                        icon: Icons.dark_mode_outlined,
                        title: 'Appearance',
                        subtitle: 'Follow system theme',
                        onTap: onAppearance,
                      ),
                      const Divider(height: 1, thickness: 1, indent: 8, endIndent: 8, color: QuykColors.line),
                      _SettingsRow(
                        icon: onBreak ? Icons.play_arrow_rounded : Icons.pause_rounded,
                        title: onBreak ? 'End break' : 'Start break',
                        subtitle: onBreak
                            ? 'Queue operations paused for you'
                            : 'Pause queue operations temporarily',
                        onTap: onToggleBreak,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                OutlinedButton(
                  onPressed: onSignOut,
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(200, 54),
                    foregroundColor: QuykColors.green,
                    side: const BorderSide(color: QuykColors.green, width: 1.4),
                    shape: const StadiumBorder(),
                    textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                  ),
                  child: const Text('Sign out'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _IdentityCard extends StatelessWidget {
  const _IdentityCard({required this.name, required this.email});

  final String name;
  final String email;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 26, vertical: 26),
      decoration: BoxDecoration(
        color: QuykColors.green,
        borderRadius: BorderRadius.circular(32),
      ),
      child: Row(
        children: [
          QuykAvatar(name: name, size: 72, lime: true, initialsCount: 1),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w600,
                    letterSpacing: -0.3,
                    color: Colors.white,
                  ),
                ),
                if (email.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    email,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 13, color: Colors.white.withValues(alpha: 0.72)),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SettingsRow extends StatelessWidget {
  const _SettingsRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        child: Row(
          children: [
            QuykIconBubble(icon: icon, size: 44),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: QuykColors.ink),
                  ),
                  const SizedBox(height: 2),
                  Text(subtitle, style: const TextStyle(fontSize: 12.5, color: QuykColors.subtle)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: QuykColors.subtle),
          ],
        ),
      ),
    );
  }
}
