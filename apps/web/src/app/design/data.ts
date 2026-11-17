// بيانات افتراضية بالكامل لنموذج التصميم. لا تمثل جهات أو أخبارًا حقيقية.

export type CategoryKey = 'city' | 'energy' | 'culture' | 'economy' | 'tech';
export type ClaimKind = 'official' | 'independent' | 'relayed' | 'open';

export type DiffItem =
  | { type: 'add'; text: string; when: string }
  | { type: 'mod'; label: string; from: string; to: string; when: string }
  | { type: 'remind'; text: string; when: string };

export type Claim = { text: string; kind: ClaimKind; origin: string; reach: string; time: string };

export type CoverageOrigin = {
  name: string;
  detail: string;
  independent?: boolean;
  outlets: { name: string; relay: boolean }[];
};

export type TimelineEntry =
  | { day: string }
  | { time: string; text: string; isNew?: boolean; revision?: { from: string; to: string } };

export type Watch = { label: string; status: string; happened?: boolean };

export type Story = {
  id: string;
  category: CategoryKey;
  title: string;
  excerpt: string;
  image?: { src: string; alt: string };
  openedOn: string;
  updatedAt: string;
  updateCount: number;
  activity: number[];
  before: string;
  changed: string;
  pending: string;
  diff: DiffItem[];
  claims: Claim[];
  coverage: CoverageOrigin[];
  timeline: TimelineEntry[];
  watches: Watch[];
};

export const LAST_VISIT = 'أمس 21:40';

export const categories: Record<CategoryKey, { name: string; tone: string }> = {
  city: { name: 'المدن والتنقل', tone: 'teal' },
  energy: { name: 'تقنية وطاقة', tone: 'amber' },
  culture: { name: 'ثقافة ووجهات', tone: 'plum' },
  economy: { name: 'اقتصاد', tone: 'olive' },
  tech: { name: 'تقنية', tone: 'slate' },
};

export const kindLabels: Record<ClaimKind, string> = {
  official: 'إعلان من الجهة',
  independent: 'مصدر مستقل ثانٍ',
  relayed: 'منقول',
  open: 'غير محسوم',
};

const relay = (...names: string[]) => names.map((name) => ({ name, relay: true }));

