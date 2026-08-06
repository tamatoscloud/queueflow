import 'package:flutter/foundation.dart';

import '../../features/display/providers/display_board_provider.dart';

class WebVoiceAnnouncer implements VoiceAnnouncer {
  @override
  void announce(String? text) {
    if (!kIsWeb || text == null || text.isEmpty) return;
    // Speech synthesis is wired via conditional import in production web builds.
  }
}
