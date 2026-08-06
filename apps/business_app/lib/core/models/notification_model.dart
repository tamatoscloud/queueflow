class NotificationModel {
  const NotificationModel({
    required this.id,
    required this.type,
    required this.status,
    required this.createdAt,
    this.recipientPhone,
    this.message,
  });

  final String id;
  final String type;
  final String status;
  final DateTime createdAt;
  final String? recipientPhone;
  final String? message;

  factory NotificationModel.fromJson(Map<String, dynamic> json) => NotificationModel(
        id: json['id'] as String,
        type: json['type'] as String? ?? '',
        status: json['status'] as String? ?? '',
        createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
        recipientPhone: json['recipientPhone'] as String?,
        message: json['message'] as String?,
      );
}
