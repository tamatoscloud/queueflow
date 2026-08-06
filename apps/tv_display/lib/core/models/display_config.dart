enum DisplayLayoutMode {
  nowServingLarge,
  splitAnnouncements,
  minimal,
  brand,
}

enum DisplayThemePreset {
  queueflow,
  dark,
  light,
  brand,
  luxury,
  minimal,
  kids,
  holiday,
}

class DisplayConfig {
  const DisplayConfig({
    required this.displayToken,
    required this.queueId,
    required this.queueName,
    required this.branchName,
    required this.businessName,
    this.businessId,
    this.branchId,
    this.businessLogoUrl,
    this.layoutMode = DisplayLayoutMode.nowServingLarge,
    this.themePreset = DisplayThemePreset.queueflow,
    this.showCustomerNames = true,
    this.tokensOnly = false,
    this.darkMode = true,
    this.fontScale = 1.0,
    this.autoFullscreen = true,
    this.landscapeOnly = true,
    this.soundOnCall = true,
    this.voiceAnnouncement = false,
    this.language = 'en',
    this.footerMessage,
    this.announcementMessage,
    this.backgroundImageUrl,
    this.primaryColorValue,
    this.refreshIntervalSeconds = 15,
    this.blinkCurrentCustomer = true,
    this.transitionStyle = 'fade',
  });

  final String displayToken;
  final String queueId;
  final String queueName;
  final String branchName;
  final String businessName;
  final String? businessId;
  final String? branchId;
  final String? businessLogoUrl;
  final DisplayLayoutMode layoutMode;
  final DisplayThemePreset themePreset;
  final bool showCustomerNames;
  final bool tokensOnly;
  final bool darkMode;
  final double fontScale;
  final bool autoFullscreen;
  final bool landscapeOnly;
  final bool soundOnCall;
  final bool voiceAnnouncement;
  final String language;
  final String? footerMessage;
  final String? announcementMessage;
  final String? backgroundImageUrl;
  final int? primaryColorValue;
  final int refreshIntervalSeconds;
  final bool blinkCurrentCustomer;
  final String transitionStyle;

  DisplayConfig copyWith({
    String? displayToken,
    String? queueId,
    String? queueName,
    String? branchName,
    String? businessName,
    String? businessId,
    String? branchId,
    String? businessLogoUrl,
    DisplayLayoutMode? layoutMode,
    DisplayThemePreset? themePreset,
    bool? showCustomerNames,
    bool? tokensOnly,
    bool? darkMode,
    double? fontScale,
    bool? autoFullscreen,
    bool? landscapeOnly,
    bool? soundOnCall,
    bool? voiceAnnouncement,
    String? language,
    String? footerMessage,
    String? announcementMessage,
    String? backgroundImageUrl,
    int? primaryColorValue,
    int? refreshIntervalSeconds,
    bool? blinkCurrentCustomer,
    String? transitionStyle,
  }) {
    return DisplayConfig(
      displayToken: displayToken ?? this.displayToken,
      queueId: queueId ?? this.queueId,
      queueName: queueName ?? this.queueName,
      branchName: branchName ?? this.branchName,
      businessName: businessName ?? this.businessName,
      businessId: businessId ?? this.businessId,
      branchId: branchId ?? this.branchId,
      businessLogoUrl: businessLogoUrl ?? this.businessLogoUrl,
      layoutMode: layoutMode ?? this.layoutMode,
      themePreset: themePreset ?? this.themePreset,
      showCustomerNames: showCustomerNames ?? this.showCustomerNames,
      tokensOnly: tokensOnly ?? this.tokensOnly,
      darkMode: darkMode ?? this.darkMode,
      fontScale: fontScale ?? this.fontScale,
      autoFullscreen: autoFullscreen ?? this.autoFullscreen,
      landscapeOnly: landscapeOnly ?? this.landscapeOnly,
      soundOnCall: soundOnCall ?? this.soundOnCall,
      voiceAnnouncement: voiceAnnouncement ?? this.voiceAnnouncement,
      language: language ?? this.language,
      footerMessage: footerMessage ?? this.footerMessage,
      announcementMessage: announcementMessage ?? this.announcementMessage,
      backgroundImageUrl: backgroundImageUrl ?? this.backgroundImageUrl,
      primaryColorValue: primaryColorValue ?? this.primaryColorValue,
      refreshIntervalSeconds:
          refreshIntervalSeconds ?? this.refreshIntervalSeconds,
      blinkCurrentCustomer: blinkCurrentCustomer ?? this.blinkCurrentCustomer,
      transitionStyle: transitionStyle ?? this.transitionStyle,
    );
  }

