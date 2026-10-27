class NotificationModel {
  const NotificationModel({
    required this.id,
    required this.type,
    required this.status,
    required this.createdAt,
    this.recipientPhone,
    this.recipientName,
    this.message,
    this.channel,
    this.displayCode,
    this.queueId,
    this.queueName,
  });

  final String id;
  final String type;
  final String status;
  final DateTime createdAt;
  final String? recipientPhone;
  final String? recipientName;
  final String? message;

  /// WHATSAPP, SMS, WEB_PUSH …
  final String? channel;

  /// Guest ticket the alert was for (e.g. A-108).
  final String? displayCode;
  final String? queueId;
  final String? queueName;

  factory NotificationModel.fromJson(Map<String, dynamic> json) => NotificationModel(
        id: json['id'] as String,
        type: json['type'] as String? ?? '',
        status: json['status'] as String? ?? '',
        createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
        recipientPhone: json['recipientPhone'] as String?,
        recipientName: json['recipientName'] as String?,
        message: json['message'] as String?,
        channel: json['channel'] as String?,
        displayCode: json['displayCode'] as String?,
        queueId: json['queueId'] as String?,
        queueName: json['queueName'] as String?,
      );
}
