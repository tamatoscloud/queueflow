/// Restaurant service modes — mirrors backend `ServiceMode` enum.
enum ServiceMode {
  dineIn('DINE_IN'),
  takeaway('TAKEAWAY'),
  driveIn('DRIVE_IN');

  const ServiceMode(this.apiValue);
  final String apiValue;

  static ServiceMode fromApi(String? value) {
    return ServiceMode.values.firstWhere(
      (m) => m.apiValue == value,
      orElse: () => ServiceMode.dineIn,
    );
  }

  String get label => switch (this) {
        ServiceMode.dineIn => 'Dine In',
        ServiceMode.takeaway => 'Takeaway',
        ServiceMode.driveIn => 'Drive In',
      };
}

enum BusinessType {
  restaurant('RESTAURANT'),
  cafe('CAFE'),
  foodCourt('FOOD_COURT'),
  cloudKitchen('CLOUD_KITCHEN'),
  generic('GENERIC');

  const BusinessType(this.apiValue);
  final String apiValue;

  static BusinessType fromApi(String? value) {
    return BusinessType.values.firstWhere(
      (t) => t.apiValue == value,
      orElse: () => BusinessType.restaurant,
    );
  }
}

class RestaurantConfig {
  const RestaurantConfig({
    required this.businessType,
    required this.enabledModes,
  });

  final BusinessType businessType;
  final List<ServiceMode> enabledModes;

  ServiceMode get primaryMode =>
      enabledModes.isNotEmpty ? enabledModes.first : ServiceMode.dineIn;

  bool get hasDineIn => enabledModes.contains(ServiceMode.dineIn);
  bool get hasTakeaway => enabledModes.contains(ServiceMode.takeaway);
  bool get hasDriveIn => enabledModes.contains(ServiceMode.driveIn);

  factory RestaurantConfig.fromJson(Map<String, dynamic> json) {
    final modes = (json['enabledModes'] as List<dynamic>? ?? ['DINE_IN'])
        .map((e) => ServiceMode.fromApi(e as String?))
        .toList();
    return RestaurantConfig(
      businessType: BusinessType.fromApi(json['businessType'] as String?),
      enabledModes: modes,
    );
  }
}
