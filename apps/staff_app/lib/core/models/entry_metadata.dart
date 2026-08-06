class EntryMetadata {
  const EntryMetadata({
    this.orderNumber,
    this.vehicleMake,
    this.vehicleColor,
    this.vehiclePlate,
    this.note,
  });

  final String? orderNumber;
  final String? vehicleMake;
  final String? vehicleColor;
  final String? vehiclePlate;
  final String? note;

  String? get vehicleDescription {
    if (vehicleColor != null && vehicleMake != null) {
      return '$vehicleColor $vehicleMake';
    }
    return vehicleMake ?? vehicleColor;
  }

  factory EntryMetadata.fromJson(Map<String, dynamic>? json, {String? notes}) {
    final meta = json ?? <String, dynamic>{};
    var orderNumber = meta['orderNumber'] as String?;
    var vehicleMake = meta['vehicleMake'] as String?;
    var vehicleColor = meta['vehicleColor'] as String?;
    var vehiclePlate = meta['vehiclePlate'] as String?;
    final note = meta['note'] as String?;

    if (notes != null && notes.isNotEmpty) {
      final orderMatch = RegExp(r'Order\s*#?\s*([A-Za-z0-9-]+)', caseSensitive: false).firstMatch(notes);
      orderNumber ??= orderMatch?.group(1);
      final vehicleMatch = RegExp(r'Vehicle:\s*([^·]+)', caseSensitive: false).firstMatch(notes);
      if (vehicleMatch != null) {
        final vehicle = vehicleMatch.group(1)!.trim();
        final plateMatch = RegExp(r'Plate:\s*([^·]+)', caseSensitive: false).firstMatch(notes);
        vehiclePlate ??= plateMatch?.group(1)?.trim();
        final parts = vehicle.split(' ');
        if (parts.length >= 2) {
          vehicleColor ??= parts.first;
          vehicleMake ??= parts.sublist(1).join(' ');
        } else {
          vehicleMake ??= vehicle;
        }
      }
    }

    return EntryMetadata(
      orderNumber: orderNumber,
      vehicleMake: vehicleMake,
      vehicleColor: vehicleColor,
      vehiclePlate: vehiclePlate,
      note: note,
    );
  }
}
