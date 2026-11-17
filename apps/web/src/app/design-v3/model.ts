// نموذج «الملف الحي» — أنواع البيانات وقوالب الأنواع فقط، بلا أي منطق.
// كل ما يُعرض عبر هذا النموذج افتراضي؛ لا يمثل جهات أو مشاريع أو أخبارًا حقيقية.

export type FileKind =
  | 'project'
  | 'event'
  | 'decision'
  | 'deadline'
  | 'entity'
  | 'promise'
  | 'jobs';
export type Tone = 'teal' | 'amber' | 'plum' | 'olive' | 'slate';
export type Certainty = 'official' | 'independent' | 'relayed' | 'open';
export type Weight = 0 | 1 | 2 | 3 | 4;
export type OriginChannel = 'owner' | 'independent' | 'relay';

/** أنواع التطورات الثمانية في الوثيقة، وثلاث حالات إضافية يولّدها النظام من المسار نفسه. */
export type DevelopmentType =
  | 'milestone'
  | 'date'
  | 'number'
  | 'scene'
  | 'confirmation'
  | 'retraction'
  | 'silent_delay'
  | 'stale'
  | 'pending_promise'
  | 'coverage';

export type FollowScope = 'all' | 'field' | 'resolution';
export type Delivery = 'instant' | 'daily' | 'silent';

export interface Origin {
  name: string;
  url: string;
  channel: OriginChannel;
}

/** الدليل: مقطع حرفي من أصل مرخّص. لا تغيير في حقل بلا مقطع. */
export interface Evidence {
  source: string;
  channel: OriginChannel;
  url: string;
  title: string;
  quote: string;
  publishedAt: string;
  /** أساس الحقوق المسجّل لهذا الأصل. النموذج يعرضه ولا يفترضه. */
  rights: string;
}

export interface FieldChange {
  at: string;
  from: string | null;
  to: string | null;
  evidence?: Evidence;
}

export interface StateField {
  key: string;
  label: string;
  value: string | null;
  certainty: Certainty;
  asOf: string;
  origin?: Origin;
  history: FieldChange[];
}

export interface Milestone {
  id: string;
  label: string;
  status: 'done' | 'current' | 'waiting';
  expectedAt?: string;
  achievedAt?: string;
  /** المعلم الأخير: افتتاح، سريان، نتائج نهائية. تحققه حسم بوزن 4. */
  terminal?: boolean;
  evidence?: Evidence;
}

export interface SceneShot {
  id: string;
  at: string;
  caption: string;
  angle: string;
  src: string;
  alt: string;
  rights: { owner: string; basis: string };
}

export interface Development {
  id: string;
  type: DevelopmentType;
  at: string;
  title: string;
  detail?: string;
  fieldKey?: string;
  milestoneId?: string;
  from?: string | null;
  to?: string | null;
  /** وسم صريح للتطورات التي لم تحسمها الجهة. */
  certainty?: Certainty;
  evidence?: Evidence;
  secondSource?: Evidence;
  /** وُلّد من المسار والمواعيد، لا من مادة منشورة. */
  generated?: boolean;
  /** عدد المواد الواردة التي انطوت تحت هذا التطور. */
  incoming: number;
  weightOverride?: { weight: Weight; reason: string };
}

export interface CoverageOrigin {
  name: string;
  detail: string;
  independent?: boolean;
  outlets: { name: string; relay: boolean }[];
}

export interface PendingAnnouncement {
  id: string;
  label: string;
  promisedAt: string;
  dueAt: string;
  origin: Origin;
}

export interface LiveFile {
  id: string;
  kind: FileKind;
  title: string;
  summary: string;
  city: string;
  sector: string;
  owner: Origin;
  openedAt: string;
  lastReviewAt: string;
  image?: { src: string; alt: string };
  fields: StateField[];
  milestones: Milestone[];
  scene: SceneShot[];
  developments: Development[];
  coverage: CoverageOrigin[];
  pending: PendingAnnouncement[];
  /** كل ما وصل عن الملف من المصادر، بما فيه ما لم يغيّر شيئًا. */
  incomingTotal: number;
}

export interface Follow {
  scope: FollowScope;
  /** مفتاح الحقل أو معرّف المعلم عند المتابعة الدقيقة. */
  target?: string;
  delivery: Delivery;
}

export interface Template {
  name: string;
  tone: Tone;
  /** حقول البطاقة لهذا النوع. */
  fields: { key: string; label: string }[];
  /** الحقول التي يمسّها تطور فيرفع وزنه إلى تحول. */
  criticalFields: string[];
  milestones: string[];
  /** مدة السكون المعتادة لهذا النوع قبل ملاحظة «ملف ساكن». */
  staleAfterDays: number;
}

export const kindLabels: Record<FileKind, { name: string; tone: Tone }> = {
  project: { name: 'مشروع', tone: 'teal' },
  event: { name: 'حدث ممتد', tone: 'amber' },
  decision: { name: 'قرار أو نظام', tone: 'plum' },
  deadline: { name: 'موعد منتظر', tone: 'olive' },
  entity: { name: 'جهة أو شركة', tone: 'slate' },
  promise: { name: 'وعد', tone: 'amber' },
  jobs: { name: 'وظائف', tone: 'teal' },
};

export const certaintyLabels: Record<Certainty, string> = {
  official: 'إعلان من الجهة',
  independent: 'مصدر مستقل',
  relayed: 'منقول',
  open: 'غير محسوم',
};

