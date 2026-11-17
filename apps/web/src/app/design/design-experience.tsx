/// <reference lib="dom" />
'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './design.module.css';

type Story = {
  id: string;
  category: string;
  title: string;
  excerpt: string;
  time: string;
  image: string;
  imageAlt: string;
  before: string;
  changed: string;
  pending: string;
  context: string;
};
type DetailTab = 'change' | 'context' | 'sources';
type View = 'today' | 'following' | 'saved';

const stories: Story[] = [
  {
    id: 'mobility',
    category: 'المدن والتنقل',
    title: 'كيف تعيد المدينة رسم علاقتها بالسيارة؟',
    excerpt:
      'مسارات جديدة للنقل العام تعيد ترتيب الأولويات بين الطريق والحي، وتطرح سؤالًا عمليًا: لمن صُممت المسافة اليومية؟',
    time: '08:35',
    image: '/design-assets/city.jpg',
    imageAlt: 'مشهد حضري لطريق ومبانٍ في المدينة',
    before: 'طُرحت فكرة ربط الأحياء بالنقل العام في هذا السيناريو الافتراضي.',
    changed: 'أُضيف تصور للمحطات والمسارات المقترحة داخل المدينة.',
    pending: 'مواعيد التشغيل والأسعار وتفاصيل الوصول.',
    context:
      'تغيّر شكل التنقل يرتبط بتصميم الشوارع، وتواتر الخدمة، وسهولة الوصول إلى المحطات. لا يقدم هذا النموذج أرقامًا أو نتائج ميدانية.',
  },
  {
    id: 'energy',
    category: 'تقنية وطاقة',
    title: 'تخزين الطاقة يقترب من قلب الشبكة',
    excerpt: 'تجربة افتراضية تبحث كيف يمكن للبطاريات أن توازن الطلب في ساعات الذروة.',
    time: '08:10',
    image: '/design-assets/energy.jpg',
    imageAlt: 'ألواح طاقة ومشهد تقني',
    before: 'يعرض السيناريو حاجة افتراضية لموازنة الطلب في أوقات الذروة.',
    changed: 'أُضيف خيار تخزين الطاقة وإعادتها إلى الشبكة عند الحاجة.',
    pending: 'السعة والتكلفة وأثر الحل على استقرار الشبكة.',
    context:
      'الجدوى تعتمد على تكلفة التخزين، وعمر البطاريات، ومرونة الشبكة. التفاصيل هنا جزء من سيناريو تصميمي افتراضي.',
  },
  {
    id: 'culture',
    category: 'ثقافة ووجهات',
    title: 'وجهات ثقافية تبحث عن إيقاع المدينة',
    excerpt:
      'من المساحات المؤقتة إلى البرامج الموسمية، كيف يتغير معنى الزيارة حين يصبح المكان جزءًا من يوم الناس؟',
    time: '07:50',
    image: '/design-assets/culture.jpg',
    imageAlt: 'صخرة الفيل في العلا مضاءة ليلًا',
    before: 'يركز التصور على زيارة ثقافية مرتبطة بمناسبة أو موسم.',
    changed: 'أُضيفت فكرة توزيع البرامج على مساحات أقرب إلى الحياة اليومية.',
    pending: 'استمرارية البرامج وسهولة الوصول إليها.',
    context:
      'يركز الملف على سهولة الوصول وتنوع البرامج واستمراريتها، دون الإشارة إلى مشروع قائم أو جهة حقيقية.',
  },
  {
    id: 'economy',
    category: 'اقتصاد',
    title: 'المتاجر الصغيرة تختبر طرقًا جديدة للبيع',
    excerpt: 'أدوات رقمية أخف قد تمنح الأعمال المحلية مساحة أكبر لفهم الطلب وإدارة المخزون.',
    time: '07:25',
    image: '',
    imageAlt: '',
    before: 'تُدار الطلبات والمخزونات في السيناريو بوسائل متفرقة.',
    changed: 'أُضيف تصور لأداة تجمع متابعة الطلب والمخزون.',
    pending: 'سهولة الاستخدام والتكلفة وملاءمتها لحجم المتجر.',
    context:
      'لا يتضمن هذا النموذج بيانات سوق أو نتائج منشآت فعلية؛ إنه يوضح طريقة عرض قصة اقتصادية في مدار.',
  },
  {
    id: 'technology',
    category: 'تقنية',
    title: 'الذكاء الاصطناعي يدخل أدوات العمل اليومية',
    excerpt:
      'التحول الأهم قد لا يكون في الأداة، بل في طريقة مراجعة المخرجات وتحديد المسؤولية عنها.',
    time: '06:55',
    image: '',
    imageAlt: '',
    before: 'تُستخدم أدوات رقمية افتراضية لإنجاز بعض مهام العمل.',
    changed: 'أُضيفت خطوة للمراجعة البشرية قبل اعتماد المخرجات.',
    pending: 'تحديد المسؤولية وحدود الاستخدام المناسبة.',
    context: 'لا ينسب هذا السيناريو اعتمادًا أو تصريحًا إلى مؤسسة بعينها. التفاصيل توضيحية فقط.',
  },
  {
    id: 'places',
    category: 'ثقافة ووجهات',
    title: 'المشي يفتح نافذة مختلفة على الوجهة',
    excerpt: 'مسارات قصيرة تربط الساحات بالمقاهي والمرافق، وتعيد اكتشاف المكان على مهل.',
    time: '06:30',
    image: '',
    imageAlt: '',
    before: 'تُعرض الوجهة في السيناريو كنقاط منفصلة للزيارة.',
    changed: 'أُضيف مسار مشي يصل بين الساحات والمرافق.',
    pending: 'الظل وإمكانية الوصول وملاءمة المسار لمختلف الزوار.',
    context: 'المحتوى تخيلي للتصميم، وليس تقريرًا عن مشروع منفذ أو موقع محدد.',
  },
];
const categories = ['الكل', 'المدن والتنقل', 'اقتصاد', 'تقنية', 'تقنية وطاقة', 'ثقافة ووجهات'];
const summaryStories = stories.slice(0, 3);
const categoryColors: Record<string, string> = {
  'المدن والتنقل': 'city',
  'تقنية وطاقة': 'energy',
  'ثقافة ووجهات': 'culture',
  اقتصاد: 'economy',
  تقنية: 'technology',
};