export const stories: Story[] = [
  {
    id: 'metro',
    category: 'city',
    title: 'خط النقل الجديد: المحطات تتضح والموعد لم يُعلن',
    excerpt:
      'الجهة المشغلة (افتراضية) نشرت خريطة المحطات المقترحة للخط الشرقي. ما زال موعد التشغيل والأسعار خارج الإعلان.',
    image: { src: '/design-assets/city.jpg', alt: 'مشهد ليلي لمدينة، صورة توضيحية' },
    openedOn: '12 نوفمبر',
    updatedAt: '08:35',
    updateCount: 9,
    activity: [1, 0, 2, 0, 1, 3, 2],
    before: 'خط شرقي مقترح يربط أربعة أحياء، دون تفاصيل المحطات.',
    changed: 'نُشرت خريطة بـ 11 محطة مقترحة، وأُضيفت محطة قرب المستشفى.',
    pending: 'موعد بدء التشغيل، الأسعار، ومواقف السيارات عند المحطات.',
    diff: [
      {
        type: 'add',
        text: 'نشرت الجهة المشغلة خريطة المحطات المقترحة (11 محطة).',
        when: 'اليوم 08:35 · إعلان من الجهة',
      },
      {
        type: 'add',
        text: 'أُضيفت محطة قرب المستشفى لم تكن في المسودة السابقة.',
        when: 'اليوم 08:35 · إعلان من الجهة',
      },
      {
        type: 'mod',
        label: 'عدد المحطات',
        from: '9 محطات',
        to: '11 محطة',
        when: 'تعديل على معلومة كانت في الملف',
      },
      {
        type: 'remind',
        text: '«التشغيل نهاية الربع الأول» ما زال منقولًا عن مصدر واحد ولم تؤكده الجهة.',
        when: 'لم يتغير · نذكّرك به لأنه يخص ما تتابعه',
      },
    ],
    claims: [
      {
        text: 'الخط يضم 11 محطة مقترحة.',
        kind: 'official',
        origin: 'بيان الجهة المشغلة',
        reach: 'نقلته 4 جهات',
        time: 'اليوم 08:35',
      },
      {
        text: 'محطة جديدة قرب المستشفى.',
        kind: 'official',
        origin: 'خريطة الجهة المشغلة',
        reach: 'نقلته جهتان',
        time: 'اليوم 08:35',
      },
      {
        text: 'أعمال التمهيد في المحطتين 3 و4 بدأت فعلًا.',
        kind: 'independent',
        origin: 'تقرير ميداني لصحيفة الأفق',
        reach: 'مصوّر من الموقع',
        time: 'أمس 17:10',
      },
      {
        text: 'التشغيل نهاية الربع الأول.',
        kind: 'open',
        origin: 'منسوب إلى «مصدر مطلع» في موقع نبض المدينة',
        reach: 'نقلته 3 جهات عنه',
        time: '14 نوفمبر',
      },
    ],
    coverage: [
      {
        name: 'بيان الجهة المشغلة',
        detail: 'الأصل · اليوم 08:35',
        outlets: relay('وكالة الخبر', 'صحيفة الأفق', 'قناة الساحل', 'منصة رصد'),
      },
      {
        name: 'تقرير ميداني — صحيفة الأفق',
        detail: 'عمل مستقل · أمس 17:10',
        independent: true,
        outlets: [{ name: 'صور وموقع الأعمال', relay: false }],
      },
      {
        name: '«مصدر مطلع» — نبض المدينة',
        detail: 'أصل غير معلن · 14 نوفمبر',
        outlets: relay('وكالة الخبر', 'منصة رصد', 'قناة الساحل'),
      },
    ],
    timeline: [
      { day: 'اليوم' },
      { time: '08:35', text: 'الجهة المشغلة تنشر خريطة المحطات المقترحة.', isNew: true },
      {
        time: '08:50',
        text: 'وكالة الخبر عدّلت عنوانها بعد النشر.',
        revision: { from: '«الخط الشرقي يعمل قريبًا»', to: '«خريطة محطات الخط الشرقي»' },
      },
      { day: 'أمس' },
      { time: '17:10', text: 'صحيفة الأفق تنشر تقريرًا ميدانيًا عن أعمال التمهيد.' },
      { day: '14 نوفمبر' },
      { time: '11:20', text: 'موقع نبض المدينة ينقل عن مصدر مطلع موعدًا للتشغيل.' },
      { day: '12 نوفمبر' },
      { time: '09:00', text: 'فتح الملف: إعلان أولي عن خط شرقي بلا تفاصيل.' },
    ],
    watches: [
      { label: 'موعد بدء التشغيل', status: 'لم يُعلن بعد' },
      { label: 'الأسعار', status: 'لم يُعلن بعد' },
      { label: 'تغيير على قائمة المحطات', status: 'حدث اليوم 08:35', happened: true },
      { label: 'أي تعديل على معلومة في الملف', status: 'يشمل تغيّر الأرقام والمواعيد المعلنة' },
    ],
  },
  {
    id: 'grid',
    category: 'energy',
    title: 'تخزين الطاقة في الشبكة: التجربة تنتقل إلى مرحلة ثانية',
    excerpt:
      'سيناريو افتراضي لتجربة بطاريات توازن الطلب في الذروة. المرحلة الثانية أُعلنت، والسعة الفعلية لم تُذكر.',
    image: { src: '/design-assets/energy.jpg', alt: 'صفوف ألواح شمسية، صورة توضيحية' },
    openedOn: '3 نوفمبر',
    updatedAt: '08:10',
    updateCount: 6,
    activity: [0, 1, 0, 0, 2, 0, 1],
    before: 'تجربة محدودة في محطة واحدة لموازنة أحمال الصيف.',
    changed: 'أُعلنت مرحلة ثانية تشمل محطتين إضافيتين.',
    pending: 'السعة التخزينية، والتكلفة، وأثر التجربة على انقطاعات الذروة.',
    diff: [
      {
        type: 'add',
        text: 'إعلان مرحلة ثانية تشمل محطتين إضافيتين.',
        when: 'اليوم 08:10 · إعلان من الجهة',
      },
    ],
    claims: [
      {
        text: 'المرحلة الثانية تشمل محطتين إضافيتين.',
        kind: 'official',
        origin: 'بيان شركة الشبكة (افتراضية)',
        reach: 'نقلته 3 جهات',
        time: 'اليوم 08:10',
      },
      {
        text: 'التجربة خفّضت أحمال الذروة في المحطة الأولى.',
        kind: 'open',
        origin: 'تصريح غير منسوب في منصة رصد',
        reach: 'لا أرقام منشورة',
        time: '9 نوفمبر',
      },
    ],
    coverage: [
      {
        name: 'بيان شركة الشبكة',
        detail: 'الأصل · اليوم 08:10',
        outlets: relay('وكالة الخبر', 'قناة الساحل', 'منصة رصد'),
      },
    ],
    timeline: [
      { day: 'اليوم' },
      { time: '08:10', text: 'إعلان المرحلة الثانية.', isNew: true },
      { day: '9 نوفمبر' },
      { time: '13:00', text: 'تصريح غير منسوب عن نتائج المرحلة الأولى.' },
      { day: '3 نوفمبر' },
      { time: '10:30', text: 'فتح الملف: بدء التجربة في محطة واحدة.' },
    ],
    watches: [
      { label: 'السعة التخزينية المعلنة', status: 'لم يُعلن بعد' },
      { label: 'نتائج المرحلة الأولى بأرقام', status: 'لم يُعلن بعد' },
    ],
  },
  {
    id: 'season',
    category: 'culture',
    title: 'برامج الموسم الثقافي تتوزع على الأحياء',
    excerpt: 'تصور افتراضي لنقل جزء من البرامج من موقع واحد إلى ساحات قريبة من السكان.',
    image: { src: '/design-assets/culture.jpg', alt: 'تكوين صخري مضاء ليلًا، صورة توضيحية' },
    openedOn: '8 نوفمبر',
    updatedAt: '07:50',
    updateCount: 4,
    activity: [0, 0, 1, 0, 0, 1, 0],
    before: 'البرامج مركزة في موقع رئيسي واحد طوال الموسم.',
    changed: 'أُعلنت ثلاث ساحات إضافية للبرامج المسائية.',
    pending: 'الجدول الكامل، وطريقة الحجز، وإتاحة الوصول.',
    diff: [],
    claims: [
      {
        text: 'ثلاث ساحات إضافية للبرامج المسائية.',
        kind: 'official',
        origin: 'حساب الموسم (افتراضي)',
        reach: 'نقلته جهتان',
        time: 'أمس 19:00',
      },
    ],
    coverage: [
      {
        name: 'حساب الموسم الرسمي',
        detail: 'الأصل · أمس 19:00',
        outlets: relay('صحيفة الأفق', 'منصة رصد'),
      },
    ],
    timeline: [
      { day: 'أمس' },
      { time: '19:00', text: 'إعلان الساحات الإضافية.' },
      { day: '8 نوفمبر' },
      { time: '12:00', text: 'فتح الملف.' },
    ],
    watches: [{ label: 'نشر الجدول الكامل', status: 'لم يُعلن بعد' }],
  },
  {
    id: 'shops',
    category: 'economy',
    title: 'المتاجر الصغيرة وأدوات البيع الخفيفة',
    excerpt: 'أداة افتراضية تجمع الطلبات والمخزون للمتاجر الصغيرة.',
    openedOn: '15 نوفمبر',
    updatedAt: '07:25',
    updateCount: 2,
    activity: [0, 0, 0, 0, 0, 1, 1],
    before: 'الطلبات والمخزون تُدار بوسائل متفرقة.',
    changed: 'أُعلن برنامج تجريبي لعشرين متجرًا.',
    pending: 'التكلفة وشروط الانضمام.',
    diff: [],
    claims: [
      {
        text: 'برنامج تجريبي لعشرين متجرًا.',
        kind: 'official',
        origin: 'بيان الجهة المنظمة (افتراضية)',
        reach: 'لم ينقله أحد بعد',
        time: 'اليوم 07:25',
      },
    ],
    coverage: [{ name: 'بيان الجهة المنظمة', detail: 'الأصل · اليوم 07:25', outlets: [] }],
    timeline: [{ day: 'اليوم' }, { time: '07:25', text: 'إعلان البرنامج التجريبي.', isNew: true }],
    watches: [],
  },
  {
    id: 'ai',
    category: 'tech',
    title: 'أدوات الذكاء الاصطناعي في العمل: من يراجع المخرجات؟',
    excerpt: 'سيناريو افتراضي عن إضافة مراجعة بشرية قبل اعتماد مخرجات الأدوات.',
    openedOn: '10 نوفمبر',
    updatedAt: '06:55',
    updateCount: 3,
    activity: [1, 0, 0, 1, 0, 0, 1],
    before: 'أدوات تُستخدم في مهام العمل دون سياسة واضحة.',
    changed: 'أُضيفت خطوة مراجعة بشرية إلزامية في المسودة.',
    pending: 'من يتحمل المسؤولية عند الخطأ.',
    diff: [],
    claims: [
      {
        text: 'مراجعة بشرية إلزامية قبل الاعتماد.',
        kind: 'relayed',
        origin: 'مسودة منشورة في منصة رصد',
        reach: 'نقلتها 3 جهات عن المنصة',
        time: 'اليوم 06:55',
      },
    ],
    coverage: [
      {
        name: 'مسودة في منصة رصد',
        detail: 'الأصل · اليوم 06:55',
        outlets: relay('وكالة الخبر', 'قناة الساحل', 'صحيفة الأفق'),
      },
    ],
    timeline: [{ day: 'اليوم' }, { time: '06:55', text: 'نشر المسودة.', isNew: true }],
    watches: [],
  },
];

export const initialFollows: Record<string, string[]> = {
  metro: ['موعد بدء التشغيل', 'تغيير على قائمة المحطات'],
};

export function relayCount(story: Story) {
  return story.coverage.reduce(
    (total, origin) => total + origin.outlets.filter((outlet) => outlet.relay).length,
    0,
  );
}

export function originsPhrase(count: number) {
  if (count === 1) return 'أصل واحد';
  if (count === 2) return 'أصلين';
  return `${count} أصول`;
}
