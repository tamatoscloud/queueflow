import 'package:firebase_messaging/firebase_messaging.dart';

/// Push-notification plumbing only — no notification-handling business
/// logic (that belongs to a feature's `data`/`domain` layer, which listens
/// via [onMessage]/[onNotificationTap]).
abstract interface class NotificationService {
  Future<void> init();

  Future<String?> getToken();

  Stream<RemoteMessage> get onMessage;

  Future<void> requestPermission();
}

final class FirebaseNotificationService implements NotificationService {
  FirebaseNotificationService({FirebaseMessaging? messaging})
    : _messaging = messaging ?? FirebaseMessaging.instance;

  final FirebaseMessaging _messaging;

  @override
  Future<void> init() async {
    await requestPermission();
  }

  @override
  Future<String?> getToken() => _messaging.getToken();

  @override
  Stream<RemoteMessage> get onMessage => FirebaseMessaging.onMessage;

  @override
  Future<void> requestPermission() async {
    await _messaging.requestPermission(alert: true, badge: true, sound: true);
  }
}
