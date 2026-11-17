import Foundation

public enum StoryID: String, CaseIterable, Codable, Identifiable, Sendable {
  case transport, training
  public var id: String { rawValue }
}
public enum ChangeKind: String, CaseIterable, Codable, Identifiable, Sendable {
  case date, launch, price
  public var id: String { rawValue }
}

public struct FollowOption: Identifiable, Codable, Equatable, Sendable {
  public let id: ChangeKind
  public let title: String
  public let subtitle: String
  public init(id: ChangeKind, title: String, subtitle: String) {
    self.id = id
    self.title = title
    self.subtitle = subtitle
  }
}

public struct SourceEvidence: Identifiable, Codable, Equatable, Sendable {
  public let id: String
  public let name: String
  public let detail: String
  public let isPrimary: Bool
  public let provenance: String
  public let rightsPolicy: String
  public init(
    id: String, name: String, detail: String, isPrimary: Bool, provenance: String,
    rightsPolicy: String
  ) {
    self.id = id
    self.name = name
    self.detail = detail
    self.isPrimary = isPrimary
    self.provenance = provenance
    self.rightsPolicy = rightsPolicy
  }
}

public struct Story: Identifiable, Codable, Equatable, Sendable {
  public let id: StoryID
  public let title, category, symbol, previousSummary, initialHeadline, initialSummary,
    initialKnown, initialUnknown: String
  public let sources: [SourceEvidence]
  public let options: [FollowOption]
  public let provenance, rightsPolicy: String
  public init(
    id: StoryID, title: String, category: String, symbol: String, previousSummary: String,
    initialHeadline: String, initialSummary: String, initialKnown: String, initialUnknown: String,
    sources: [SourceEvidence], options: [FollowOption], provenance: String, rightsPolicy: String
  ) {
    self.id = id
    self.title = title
    self.category = category
    self.symbol = symbol
    self.previousSummary = previousSummary
    self.initialHeadline = initialHeadline
    self.initialSummary = initialSummary
    self.initialKnown = initialKnown
    self.initialUnknown = initialUnknown
    self.sources = sources
    self.options = options
    self.provenance = provenance
    self.rightsPolicy = rightsPolicy
  }
}

public struct StoryUpdate: Identifiable, Codable, Equatable, Sendable {
  public let id: String
  public let storyID: StoryID
  public let kind: ChangeKind
  public let headline, summary, known: String
  public let resolvesUnknown: Bool
  public let provenance, rightsPolicy: String
  public init(
    id: String, storyID: StoryID, kind: ChangeKind, headline: String, summary: String,
    known: String, resolvesUnknown: Bool, provenance: String, rightsPolicy: String
  ) {
    self.id = id
    self.storyID = storyID
    self.kind = kind
    self.headline = headline
    self.summary = summary
    self.known = known
    self.resolvesUnknown = resolvesUnknown
    self.provenance = provenance
    self.rightsPolicy = rightsPolicy
  }
}
public struct InAppNotice: Identifiable, Codable, Equatable, Sendable {
  public let id: String
  public let storyID: StoryID
  public let title, body: String
  public init(id: String, storyID: StoryID, title: String, body: String) {
    self.id = id
    self.storyID = storyID
    self.title = title
    self.body = body
  }
}
public enum SimulationResult: Equatable, Sendable { case notified, updated, duplicate }