function Icon({
  name,
}: {
  name: 'search' | 'bookmark' | 'bookmarkFill' | 'arrow' | 'close' | 'spark' | 'plus' | 'check';
}) {
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  };
  if (name === 'search')
    return (
      <svg {...common}>
        <title>رمز</title>
        <circle cx="10.8" cy="10.8" r="6.8" />
        <path d="m16 16 4.5 4.5" />
      </svg>
    );
  if (name === 'bookmark' || name === 'bookmarkFill')
    return (
      <svg {...common} fill={name === 'bookmarkFill' ? 'currentColor' : 'none'}>
        <title>رمز</title>
        <path d="M6.5 4.5h11v16l-5.5-3.7-5.5 3.7z" />
      </svg>
    );
  if (name === 'arrow')
    return (
      <svg {...common}>
        <title>رمز</title>
        <path d="M19 12H5m0 0 6 6m-6-6 6-6" />
      </svg>
    );
  if (name === 'close')
    return (
      <svg {...common}>
        <title>رمز</title>
        <path d="m18 6-12 12M6 6l12 12" />
      </svg>
    );
  if (name === 'spark')
    return (
      <svg {...common}>
        <title>رمز</title>
        <path d="m12 3 1.5 6.5L20 12l-6.5 1.5L12 20l-1.5-6.5L4 12l6.5-2.5L12 3Z" />
        <path d="m19 2 .7 2.3L22 5l-2.3.7L19 8l-.7-2.3L16 5l2.3-.7L19 2Z" />
      </svg>
    );
  if (name === 'check')
    return (
      <svg {...common}>
        <title>رمز</title>
        <path d="m5 12 4 4L19 6" />
      </svg>
    );
  return (
    <svg {...common}>
      <title>رمز</title>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export default function DesignExperience() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('الكل');
  const [view, setView] = useState<View>('today');
  const [followed, setFollowed] = useState<string[]>(['المدن والتنقل']);
  const [saved, setSaved] = useState<string[]>([]);
  const [active, setActive] = useState<Story | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('change');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const summaryRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const summaryOpenerRef = useRef<HTMLElement | null>(null);
  const detailWasOpenRef = useRef(false);
  const summaryWasOpenRef = useRef(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () =>
      stories.filter((story) => {
        const matchesQuery = `${story.title} ${story.excerpt} ${story.category}`
          .toLowerCase()
          .includes(query.trim().toLowerCase());
        const matchesCategory = category === 'الكل' || story.category === category;
        const matchesView =
          view === 'today' ||
          (view === 'following' && followed.includes(story.category)) ||
          (view === 'saved' && saved.includes(story.id));
        return matchesQuery && matchesCategory && matchesView;
      }),
    [category, followed, query, saved, view],
  );
  const feature = filtered.find((story) => story.id === 'mobility') ?? filtered[0];
  const secondary = filtered.filter((story) => story.id !== feature?.id);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (dialogOpen && !node.open) node.showModal();
    if (!dialogOpen && node.open) node.close();
  }, [dialogOpen]);
  useEffect(() => {
    const node = summaryRef.current;
    if (!node) return;
    if (summaryOpen && !node.open) node.showModal();
    if (!summaryOpen && node.open) node.close();
  }, [summaryOpen]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    if (dialogOpen) detailWasOpenRef.current = true;
    if (summaryOpen) summaryWasOpenRef.current = true;
    if (!dialogOpen && detailWasOpenRef.current) {
      detailWasOpenRef.current = false;
      if (summaryOpen && openerRef.current?.isConnected) openerRef.current.focus();
      else if (!summaryOpen) {
        const target = summaryOpenerRef.current ?? openerRef.current;
        if (target?.isConnected) target.focus();
        summaryOpenerRef.current = null;
        openerRef.current = null;
      }
    }
    if (!summaryOpen && summaryWasOpenRef.current) {
      summaryWasOpenRef.current = false;
      if (!dialogOpen && summaryOpenerRef.current?.isConnected) summaryOpenerRef.current.focus();
      if (!dialogOpen) summaryOpenerRef.current = null;
    }
  }, [dialogOpen, summaryOpen]);

  function openStory(story: Story, opener: HTMLElement) {
    openerRef.current = opener;
    setActive(story);
    setDetailTab('change');
    setDialogOpen(true);
  }
  function toggle(list: string[], setList: (next: string[]) => void, item: string) {
    setList(list.includes(item) ? list.filter((value) => value !== item) : [...list, item]);
  }
  function openSummary(opener: HTMLElement) {
    summaryOpenerRef.current = opener;
    setSummaryOpen(true);
  }
  const navLabel = view === 'today' ? 'اليوم' : view === 'following' ? 'أتابع' : 'محفوظاتي';
  const categoryClass = (value: string) => styles[categoryColors[value] ?? 'city'];

  return (
    <main className={styles.page}>
      <div className={styles.demoBanner}>
        <span className={styles.demoDot} /> نموذج تصميم · المحتوى والمصادر افتراضية
      </div>
      <header className={styles.header}>
        <a className={styles.brand} href="/design" aria-label="مدار، الصفحة الرئيسية">
          <span className={styles.brandMark} aria-hidden="true">
            <i />
            <i />
          </span>
          <span>مدار</span>
        </a>
        <div className={styles.searchWrap}>
          <Icon name="search" />
          <input
            ref={searchRef}
            type="search"
            aria-label="ابحث في القصص"
            placeholder="ابحث في القصص"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <kbd>⌘ K</kbd>
        </div>
        <button
          className={styles.menuButton}
          type="button"
          aria-expanded={mobileNavOpen}
          aria-controls="main-nav"
          onClick={() => setMobileNavOpen((open) => !open)}
        >
          {mobileNavOpen ? 'إغلاق' : 'القائمة'}
        </button>
        <button
          className={styles.summaryTop}
          type="button"
          onClick={(event) => openSummary(event.currentTarget)}
        >
          <Icon name="spark" /> ملخص اليوم
        </button>
      </header>

      <div className={styles.layout}>
        <nav
          id="main-nav"
          className={`${styles.sidebar} ${mobileNavOpen ? styles.sidebarOpen : ''}`}
          aria-label="التنقل الرئيسي"
        >
          <p className={styles.navCaption}>مساحتك</p>
          <button
            type="button"
            className={`${styles.navItem} ${view === 'today' ? styles.navActive : ''}`}
            onClick={() => {
              setView('today');
              setMobileNavOpen(false);
            }}
          >
            <span className={styles.navGlyph}>◷</span> اليوم
          </button>
          <button
            type="button"
            className={`${styles.navItem} ${view === 'following' ? styles.navActive : ''}`}
            onClick={() => {
              setView('following');
              setMobileNavOpen(false);
            }}
          >
            <span className={styles.navGlyph}>⌁</span> أتابع{' '}
            <span className={styles.navCount}>{followed.length}</span>
          </button>
          <button
            type="button"
            className={`${styles.navItem} ${view === 'saved' ? styles.navActive : ''}`}
            onClick={() => {
              setView('saved');
              setMobileNavOpen(false);
            }}
          >
            <Icon name="bookmark" /> محفوظاتي{' '}
            <span className={styles.navCount}>{saved.length}</span>
          </button>
          <div className={styles.sidebarRule} />
          <p className={styles.navCaption}>اهتماماتك</p>
          {['المدن والتنقل', 'تقنية وطاقة', 'ثقافة ووجهات'].map((item, index) => (
            <button
              type="button"
              key={item}
              className={styles.interest}
              onClick={() => {
                setCategory(category === item ? 'الكل' : item);
                setView('today');
                setMobileNavOpen(false);
              }}
            >
              <span className={`${styles.interestDot} ${styles[`interest${index}`]}`} />
              {item}
              <span className={styles.interestArrow} aria-hidden="true">
                {category === item ? '⌃' : '⌄'}
              </span>
            </button>
          ))}
          <aside className={styles.followHint}>
            <span className={styles.hintLine} />
            تابع ما يهمك، وستجد تطوراته هنا.
          </aside>
        </nav>

        <section className={styles.feed} aria-label="القصص">
          <div className={styles.feedHeading}>
            <div>
              <p className={styles.dateLine}>الثلاثاء، 17 نوفمبر 2026</p>
              <h1>
                {view === 'today'
                  ? 'الصورة كاملة. في مدارك.'
                  : view === 'following'
                    ? 'ما تتابعه'
                    : 'ما حفظته'}
              </h1>
            </div>
            <span className={styles.viewLabel}>{navLabel}</span>
          </div>
          <fieldset className={styles.filterRow}>
            <legend className={styles.srOnly}>تصفية حسب الاهتمام</legend>
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                className={`${styles.filterChip} ${category === item ? styles.filterSelected : ''}`}
                aria-pressed={category === item}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </fieldset>

          {!filtered.length ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>
                <Icon name={view === 'saved' ? 'bookmark' : 'search'} />
              </span>
              <h2>
                {view === 'saved'
                  ? 'لم تحفظ قصة بعد'
                  : view === 'following'
                    ? 'لا توجد قصص في اهتماماتك'
                    : 'لم نعثر على قصص مطابقة'}
              </h2>
              <p>
                {view === 'saved'
                  ? 'استخدم علامة الحفظ على أي قصة لتعود إليها لاحقًا.'
                  : view === 'following'
                    ? 'تابع اهتمامًا من القائمة لتظهر قصصه هنا.'
                    : 'جرّب كلمة بحث أخرى أو اختر اهتمامًا مختلفًا.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setCategory('الكل');
                  setView('today');
                }}
              >
                عرض قصص اليوم
              </button>
            </div>
          ) : (
            <>
              {feature && (
                <article
                  className={`${styles.feature} ${!feature.image ? styles.featureTextOnly : ''}`}
                >
                  {feature.image && (
                    <button
                      type="button"
                      className={styles.featureImageButton}
                      aria-label={`افتح تفاصيل: ${feature.title}`}
                      onClick={(event) => openStory(feature, event.currentTarget)}
                    >
                      <Image
                        src={feature.image}
                        alt={feature.imageAlt}
                        fill
                        sizes="(max-width: 680px) 100vw, (max-width: 1199px) 70vw, 500px"
                        loading="eager"
                        className={styles.featureImage}
                      />
                      <span className={styles.imageCaption}>مشهد توضيحي</span>
                    </button>
                  )}
                  <div className={styles.featureBody}>
                    <div className={styles.storyKicker}>
                      <span
                        className={`${styles.categoryDot} ${categoryClass(feature.category)}`}
                      />
                      {feature.category}
                      <span className={styles.kickerDivider} />
                      {feature.time}
                    </div>
                    <button
                      type="button"
                      className={styles.titleButton}
                      onClick={(event) => openStory(feature, event.currentTarget)}
                    >
                      <h2>{feature.title}</h2>
                    </button>
                    <p className={styles.featureExcerpt}>{feature.excerpt}</p>
                    <div className={styles.changePreview}>
                      <span className={styles.changeMark} />
                      <div>
                        <strong>ما الذي تغيّر؟</strong>
                        <p>{feature.changed}</p>
                      </div>
                    </div>
                    <div className={styles.featureActions}>
                      <button
                        type="button"
                        className={styles.readButton}
                        onClick={(event) => openStory(feature, event.currentTarget)}
                      >
                        اقرأ الملف <Icon name="arrow" />
                      </button>
                      <button
                        type="button"
                        className={styles.saveButton}
                        aria-pressed={saved.includes(feature.id)}
                        aria-label={saved.includes(feature.id) ? 'إزالة من المحفوظات' : 'حفظ القصة'}
                        onClick={() => toggle(saved, setSaved, feature.id)}
                      >
                        <Icon name={saved.includes(feature.id) ? 'bookmarkFill' : 'bookmark'} />
                        {saved.includes(feature.id) ? 'محفوظة' : 'احفظ'}
                      </button>
                    </div>
                  </div>
                </article>
              )}
              {secondary.length > 0 && (
                <>
                  <div className={styles.secondaryHeader}>
                    <h2>{feature ? 'قصص أخرى اليوم' : 'قصص اليوم'}</h2>
                    <span>{secondary.length} قصص</span>
                  </div>
                  <div className={styles.storyGrid}>
                    {secondary.map((story) => (
                      <article
                        key={story.id}
                        className={`${styles.storyCard} ${!story.image ? styles.textStory : ''}`}
                      >
                        {story.image && (
                          <button
                            type="button"
                            className={styles.cardImageButton}
                            aria-label={`افتح تفاصيل: ${story.title}`}
                            onClick={(event) => openStory(story, event.currentTarget)}
                          >
                            <Image
                              src={story.image}
                              alt={story.imageAlt}
                              fill
                              sizes="(max-width: 680px) 100vw, 45vw"
                            />
                            <span>مشهد توضيحي</span>
                          </button>
                        )}
                        <div className={styles.cardBody}>
                          <div className={styles.storyKicker}>
                            <span
                              className={`${styles.categoryDot} ${categoryClass(story.category)}`}
                            />
                            {story.category}
                            <span className={styles.kickerDivider} />
                            {story.time}
                          </div>
                          <button
                            type="button"
                            className={styles.cardTitle}
                            onClick={(event) => openStory(story, event.currentTarget)}
                          >
                            <h3>{story.title}</h3>
                          </button>
                          <p>{story.excerpt}</p>
                          <div className={styles.cardFooter}>
                            <button
                              type="button"
                              className={styles.textAction}
                              onClick={(event) => openStory(story, event.currentTarget)}
                            >
                              التفاصيل <Icon name="arrow" />
                            </button>
                            <button
                              type="button"
                              className={styles.iconAction}
                              aria-label={
                                saved.includes(story.id) ? 'إزالة من المحفوظات' : 'حفظ القصة'
                              }
                              aria-pressed={saved.includes(story.id)}
                              onClick={() => toggle(saved, setSaved, story.id)}
                            >
                              <Icon name={saved.includes(story.id) ? 'bookmarkFill' : 'bookmark'} />
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </section>

        <aside className={styles.rail} aria-label="ملخص ومتابعات">
          <section className={styles.summaryCard}>
            <div className={styles.railTitle}>
              <span className={styles.summaryIcon}>
                <Icon name="spark" />
              </span>
              <h2>ملخص اليوم</h2>
            </div>
            <p>ثلاث زوايا تشرح كيف تتقاطع المدينة والطاقة والثقافة في قصص اليوم.</p>
            <ul>
              {summaryStories.map((story) => (
                <li key={story.id}>
                  <span className={`${styles.railDot} ${categoryClass(story.category)}`} />
                  <span>{story.changed}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className={styles.summaryLink}
              onClick={(event) => openSummary(event.currentTarget)}
            >
              اقرأ الملخص <Icon name="arrow" />
            </button>
          </section>
          <section className={styles.followCard}>
            <div className={styles.railTitle}>
              <h2>اهتمامات تتابعها</h2>
              <span className={styles.followCount}>{followed.length}</span>
            </div>
            {['المدن والتنقل', 'تقنية وطاقة', 'ثقافة ووجهات'].map((item, index) => (
              <div className={styles.followRow} key={item}>
                <span className={`${styles.interestDot} ${styles[`interest${index}`]}`} />
                <span>{item}</span>
                <button
                  type="button"
                  aria-label={followed.includes(item) ? `إلغاء متابعة ${item}` : `متابعة ${item}`}
                  aria-pressed={followed.includes(item)}
                  className={followed.includes(item) ? styles.followingButton : styles.followButton}
                  onClick={() => toggle(followed, setFollowed, item)}
                >
                  {followed.includes(item) ? (
                    <>
                      <Icon name="check" />
                      تتابع
                    </>
                  ) : (
                    <>
                      <Icon name="plus" />
                      تابع
                    </>
                  )}
                </button>
              </div>
            ))}
          </section>
          <div className={styles.railNote}>
            <strong>مصادر توضيحية</strong>
            <p>أسماء المصادر داخل هذا النموذج افتراضية، ولا تشير إلى ناشرين حقيقيين.</p>
          </div>
        </aside>
      </div>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby="detail-title"
        onCancel={() => setDialogOpen(false)}
      >
        {active && (
          <div className={styles.dialogInner}>
            <div className={styles.dialogTop}>
              <div className={styles.storyKicker}>
                <span className={`${styles.categoryDot} ${categoryClass(active.category)}`} />
                {active.category}
                <span className={styles.kickerDivider} />
                {active.time}
              </div>
              <button
                type="button"
                className={styles.closeButton}
                aria-label="إغلاق التفاصيل"
                onClick={() => setDialogOpen(false)}
              >
                <Icon name="close" />
              </button>
            </div>
            <h2 id="detail-title" className={styles.dialogTitle}>
              {active.title}
            </h2>
            <p className={styles.dialogExcerpt}>{active.excerpt}</p>
            <fieldset className={styles.dialogTabs}>
              <legend className={styles.srOnly}>تفاصيل القصة</legend>
              {(
                [
                  ['change', 'ما تغيّر'],
                  ['context', 'السياق'],
                  ['sources', 'المصادر'],
                ] as const
              ).map(([id, label]) => (
                <button
                  type="button"
                  key={id}
                  aria-pressed={detailTab === id}
                  className={detailTab === id ? styles.tabActive : ''}
                  onClick={() => setDetailTab(id)}
                >
                  {label}
                </button>
              ))}
            </fieldset>
            <section className={styles.tabPanel}>
              {detailTab === 'change' ? (
                <>
                  <h3>تسلسل الملف</h3>
                  <div className={styles.timeline}>
                    {[
                      ['ما كنا نعرفه', active.before],
                      ['ما تغيّر', active.changed],
                      ['ما ننتظره', active.pending],
                    ].map(([label, text], index) => (
                      <div
                        className={`${styles.timelineItem} ${index === 1 ? styles.timelineCurrent : ''}`}
                        key={label}
                      >
                        <span className={styles.timelineNode} />
                        <div>
                          <strong>{label}</strong>
                          <p>{text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className={styles.panelNote}>
                    هذا التسلسل افتراضي لأغراض التصميم، وليس متابعة لحدث حقيقي.
                  </p>
                </>
              ) : detailTab === 'context' ? (
                <>
                  <h3>ما الذي يحيط بالقصة؟</h3>
                  <p>{active.context}</p>
                  <p className={styles.panelNote}>
                    لا تمثل هذه التفاصيل تحققًا أو تغطية لحدث حقيقي.
                  </p>
                </>
              ) : (
                <>
                  <h3>مصادر توضيحية</h3>
                  <ul className={styles.sourceList}>
                    <li>
                      <span>مصدر توضيحي أول</span>
                      <small>إسناد افتراضي · غير مرتبط بناشر</small>
                    </li>
                    <li>
                      <span>مصدر توضيحي ثانٍ</span>
                      <small>إسناد افتراضي · غير مرتبط بناشر</small>
                    </li>
                  </ul>
                  <p className={styles.panelNote}>
                    هذه الأسماء للتوضيح فقط، ولا تمثل مصادر مستقلة أو حقيقية.
                  </p>
                </>
              )}
            </section>
            <div className={styles.dialogActions}>
              <button
                type="button"
                className={styles.saveButton}
                aria-pressed={saved.includes(active.id)}
                onClick={() => toggle(saved, setSaved, active.id)}
              >
                <Icon name={saved.includes(active.id) ? 'bookmarkFill' : 'bookmark'} />
                {saved.includes(active.id) ? 'محفوظة' : 'احفظ القصة'}
              </button>
              <button
                type="button"
                className={styles.followButton}
                aria-pressed={followed.includes(active.category)}
                onClick={() => toggle(followed, setFollowed, active.category)}
              >
                {followed.includes(active.category) ? (
                  <>
                    <Icon name="check" />
                    تتابع الموضوع
                  </>
                ) : (
                  <>
                    <Icon name="plus" />
                    تابع الموضوع
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </dialog>

      <dialog
        ref={summaryRef}
        className={`${styles.dialog} ${styles.summaryDialog}`}
        aria-labelledby="summary-title"
        onCancel={() => setSummaryOpen(false)}
      >
        <div className={styles.dialogInner}>
          <div className={styles.dialogTop}>
            <span className={styles.summaryIcon}>
              <Icon name="spark" />
            </span>
            <button
              type="button"
              className={styles.closeButton}
              aria-label="إغلاق الملخص"
              onClick={() => setSummaryOpen(false)}
            >
              <Icon name="close" />
            </button>
          </div>
          <h2 id="summary-title" className={styles.dialogTitle}>
            ملخص اليوم
          </h2>
          <p className={styles.dialogExcerpt}>
            في هذا النموذج، تلتقي قصص المدينة والطاقة والثقافة عند سؤال واحد: كيف تتغير تفاصيل
            الحياة اليومية؟
          </p>
          <div className={styles.summaryItems}>
            {summaryStories.map((story) => (
              <button
                type="button"
                key={story.id}
                onClick={(event) => openStory(story, event.currentTarget)}
              >
                <span className={`${styles.categoryDot} ${categoryClass(story.category)}`} />
                <span>
                  <strong>{story.category}</strong>
                  <small>{story.changed}</small>
                </span>
                <Icon name="arrow" />
              </button>
            ))}
          </div>
          <p className={styles.panelNote}>القصص والمصادر افتراضية. الملخص ليس خبرًا موثقًا.</p>
        </div>
      </dialog>
      <footer className={styles.footer}>
        <a href="/">مدار</a>
        <span>نموذج تفاعلي تجريبي · لا يتصل بخدمة الأخبار</span>
        <span>نسخة تصميم للمراجعة</span>
      </footer>
    </main>
  );
}
