class FeedbackModel {
  const FeedbackModel({
    required this.id,
    required this.rating,
    this.comment,
    this.customerName,
    this.customerPhone,
    this.branchName,
    this.businessName,
    this.displayCode,
    this.submittedAt,
  });

  final String id;
  final int rating;
  final String? comment;
  final String? customerName;
  final String? customerPhone;
  final String? branchName;
  final String? businessName;
  final String? displayCode;
  final DateTime? submittedAt;

  factory FeedbackModel.fromJson(Map<String, dynamic> json) => FeedbackModel(
        id: json['id'] as String? ?? '',
        rating: (json['rating'] as num?)?.toInt() ?? 0,
        comment: json['comment'] as String?,
        customerName: json['customerName'] as String?,
        customerPhone: json['customerPhone'] as String?,
        branchName: json['branchName'] as String?,
        businessName: json['businessName'] as String?,
        displayCode: json['displayCode'] as String?,
        submittedAt: json['submittedAt'] != null
            ? DateTime.tryParse(json['submittedAt'] as String)
            : (json['createdAt'] != null ? DateTime.tryParse(json['createdAt'] as String) : null),
      );
}