export const weightLabels: Record<Weight, { name: string; effect: string }> = {
  0: { name: 'بلا جديد', effect: 'لا يظهر في صفحتك' },
  1: { name: 'تفصيل', effect: 'داخل الملف فقط' },
  2: { name: 'تحديث', effect: 'يصعد الملف في صفحتك' },
  3: { name: 'تحول', effect: 'أعلى الصفحة، وتنبيه إن اخترت' },
  4: { name: 'حسم', effect: 'أعلى الصفحة وتنبيه فوري' },
};

export const developmentLabels: Record<DevelopmentType, string> = {
  milestone: 'معلم تحقق',
  date: 'موعد أُعلن أو تغيّر',
  number: 'رقم تغيّر',
  scene: 'مشهد جديد',
  confirmation: 'تأكيد مستقل',
  retraction: 'نفي أو تراجع',
  silent_delay: 'تأخر صامت',
  stale: 'ملف ساكن',
  pending_promise: 'وعد معلّق',
  coverage: 'تغطية بلا جديد',
};

export const scopeLabels: Record<FollowScope, { name: string; hint: string }> = {
  all: { name: 'الملف كله', hint: 'كل تطور بوزن 2 فأعلى' },
  field: { name: 'تطور محدد', hint: 'حقل أو معلم بعينه' },
  resolution: { name: 'الحسم فقط', hint: 'تنبيه واحد عند النهاية' },
};

export const deliveryLabels: Record<Delivery, string> = {
  instant: 'فوري',
  daily: 'ملخص يومي',
  silent: 'صامت في الصفحة',
};

/** قالب لكل نوع من البداية: المحرك واحد، والاختلاف في الحقول والمعالم فقط. */
export const templates: Record<FileKind, Template> = {
  project: {
    name: 'مشروع',
    tone: 'teal',
    fields: [
      { key: 'phase', label: 'المرحلة الحالية' },
      { key: 'opening', label: 'موعد الافتتاح' },
      { key: 'cost', label: 'التكلفة' },
      { key: 'capacity', label: 'الطاقة الاستيعابية' },
      { key: 'tickets', label: 'أسعار الدخول' },
    ],
    criticalFields: ['opening', 'phase'],
    milestones: ['الإعلان', 'بدء التنفيذ', 'اكتمال المرحلة الأولى', 'المرحلة الثانية', 'الافتتاح'],
    staleAfterDays: 21,
  },
  event: {
    name: 'حدث ممتد',
    tone: 'amber',
    fields: [
      { key: 'stage', label: 'الدور الحالي' },
      { key: 'final', label: 'موعد النهائي' },
      { key: 'teams', label: 'عدد المشاركين' },
      { key: 'winner', label: 'النتيجة النهائية' },
    ],
    criticalFields: ['final', 'stage'],
    milestones: ['الإعلان', 'القرعة', 'دور المجموعات', 'الأدوار الإقصائية', 'النهائي'],
    staleAfterDays: 7,
  },
  decision: {
    name: 'قرار أو نظام',
    tone: 'plum',
    fields: [
      { key: 'effective', label: 'موعد السريان' },
      { key: 'rate', label: 'النسبة أو الرسم' },
      { key: 'scope', label: 'الفئات المشمولة' },
      { key: 'exemptions', label: 'الاستثناءات' },
    ],
    criticalFields: ['effective', 'rate'],
    milestones: ['الإعلان', 'الاستشارة العامة', 'النشر الرسمي', 'السريان'],
    staleAfterDays: 30,
  },
  deadline: {
    name: 'موعد منتظر',
    tone: 'olive',
    fields: [
      { key: 'announced', label: 'هل أُعلن الموعد؟' },
      { key: 'due', label: 'الموعد المعلن' },
      { key: 'state', label: 'هل حدث؟' },
    ],
    criticalFields: ['due', 'state'],
    milestones: ['الإعلان بالموعد', 'حدوث الموعد'],
    staleAfterDays: 14,
  },
  entity: {
    name: 'جهة أو شركة',
    tone: 'slate',
    fields: [
      { key: 'leadership', label: 'القيادة' },
      { key: 'results', label: 'آخر نتائج معلنة' },
      { key: 'nextResults', label: 'موعد النتائج القادمة' },
      { key: 'deal', label: 'صفقة معلّقة' },
    ],
    criticalFields: ['leadership', 'deal'],
    milestones: ['إعلان القيادة', 'إعلان النتائج', 'إتمام الصفقة'],
    staleAfterDays: 30,
  },
  promise: {
    name: 'وعد',
    tone: 'amber',
    fields: [
      { key: 'pledge', label: 'نص التعهد المعلن' },
      { key: 'pledgedOn', label: 'تاريخ التعهد' },
      { key: 'due', label: 'الموعد المعلن' },
      { key: 'fulfilled', label: 'هل تحقق؟' },
    ],
    criticalFields: ['due', 'fulfilled'],
    milestones: ['التعهد المعلن', 'إعلان التفاصيل', 'التحقق'],
    staleAfterDays: 21,
  },
  jobs: {
    name: 'وظائف',
    tone: 'teal',
    fields: [
      { key: 'state', label: 'حالة التقديم' },
      { key: 'opens', label: 'موعد فتح التقديم' },
      { key: 'count', label: 'عدد الوظائف' },
      { key: 'results', label: 'موعد النتائج' },
    ],
    criticalFields: ['opens', 'state'],
    milestones: ['الإعلان بالبرنامج', 'فتح التقديم', 'إغلاق التقديم', 'النتائج'],
    staleAfterDays: 14,
  },
};
