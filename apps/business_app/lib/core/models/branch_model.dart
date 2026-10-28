class BranchModel {
  const BranchModel({
    required this.id,
    required this.businessId,
    required this.name,
    this.code,
    this.city,
    this.address,
    this.phone,
    this.isActive = true,
  });

  final String id;
  final String businessId;
  final String name;

  /// Short code unique per business (e.g. "BVD").
  final String? code;
  final String? city;
  final String? address;
  final String? phone;
  final bool isActive;

  factory BranchModel.fromJson(Map<String, dynamic> json) => BranchModel(
        id: json['id'] as String,
        businessId: json['businessId'] as String,
        name: json['name'] as String,
        code: json['code'] as String?,
        city: json['city'] as String?,
        address: json['address'] as String?,
        phone: json['phone'] as String?,
        isActive: json['isActive'] as bool? ?? true,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'businessId': businessId,
        'name': name,
        if (code != null) 'code': code,
        if (city != null) 'city': city,
        if (address != null) 'address': address,
        if (phone != null) 'phone': phone,
        'isActive': isActive,
      };
}
