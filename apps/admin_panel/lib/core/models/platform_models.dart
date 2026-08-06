class PlatformDashboard {
  const PlatformDashboard({
    required this.kpis,
    required this.systemHealth,
    required this.generatedAt,
  });

  final PlatformKpis kpis;
  final Map<String, dynamic> systemHealth;
  final String generatedAt;

  factory PlatformDashboard.fromJson(Map<String, dynamic> json) =>
      PlatformDashboard(
        kpis: PlatformKpis.fromJson(json['kpis'] as Map<String, dynamic>),
        systemHealth:
            (json['systemHealth'] as Map<String, dynamic>?) ?? const {},
        generatedAt: json['generatedAt'] as String? ?? '',
      );
}

class PlatformKpis {
  const PlatformKpis({
    required this.businesses,
    required this.activeBranches,
    required this.activeQueues,
    required this.customersServedToday,
    required this.notificationsSent,
    required this.failedNotifications,
    this.revenueMrr,
    this.revenueNote,
  });

  final int businesses;
  final int activeBranches;
  final int activeQueues;
  final int customersServedToday;
  final int notificationsSent;
  final int failedNotifications;
  final num? revenueMrr;
  final String? revenueNote;

  factory PlatformKpis.fromJson(Map<String, dynamic> json) => PlatformKpis(
        businesses: json['businesses'] as int? ?? 0,
        activeBranches: json['activeBranches'] as int? ?? 0,
        activeQueues: json['activeQueues'] as int? ?? 0,
        customersServedToday: json['customersServedToday'] as int? ?? 0,
        notificationsSent: json['notificationsSent'] as int? ?? 0,
        failedNotifications: json['failedNotifications'] as int? ?? 0,
        revenueMrr: json['revenueMrr'] as num?,
        revenueNote: json['revenueNote'] as String?,
      );
}

class BusinessSummary {
  const BusinessSummary({
    required this.id,
    required this.name,
    required this.slug,
    required this.status,
    this.email,
    this.createdAt,
  });

  final String id;
  final String name;
  final String slug;
  final String status;
  final String? email;
  final String? createdAt;

  factory BusinessSummary.fromJson(Map<String, dynamic> json) => BusinessSummary(
        id: json['id'] as String,
        name: json['name'] as String,
        slug: json['slug'] as String? ?? '',
        status: json['status'] as String? ?? 'ACTIVE',
        email: json['email'] as String?,
        createdAt: json['createdAt'] as String?,
      );
}

class BranchSummary {
  const BranchSummary({
    required this.id,
    required this.name,
    required this.status,
    this.code,
    this.city,
    this.queueCount = 0,
    this.staffCount = 0,
  });

  final String id;
  final String name;
  final String status;
  final String? code;
  final String? city;
  final int queueCount;
  final int staffCount;

  factory BranchSummary.fromJson(Map<String, dynamic> json) => BranchSummary(
        id: json['id'] as String,
        name: json['name'] as String,
        status: json['status'] as String? ?? 'ACTIVE',
        code: json['code'] as String?,
        city: json['city'] as String?,
        queueCount: json['queueCount'] as int? ?? 0,
        staffCount: json['staffCount'] as int? ?? 0,
      );
}

class PlatformUser {
  const PlatformUser({
    required this.id,
    required this.email,
    required this.fullName,
    required this.status,
    this.businessId,
    this.businessName,
    this.roles = const [],
    this.lastLoginAt,
    this.isPlatformAdmin = false,
  });

  final String id;
  final String email;
  final String fullName;
  final String status;
  final String? businessId;
  final String? businessName;
  final List<String> roles;
  final String? lastLoginAt;
  final bool isPlatformAdmin;