public enum DemoCatalog {
  private static let fiction = "محتوى قصصي افتراضي أُعدّ للنموذج؛ ليس خبرًا أو مصدرًا حقيقيًا."
  private static let rights = "بيانات تجريبية داخل التطبيق فقط؛ لا تمثل ترخيصًا لمحتوى ناشر."
  private static func options(_ date: String, _ launch: String, _ price: String) -> [FollowOption] {
    [
      .init(id: .date, title: date, subtitle: "إذا تغيّر الموعد المعلن"),
      .init(id: .launch, title: launch, subtitle: "عند الإعلان عن بدء التنفيذ"),
      .init(id: .price, title: price, subtitle: "عند نشر التفاصيل المالية"),
    ]
  }
  public static let stories: [Story] = [
    Story(
      id: .transport, title: "خط المطار الجديد", category: "النقل", symbol: "tram.fill",
      previousSummary: "أُعلن المسار الجديد، دون تحديد موعد التشغيل.",
      initialHeadline: "التشغيل يبدأ في 1 ديسمبر",
      initialSummary: "أعلنت جهة النقل موعد تشغيل المسار الجديد، مع بقاء أسعار التذاكر غير معلنة.",
      initialKnown: "موعد التشغيل: 1 ديسمبر", initialUnknown: "أسعار التذاكر لم تُعلن بعد",
      sources: [
        SourceEvidence(
          id: "transport-office", name: "إعلان جهة النقل (افتراضي)",
          detail: "نص تمثيلي للمصدر الأولي في النموذج.", isPrimary: true, provenance: fiction,
          rightsPolicy: rights),
        SourceEvidence(
          id: "transport-paper", name: "تغطية صحيفة محلية (افتراضية)",
          detail: "عرض تمثيلي ينقل الإعلان نفسه.", isPrimary: false, provenance: fiction,
          rightsPolicy: rights),
        SourceEvidence(
          id: "transport-context", name: "تقرير خلفية (افتراضي)",
          detail: "سياق سابق، لا يقدم تأكيدًا جديدًا.", isPrimary: false, provenance: fiction,
          rightsPolicy: rights),
      ], options: options("تغيّر موعد التشغيل", "بدء استقبال الركاب", "إعلان أسعار التذاكر"),
      provenance: fiction, rightsPolicy: rights),
    Story(
      id: .training, title: "برنامج المهارات المستقبلية", category: "التعليم والعمل",
      symbol: "briefcase.fill", previousSummary: "أُعلن البرنامج، دون تفاصيل التقديم.",
      initialHeadline: "بدأ التقديم على البرنامج",
      initialSummary:
        "أعلنت الجهة المنظمة فتح التقديم لبرنامج المهارات المستقبلية، مع بقاء موعد النتائج غير محدد.",
      initialKnown: "التقديم متاح الآن", initialUnknown: "موعد إعلان النتائج لم يُحدد",
      sources: [
        SourceEvidence(
          id: "training-office", name: "إعلان الجهة المنظمة (افتراضي)",
          detail: "نص تمثيلي للمصدر الأولي في النموذج.", isPrimary: true, provenance: fiction,
          rightsPolicy: rights),
        SourceEvidence(
          id: "training-paper", name: "تغطية صحيفة محلية (افتراضية)",
          detail: "عرض تمثيلي ينقل الإعلان نفسه.", isPrimary: false, provenance: fiction,
          rightsPolicy: rights),
      ], options: options("تغيّر موعد التقديم", "بدء البرنامج", "إعلان النتائج"),
      provenance: fiction, rightsPolicy: rights),
  ]
  public static func story(_ id: StoryID) -> Story { stories.first { $0.id == id }! }
  public static func update(storyID: StoryID, kind: ChangeKind) -> StoryUpdate {
    let fields: (String, String, String, Bool)
    switch (storyID, kind) {
    case (.transport, .date):
      fields = (
        "تأجيل التشغيل إلى 5 ديسمبر",
        "أُعلن تعديل موعد التشغيل من 1 إلى 5 ديسمبر. بقية تفاصيل المسار لم تتغير.",
        "موعد التشغيل: 5 ديسمبر", false
      )
    case (.transport, .launch):
      fields = (
        "بدأ استقبال الركاب اليوم",
        "يقدم النموذج إعلانًا افتراضيًا ببدء استقبال الركاب على المسار الجديد.",
        "بدأ استقبال الركاب على المسار الجديد", false
      )
    case (.transport, .price):
      fields = (
        "أُعلنت أسعار التذاكر", "يقدم النموذج قائمة افتراضية لأسعار التذاكر وأنواع الاشتراكات.",
        "أُعلنت أسعار التذاكر والاشتراكات", true
      )
    case (.training, .date):
      fields = (
        "تمديد التقديم حتى 15 ديسمبر", "يقدم النموذج تمديدًا افتراضيًا لموعد التقديم حتى 15 ديسمبر.",
        "موعد إغلاق التقديم: 15 ديسمبر", false
      )
    case (.training, .launch):
      fields = (
        "بدأ البرنامج", "يقدم النموذج إعلانًا افتراضيًا ببدء برنامج المهارات المستقبلية.",
        "بدأ البرنامج", false
      )
    case (.training, .price):
      fields = (
        "أُعلنت نتائج القبول", "يقدم النموذج موعدًا افتراضيًا لإعلان نتائج القبول.",
        "أُعلنت نتائج القبول", true
      )
    }
    return StoryUpdate(
      id: "\(storyID.rawValue)-\(kind.rawValue)-v1", storyID: storyID, kind: kind,
      headline: fields.0, summary: fields.1, known: fields.2, resolvesUnknown: fields.3,
      provenance: fiction, rightsPolicy: rights)
  }
}
