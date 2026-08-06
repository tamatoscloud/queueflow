import 'package:mobile_scanner/mobile_scanner.dart';

/// Thin contract around `mobile_scanner`'s controller so feature code
/// depends on an interface, not the plugin directly. Camera permission is
/// handled separately via [PermissionService] — this service assumes it
/// has already been granted.
abstract interface class ScannerService {
  MobileScannerController createController();

  void dispose(MobileScannerController controller);
}

final class MobileScannerService implements ScannerService {
  @override
  MobileScannerController createController() {
    return MobileScannerController(
      formats: const [BarcodeFormat.qrCode, BarcodeFormat.code128],
    );
  }

  @override
  void dispose(MobileScannerController controller) {
    controller.dispose();
  }
}
