import 'package:flutter/services.dart';

import '../../features/display/providers/display_board_provider.dart';

class FlutterSoundPlayer implements SoundPlayer {
  @override
  void playCallSound() {
    SystemSound.play(SystemSoundType.alert);
  }
}