  Map<String, dynamic> toJson() => {
        'displayToken': displayToken,
        'queueId': queueId,
        'queueName': queueName,
        'branchName': branchName,
        'businessName': businessName,
        if (businessId != null) 'businessId': businessId,
        if (branchId != null) 'branchId': branchId,
        if (businessLogoUrl != null) 'businessLogoUrl': businessLogoUrl,
        'layoutMode': layoutMode.name,
        'themePreset': themePreset.name,
        'showCustomerNames': showCustomerNames,
        'tokensOnly': tokensOnly,
        'darkMode': darkMode,
        'fontScale': fontScale,
        'autoFullscreen': autoFullscreen,
        'landscapeOnly': landscapeOnly,
        'soundOnCall': soundOnCall,
        'voiceAnnouncement': voiceAnnouncement,
        'language': language,
        if (footerMessage != null) 'footerMessage': footerMessage,
        if (announcementMessage != null) 'announcementMessage': announcementMessage,
        if (backgroundImageUrl != null) 'backgroundImageUrl': backgroundImageUrl,
        if (primaryColorValue != null) 'primaryColorValue': primaryColorValue,
        'refreshIntervalSeconds': refreshIntervalSeconds,
        'blinkCurrentCustomer': blinkCurrentCustomer,
        'transitionStyle': transitionStyle,
      };

  factory DisplayConfig.fromJson(Map<String, dynamic> json) => DisplayConfig(
        displayToken: json['displayToken'] as String,
        queueId: json['queueId'] as String,
        queueName: json['queueName'] as String? ?? '',
        branchName: json['branchName'] as String? ?? '',
        businessName: json['businessName'] as String? ?? '',
        businessId: json['businessId'] as String?,
        branchId: json['branchId'] as String?,
        businessLogoUrl: json['businessLogoUrl'] as String?,
        layoutMode: DisplayLayoutMode.values.firstWhere(
          (m) => m.name == json['layoutMode'],
          orElse: () => DisplayLayoutMode.nowServingLarge,
        ),
        themePreset: DisplayThemePreset.values.firstWhere(
          (m) => m.name == json['themePreset'],
          orElse: () => DisplayThemePreset.queueflow,
        ),
        showCustomerNames: json['showCustomerNames'] as bool? ?? true,
        tokensOnly: json['tokensOnly'] as bool? ?? false,
        darkMode: json['darkMode'] as bool? ?? true,
        fontScale: (json['fontScale'] as num?)?.toDouble() ?? 1.0,
        autoFullscreen: json['autoFullscreen'] as bool? ?? true,
        landscapeOnly: json['landscapeOnly'] as bool? ?? true,
        soundOnCall: json['soundOnCall'] as bool? ?? true,
        voiceAnnouncement: json['voiceAnnouncement'] as bool? ?? false,
        language: json['language'] as String? ?? 'en',
        footerMessage: json['footerMessage'] as String?,
        announcementMessage: json['announcementMessage'] as String?,
        backgroundImageUrl: json['backgroundImageUrl'] as String?,
        primaryColorValue: json['primaryColorValue'] as int?,
        refreshIntervalSeconds: json['refreshIntervalSeconds'] as int? ?? 15,
        blinkCurrentCustomer: json['blinkCurrentCustomer'] as bool? ?? true,
        transitionStyle: json['transitionStyle'] as String? ?? 'fade',
      );
}

String generateDisplayToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  final now = DateTime.now().millisecondsSinceEpoch;
  final buffer = StringBuffer();
  for (var i = 0; i < 8; i++) {
    buffer.write(chars[(now + i * 17) % chars.length]);
  }
  return buffer.toString();
}