  factory PlatformUser.fromJson(Map<String, dynamic> json) => PlatformUser(
        id: json['id'] as String,
        email: json['email'] as String,
        fullName: json['fullName'] as String? ?? '',
        status: json['status'] as String? ?? 'ACTIVE',
        businessId: json['businessId'] as String?,
        businessName: json['businessName'] as String?,
        roles: (json['roles'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const [],
        lastLoginAt: json['lastLoginAt'] as String?,
        isPlatformAdmin: json['isPlatformAdmin'] as bool? ?? false,
      );
}

class SubscriptionSummary {
  const SubscriptionSummary({
    required this.id,
    required this.status,
    this.businessName,
    this.planName,
    this.trialEndsAt,
    this.currentPeriodEnd,
  });

  final String id;
  final String status;
  final String? businessName;
  final String? planName;
  final String? trialEndsAt;
  final String? currentPeriodEnd;

  factory SubscriptionSummary.fromJson(Map<String, dynamic> json) {
    final business = json['business'] as Map<String, dynamic>?;
    final plan = json['plan'] as Map<String, dynamic>?;
    return SubscriptionSummary(
      id: json['id'] as String,
      status: json['status'] as String? ?? 'ACTIVE',
      businessName: business?['name'] as String?,
      planName: plan?['name'] as String?,
      trialEndsAt: json['trialEndsAt'] as String?,
      currentPeriodEnd: json['currentPeriodEnd'] as String?,
    );
  }
}

class AuditLogEntry {
  const AuditLogEntry({
    required this.id,
    required this.action,
    required this.entityType,
    required this.createdAt,
    this.actorEmail,
    this.businessName,
  });

  final String id;
  final String action;
  final String entityType;
  final String createdAt;
  final String? actorEmail;
  final String? businessName;

  factory AuditLogEntry.fromJson(Map<String, dynamic> json) {
    final actor = json['actorUser'] as Map<String, dynamic>?;
    final business = json['business'] as Map<String, dynamic>?;
    return AuditLogEntry(
      id: json['id'] as String,
      action: json['action'] as String? ?? '',
      entityType: json['entityType'] as String? ?? '',
      createdAt: json['createdAt'] as String? ?? '',
      actorEmail: actor?['email'] as String?,
      businessName: business?['name'] as String?,
    );
  }
}

class SupportTicket {
  const SupportTicket({
    required this.id,
    required this.subject,
    required this.status,
    required this.priority,
    this.businessName,
    this.assignedToName,
    this.createdAt,
  });

  final String id;
  final String subject;
  final String status;
  final String priority;
  final String? businessName;
  final String? assignedToName;
  final String? createdAt;

  factory SupportTicket.fromJson(Map<String, dynamic> json) {
    final business = json['business'] as Map<String, dynamic>?;
    final assignee = json['assignedTo'] as Map<String, dynamic>?;
    return SupportTicket(
      id: json['id'] as String,
      subject: json['subject'] as String? ?? '',
      status: json['status'] as String? ?? 'OPEN',
      priority: json['priority'] as String? ?? 'MEDIUM',
      businessName: business?['name'] as String?,
      assignedToName: assignee?['fullName'] as String?,
      createdAt: json['createdAt'] as String?,
    );
  }
}

class PlatformAnalytics {
  const PlatformAnalytics({
    required this.businessGrowth,
    required this.averageWaitMinutes,
    this.peakHoursNote,
    this.dailyCustomers = const [],
    this.notificationSuccess = const [],
  });

  final int businessGrowth;
  final double averageWaitMinutes;
  final String? peakHoursNote;
  final List<Map<String, dynamic>> dailyCustomers;
  final List<Map<String, dynamic>> notificationSuccess;

  factory PlatformAnalytics.fromJson(Map<String, dynamic> json) => PlatformAnalytics(
        businessGrowth: json['businessGrowth'] as int? ?? 0,
        averageWaitMinutes: (json['averageWaitMinutes'] as num?)?.toDouble() ?? 0,
        peakHoursNote: json['peakHoursNote'] as String?,
        dailyCustomers: (json['dailyCustomers'] as List<dynamic>?)
                ?.whereType<Map<String, dynamic>>()
                .toList() ??
            const [],
        notificationSuccess: (json['notificationSuccess'] as List<dynamic>?)
                ?.whereType<Map<String, dynamic>>()
                .toList() ??
            const [],
      );
}
