/// <reference lib="dom" />
'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type CategoryKey,
  type Claim,
  categories,
  initialFollows,
  kindLabels,
  LAST_VISIT,
  originsPhrase,
  relayCount,
  type Story,
  stories,
  type Watch,
} from './data';
import styles from './design.module.css';

type View = 'home' | 'story' | 'following';
type Theme = 'system' | 'light' | 'dark';
type Frequency = 'فور حدوثه' | 'ملخص يومي';
type IconName = 'arrow' | 'bell' | 'save' | 'search' | 'moon' | 'back';

const iconPaths: Record<IconName, string[]> = {
  arrow: ['M15 6l-6 6 6 6'],
  back: ['m9 6 6 6-6 6'],
  bell: ['M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z', 'M10 20a2 2 0 0 0 4 0'],
  save: ['M6 4h12v17l-6-4-6 4z'],
  search: ['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'm20 20-3.5-3.5'],
  moon: ['M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z'],
};

function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconPaths[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

function CategoryTag({ category }: { category: CategoryKey }) {
  return (
    <span className={styles.cat}>
      <i className={styles[`tone_${categories[category].tone}`]} />
      {categories[category].name}
    </span>
  );
}

function Activity({ values }: { values: number[] }) {
  const width = 160;
  const height = 28;
  const step = width / (values.length - 1);
  const points = values.map((value, index) => ({
    x: width - index * step,
    y: height - 4 - (value / 3) * (height - 10),
    value,
    last: index === values.length - 1,
  }));
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <path
        d={`M${points.map((p) => `${p.x} ${p.y}`).join(' L')}`}
        className={styles.activityLine}
        vectorEffect="non-scaling-stroke"
      />
      {points
        .filter((p) => p.value > 0)
        .map((p) => (
          <circle
            key={p.x}
            cx={p.x}
            cy={p.y}
            r={2.6}
            className={p.last ? styles.activityLast : styles.activityDot}
          />
        ))}
    </svg>
  );
}

function States({ story, large = false }: { story: Story; large?: boolean }) {
  return (
    <div className={`${styles.states} ${large ? styles.statesLarge : ''}`}>
      <div>
        <span className={styles.stateLabel}>ما كنا نعرفه</span>
        {story.before}
      </div>
      <div className={styles.stateNow}>
        <span className={styles.stateLabel}>ما تغيّر</span>
        {story.changed}
      </div>
      <div className={styles.stateWait}>
        <span className={styles.stateLabel}>ما ننتظره</span>
        {story.pending}
      </div>
    </div>
  );
}

function Provenance({ story }: { story: Story }) {
  const relays = relayCount(story);
  return (
    <div className={styles.prov}>
      <span className={styles.bars} aria-hidden="true">
        {story.coverage.map((origin) => (
          <span key={origin.name} className={styles.barOrigin} />
        ))}
        {Array.from({ length: relays }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: عناصر زخرفية متطابقة
          <span key={i} />
        ))}
      </span>
      {relays + story.coverage.length} تغطيات تعود إلى {originsPhrase(story.coverage.length)}
    </div>
  );
}

function StoryImage({
  story,
  className,
  priority = false,
}: {
  story: Story;
  className?: string;
  priority?: boolean;
}) {
  if (!story.image) return null;
  return (
    <div className={className}>
      <Image
        src={story.image.src}
        alt={story.image.alt}
        fill
        priority={priority}
        sizes="(max-width: 820px) 100vw, 640px"
        className={styles.cover}
      />
      <span className={styles.imgTag}>صورة توضيحية</span>
    </div>
  );
}

function ClaimRow({ claim }: { claim: Claim }) {
  return (
    <li className={styles.claim}>
      <span className={styles.claimText}>{claim.text}</span>
      <span className={`${styles.kind} ${styles[`kind_${claim.kind}`]}`}>
        {kindLabels[claim.kind]}
      </span>
      <span className={styles.claimOrigin}>
        <span>
          الأصل: <b>{claim.origin}</b>
        </span>
        <span>{claim.reach}</span>
        <span>{claim.time}</span>
      </span>
    </li>
  );
}

function developments(count: number) {
  if (count === 1) return 'تطورًا واحدًا';
  if (count === 2) return 'تطورين';
  return `${count} تطورات`;
}

const fallbackWatch: Watch = {
  label: 'أي تعديل على معلومة في الملف',
  status: 'يشمل تغيّر الأرقام والمواعيد المعلنة',
};

function watchOptionsFor(story: Story): Watch[] {
  return story.watches.length ? story.watches : [fallbackWatch];
}

export default function DesignExperience() {
  const [view, setView] = useState<View>('home');
  const [storyId, setStoryId] = useState('metro');
  const [filter, setFilter] = useState<CategoryKey | 'all'>('all');
  const [query, setQuery] = useState('');
  const [saved, setSaved] = useState<string[]>([]);
  const [follows, setFollows] = useState<Record<string, string[]>>(initialFollows);
  const [draft, setDraft] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<Record<string, Frequency>>({ metro: 'فور حدوثه' });
  const [theme, setTheme] = useState<Theme>('system');
  const [toast, setToast] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const followRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<'heading' | 'follow' | null>(null);

  const story = stories.find((s) => s.id === storyId) ?? (stories[0] as Story);
  const followCount = Object.values(follows).reduce((total, list) => total + list.length, 0);

  const navigate = useCallback(
    (next: View, id?: string, focus: 'heading' | 'follow' = 'heading') => {
      setView(next);
      if (id) setStoryId(id);
      pendingFocus.current = focus;
      const hash = next === 'story' ? `story-${id ?? ''}` : next;
      if (window.location.hash.slice(1) !== hash) window.history.replaceState(null, '', `#${hash}`);
    },
    [],
  );

  useEffect(() => {
    const fromHash = () => {
      const hash = window.location.hash.slice(1);
      if (hash.startsWith('story-') && stories.some((s) => s.id === hash.slice(6))) {
        setView('story');
        setStoryId(hash.slice(6));
      } else if (hash === 'following') setView('following');
      else setView('home');
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, []);

  useEffect(() => {
    setDraft(follows[storyId] ?? []);
  }, [storyId, follows]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: نعيد التركيز عند تغير العرض أو الملف
  useEffect(() => {
    const target = pendingFocus.current;
    pendingFocus.current = null;
    if (!target) return;
    if (target === 'follow' && followRef.current) {
      followRef.current.scrollIntoView({ block: 'start' });
      followRef.current.querySelector('input')?.focus({ preventScroll: true });
    } else {
      window.scrollTo(0, 0);
      headingRef.current?.focus({ preventScroll: true });
    }
  }, [view, storyId]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const visible = useMemo(() => {
    const q = query.trim();
    return stories.filter(
      (s) =>
        (filter === 'all' || s.category === filter) &&
        (!q || `${s.title} ${s.excerpt} ${s.changed}`.includes(q)),
    );
  }, [filter, query]);
  const lead = visible[0];
  const rest = visible.slice(1);

  const watched = stories.flatMap((s) =>
    watchOptionsFor(s)
      .filter((w) => (follows[s.id] ?? []).includes(w.label))
      .map((w) => ({ s, w })),
  );

  const toggleSave = (id: string) => {
    const isSaved = saved.includes(id);
    setSaved(isSaved ? saved.filter((x) => x !== id) : [...saved, id]);
    setToast(isSaved ? 'أُزيل من المحفوظات' : 'حُفظ الملف في هذه الصفحة');
  };

  const applyFollow = () => {
    setFollows({ ...follows, [story.id]: draft });
    setToast(draft.length ? 'فُعّلت المتابعة داخل النموذج' : 'أُلغيت متابعة هذا الملف');
  };

  const cycleTheme = () => {
    const prefersDark =
      typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
    setTheme(isDark ? 'light' : 'dark');
  };

  const storyFollows = follows[story.id] ?? [];
  const watchOptions = watchOptionsFor(story);
  const followedStories = stories.filter((s) => (follows[s.id] ?? []).length > 0);
  const changedCount = followedStories.filter((s) => s.diff.length > 0).length;
  const sinceSummary = followedStories.length
    ? `ملفات تتابعها: ${followedStories.length}. تغيّر منها ${changedCount}، و${followedStories.length - changedCount} بلا جديد. نعرض ما تغيّر فقط، لا كل ما نُشر.`
    : 'لا تتابع أي ملف بعد. افتح ملفًا واختر تطورًا يهمك، وسنعرض هنا ما تغيّر فيه فقط.';
  const currentFrequency = frequency[story.id] ?? 'فور حدوثه';

  return (
    <div className={styles.page} data-theme={theme === 'system' ? undefined : theme}>
      <p className={styles.notice}>
        نموذج تصميم · <b>كل القصص والمصادر والجهات هنا افتراضية</b> · الحفظ والمتابعة داخل هذه
        الصفحة فقط
      </p>

      <header className={styles.top}>
        <div className={styles.topInner}>
          <span className={styles.logo}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" />
              <circle cx="18.2" cy="6.2" r="2.2" fill="currentColor" />
            </svg>
            <span className={styles.wordmark} aria-hidden="true">
              مـــدار
            </span>
            <span className={styles.srOnly}>مدار</span>
          </span>
          <nav className={styles.navTabs} aria-label="التنقل الرئيسي">
            <button
              type="button"
              aria-current={view === 'home' ? 'page' : undefined}
              onClick={() => navigate('home')}
            >
              اليوم
            </button>
            <button
              type="button"
              aria-current={view === 'following' ? 'page' : undefined}
              onClick={() => navigate('following')}
            >
              متابعاتي
              {followCount > 0 && <span className={styles.count}>{followCount}</span>}
            </button>
          </nav>
          <label className={styles.search}>
            <Icon name="search" size={18} />
            <input
              id="madar-search"
              type="search"
              placeholder="ابحث في ملفات القصص"
              aria-label="ابحث في ملفات القصص"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (view !== 'home') setView('home');
              }}
            />
          </label>
          <span className={styles.lastVisit}>
            <i />
            آخر زيارة لك: {LAST_VISIT}
          </span>
          <button
            type="button"
            className={styles.themeBtn}
            onClick={cycleTheme}
            aria-label="تبديل الوضع الليلي"
          >
            <Icon name="moon" size={18} />
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {view === 'home' && (
          <section aria-labelledby="home-title">
            <div className={styles.since}>
              <div>
                <h2 id="since-title">منذ زيارتك الأخيرة</h2>
                <p className={styles.sinceSub}>{sinceSummary}</p>
              </div>
              <div className={styles.sinceList}>
                {followedStories.map((s) => {
                  const quiet = s.diff.length === 0;
                  const first = s.diff[0];
                  return (
                    <button
                      type="button"
                      key={s.id}
                      className={`${styles.sinceItem} ${quiet ? styles.sinceQuiet : ''}`}
                      onClick={() => navigate('story', s.id)}
                    >
                      <span className={styles.sinceMeta}>
                        <i className={styles[`tone_${categories[s.category].tone}`]} />
                        {categories[s.category].name} ·{' '}
                        {quiet ? 'لا جديد' : `آخر تحديث ${s.updatedAt}`}
                      </span>
                      <span className={styles.sinceTitle}>{s.title}</span>
                      <span className={styles.sinceChange}>
                        {quiet || !first
                          ? 'لا تطور منذ زيارتك.'
                          : `تغيّر: ${first.type === 'mod' ? `${first.label}: ${first.to}` : first.text}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.homeGrid}>
              <div className={styles.minw}>
                <div className={styles.dayHead}>
                  <div>
                    <div className={styles.date}>الثلاثاء 17 نوفمبر 2026</div>
                    <h1 id="home-title" ref={headingRef} tabIndex={-1}>
                      ملفات اليوم
                    </h1>
                  </div>
                  <fieldset className={styles.chips} aria-label="تصفية حسب الموضوع">
                    {(['all', ...Object.keys(categories)] as (CategoryKey | 'all')[]).map((key) => (
                      <button
                        type="button"
                        key={key}
                        className={styles.chip}
                        aria-pressed={filter === key}
                        onClick={() => setFilter(key)}
                      >
                        {key === 'all' ? 'الكل' : categories[key].name}
                      </button>
                    ))}
                  </fieldset>
                </div>

                {lead && (
                  <article className={`${styles.lead} ${lead.image ? '' : styles.leadNoImage}`}>
                    <StoryImage story={lead} className={styles.leadImage} priority />
                    <div className={styles.leadBody}>
                      <div className={styles.meta}>
                        <CategoryTag category={lead.category} />
                        <span className={styles.sep} />
                        ملف مفتوح منذ {lead.openedOn}
                        <span className={styles.sep} />
                        {lead.updateCount} تحديثات
                        {lead.diff.length > 0 && (
                          <span className={styles.badgeNew}>جديد منذ زيارتك</span>
                        )}
                      </div>
                      <h2>{lead.title}</h2>
                      <p className={styles.excerpt}>{lead.excerpt}</p>
                      <States story={lead} />
                      <Provenance story={lead} />
                      <div className={styles.actions}>
                        <button
                          type="button"
                          className={`${styles.btn} ${styles.primary}`}
                          onClick={() => navigate('story', lead.id)}
                        >
                          افتح الملف <Icon name="arrow" />
                        </button>
                        <button
                          type="button"
                          className={`${styles.btn} ${(follows[lead.id] ?? []).length ? styles.on : ''}`}
                          onClick={() => navigate('story', lead.id, 'follow')}
                        >
                          <Icon name="bell" />
                          {(follows[lead.id] ?? []).length
                            ? `تتابع ${developments((follows[lead.id] ?? []).length)}`
                            : 'تابع تطورًا'}
                        </button>
                        <button
                          type="button"
                          className={`${styles.btn} ${saved.includes(lead.id) ? styles.on : ''}`}
                          aria-pressed={saved.includes(lead.id)}
                          onClick={() => toggleSave(lead.id)}
                        >
                          <Icon name="save" />
                          {saved.includes(lead.id) ? 'محفوظ' : 'احفظ'}
                        </button>
                      </div>
                    </div>
                  </article>
                )}

                {rest.length > 0 && (
                  <>
                    <div className={styles.secHead}>
                      <h3>ملفات أخرى تتحرك</h3>
                      <span>{rest.length} ملفات</span>
                    </div>
                    <div className={styles.files}>
                      {rest.map((s) => (
                        <button
                          type="button"
                          key={s.id}
                          className={styles.file}
                          onClick={() => navigate('story', s.id)}
                        >
                          <div className={styles.minw}>
                            <div className={styles.meta}>
                              <CategoryTag category={s.category} />
                              <span className={styles.sep} />
                              آخر تحديث {s.updatedAt}
                              {s.diff.length > 0 && <span className={styles.badgeNew}>جديد</span>}
                            </div>
                            <h4>{s.title}</h4>
                            <p className={styles.last}>
                              <b>ما تغيّر:</b> {s.changed}
                            </p>
                          </div>
                          <div className={styles.activity}>
                            <Activity values={s.activity} />
                            <span>حركة الملف آخر 7 أيام · {s.updateCount} تحديثات</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {!visible.length && (
                  <p className={styles.empty}>
                    لا توجد ملفات تطابق البحث. جرّب كلمة أخرى أو اختر «الكل».
                  </p>
                )}
              </div>

              <aside className={styles.side}>
                <div className={styles.card}>
                  <h3>
                    تطورات تنتظرها <small>محاكاة</small>
                  </h3>
                  <ul className={styles.watch}>
                    {watched.length ? (
                      watched.map(({ s, w }) => (
                        <li key={`${s.id}-${w.label}`}>
                          <span className={styles.watchQ}>{w.label}</span>
                          <span className={styles.watchIn}>في: {s.title}</span>
                          <span
                            className={`${styles.status} ${w.happened ? styles.statusHit : styles.statusWait}`}
                          >
                            {w.status}
                          </span>
                        </li>
                      ))
                    ) : (
                      <li className={styles.fine}>
                        لا تتابع تطورًا محددًا بعد. افتح أي ملف واختر ما يهمك.
                      </li>
                    )}
                  </ul>
                </div>
                <div className={styles.card}>
                  <h3>كيف نقرأ الملف</h3>
                  <dl className={styles.legend}>
                    {(
                      [
                        ['official', 'المعلومة صادرة عن صاحبها مباشرة، ومنسوبة إليه.'],
                        ['independent', 'جهة نشرت المعلومة من عملها الخاص، لا نقلًا عن غيرها.'],
                        ['relayed', 'إعادة نشر لأصل موجود. كثرة النقل لا تعني تأكيدًا.'],
                        ['open', 'قيل ولم يُعلن أصله، أو تعارضت فيه الروايات.'],
                      ] as const
                    ).map(([kind, text]) => (
                      <div key={kind}>
                        <span className={`${styles.swatch} ${styles[`swatch_${kind}`]}`} />
                        <span>
                          <dt>{kindLabels[kind]}</dt>
                          <dd className={styles.fine}>{text}</dd>
                        </span>
                      </div>
                    ))}
                  </dl>
                </div>
                <p className={styles.fine}>
                  التصنيف في هذا النموذج مكتوب يدويًا للتوضيح. في المنتج يحتاج مراجعة تحريرية قبل
                  عرضه، ولا يُستنتج من عدد المصادر.
                </p>
              </aside>
            </div>
          </section>
        )}

        {view === 'story' && (
          <section aria-labelledby="story-title">
            <div className={styles.crumb}>
              <button type="button" onClick={() => navigate('home')}>
                <Icon name="back" />
                ملفات اليوم
              </button>
              <span>/</span>
              <span>{categories[story.category].name}</span>
            </div>
            <div className={`${styles.storyHero} ${story.image ? '' : styles.storyHeroNoImage}`}>
              <div className={styles.minw}>
                <div className={styles.meta}>
                  <CategoryTag category={story.category} />
                  <span className={styles.sep} />
                  آخر تحديث اليوم {story.updatedAt}
                </div>
                <h1 id="story-title" ref={headingRef} tabIndex={-1}>
                  {story.title}
                </h1>
                <p className={styles.excerptLarge}>{story.excerpt}</p>
                <dl className={styles.fileMeta}>
                  <div>
                    <dt>الملف مفتوح منذ</dt>
                    <dd>{story.openedOn}</dd>
                  </div>
                  <div>
                    <dt>تحديثات</dt>
                    <dd>{story.updateCount}</dd>
                  </div>
                  <div>
                    <dt>أصول المعلومات</dt>
                    <dd>{story.coverage.length}</dd>
                  </div>
                  <div>
                    <dt>تغطيات مرصودة</dt>
                    <dd>{relayCount(story) + story.coverage.length}</dd>
                  </div>
                </dl>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.primary}`}
                    onClick={() => {
                      followRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      followRef.current?.querySelector('input')?.focus({ preventScroll: true });
                    }}
                  >
                    <Icon name="bell" />
                    {storyFollows.length
                      ? `تتابع ${developments(storyFollows.length)}`
                      : 'تابع تطورًا محددًا'}
                  </button>
                  <button
                    type="button"
                    className={`${styles.btn} ${saved.includes(story.id) ? styles.on : ''}`}
                    aria-pressed={saved.includes(story.id)}
                    onClick={() => toggleSave(story.id)}
                  >
                    <Icon name="save" />
                    {saved.includes(story.id) ? 'محفوظ' : 'احفظ الملف'}
                  </button>
                </div>
              </div>
              <StoryImage story={story} className={styles.storyImage} priority />
            </div>

            <div className={styles.storyGrid}>
              <div className={styles.minw}>
                {story.diff.length ? (
                  <div className={styles.diff}>
                    <h2>
                      <Icon name="bell" /> منذ قراءتك الأخيرة <small>({LAST_VISIT})</small>
                    </h2>
                    <ul>
                      {story.diff.map((d) => (
                        <li key={d.type === 'mod' ? d.label : d.text}>
                          <span className={`${styles.tag} ${styles[`tag_${d.type}`]}`}>
                            {{ add: 'جديد', mod: 'تعدّل', remind: 'للتذكير' }[d.type]}
                          </span>
                          <span>
                            {d.type === 'mod' ? (
                              <>
                                {d.label}: <del>{d.from}</del> ← {d.to}.
                              </>
                            ) : (
                              d.text
                            )}
                            <span className={styles.when}>{d.when}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className={`${styles.diff} ${styles.diffQuiet}`}>
                    <h2>منذ قراءتك الأخيرة</h2>
                    <p className={styles.fine}>
                      لا جديد في هذا الملف منذ زيارتك. هذا ما نعرفه حتى الآن.
                    </p>
                  </div>
                )}

                <States story={story} large />

                <div className={styles.panel}>
                  <h2>المعلومات في الملف وأصل كل منها</h2>
                  <p className={styles.lede}>
                    كل معلومة منسوبة إلى أول من قالها. عدد الناقلين لا يغيّر تصنيفها.
                  </p>
                  <ul className={styles.claims}>
                    {story.claims.map((claim) => (
                      <ClaimRow key={claim.text} claim={claim} />
                    ))}
                  </ul>
                </div>

                <div className={styles.panel}>
                  <h2>خريطة التغطية</h2>
                  <p className={styles.lede}>
                    من أين جاءت المعلومة، ومن نقلها. هنا يظهر الفرق بين عشرة أخبار وعشرة نقول لخبر
                    واحد.
                  </p>
                  <dl className={styles.covSum}>
                    <div>
                      <dd>{story.coverage.length}</dd>
                      <dt>أصل للمعلومات</dt>
                    </div>
                    <div>
                      <dd>{relayCount(story)}</dd>
                      <dt>تغطية تنقل عن أصل</dt>
                    </div>
                    <div>
                      <dd>{story.coverage.filter((c) => c.independent).length}</dd>
                      <dt>عمل مستقل</dt>
                    </div>
                  </dl>
                  <div className={styles.cov}>
                    {story.coverage.map((origin) => {
                      const outlets = origin.outlets.length
                        ? origin.outlets
                        : [{ name: 'لا نقل حتى الآن', relay: false }];
                      return (
                        <div className={styles.covRow} key={origin.name}>
                          <div
                            className={`${styles.covOrigin} ${origin.independent ? styles.covIndependent : ''}`}
                          >
                            <div className={styles.covName}>{origin.name}</div>
                            <div className={styles.covDetail}>{origin.detail}</div>
                          </div>
                          <ul
                            className={`${styles.covOut} ${outlets.length === 1 ? styles.covSingle : ''}`}
                          >
                            {outlets.map((outlet) => (
                              <li
                                key={outlet.name}
                                className={`${styles.outlet} ${origin.independent ? styles.outletOwn : ''}`}
                              >
                                {outlet.name}
                                <span>
                                  {outlet.relay ? 'نقل' : origin.independent ? 'مصدر ذاتي' : '—'}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={styles.panel}>
                  <h2>تسلسل الملف</h2>
                  <p className={styles.lede}>
                    كل تحديث بوقته، بما فيه تعديل المصادر لعناوينها بعد النشر.
                  </p>
                  <ol className={styles.timeline}>
                    {story.timeline.map((entry) =>
                      'day' in entry ? (
                        <li key={`d-${entry.day}`} className={styles.dayRow}>
                          <span>{entry.day}</span>
                        </li>
                      ) : (
                        <li
                          key={`${entry.time}-${entry.text}`}
                          className={
                            entry.isNew ? styles.tlNew : entry.revision ? styles.tlRevision : ''
                          }
                        >
                          <div className={styles.when}>{entry.time}</div>
                          <div>{entry.text}</div>
                          {entry.revision && (
                            <div className={styles.revision}>
                              <del>{entry.revision.from}</del> ← {entry.revision.to}
                            </div>
                          )}
                        </li>
                      ),
                    )}
                  </ol>
                </div>
              </div>

              <aside className={styles.minw}>
                <div className={`${styles.panel} ${styles.follow}`} ref={followRef}>
                  <h2>تابع تطورًا محددًا</h2>
                  <p className={styles.fine}>
                    اختر ما يهمك في هذا الملف فقط. لن نعرض لك كل خبر جديد عنه.
                  </p>
                  <div className={styles.opts}>
                    {watchOptions.map((w, i) => {
                      const id = `watch-${story.id}-${i}`;
                      return (
                        <label key={w.label} className={styles.opt} htmlFor={id}>
                          <input
                            type="checkbox"
                            id={id}
                            checked={draft.includes(w.label)}
                            onChange={(e) =>
                              setDraft(
                                e.target.checked
                                  ? [...draft, w.label]
                                  : draft.filter((x) => x !== w.label),
                              )
                            }
                          />
                          <span>
                            {w.label}
                            <small>{w.status}</small>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <fieldset className={styles.seg} aria-label="متى نخبرك">
                    {(['فور حدوثه', 'ملخص يومي'] as Frequency[]).map((option) => (
                      <button
                        type="button"
                        key={option}
                        aria-pressed={currentFrequency === option}
                        onClick={() => setFrequency({ ...frequency, [story.id]: option })}
                      >
                        {option}
                      </button>
                    ))}
                  </fieldset>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.primary} ${styles.block}`}
                    onClick={applyFollow}
                  >
                    <Icon name="bell" />
                    {storyFollows.length ? 'حدّث المتابعة' : 'فعّل المتابعة'}
                  </button>
                  {storyFollows.length > 0 && (
                    <p className={styles.followDone}>
                      تتابع {developments(storyFollows.length)} في هذا الملف · {currentFrequency}
                    </p>
                  )}
                  <p className={styles.fine}>
                    في هذا النموذج تُحفظ اختياراتك داخل الصفحة فقط، ولا تصل إشعارات.
                  </p>
                </div>
              </aside>
            </div>
          </section>
        )}

        {view === 'following' && (
          <section aria-labelledby="following-title">
            <div className={styles.dayHead}>
              <div>
                <div className={styles.date}>ما تختاره أنت، لا ما نقترحه</div>
                <h1 id="following-title" ref={headingRef} tabIndex={-1}>
                  متابعاتي
                </h1>
              </div>
            </div>
            <p className={`${styles.fine} ${styles.measure}`}>
              تتابع تطورًا محددًا داخل الملف، مثل «موعد التشغيل»، بدل متابعة القصة كلها. عندما يحدث
              التطور نعرضه هنا وفي «منذ زيارتك الأخيرة». لا تصل إشعارات حقيقية من هذا النموذج.
            </p>
            <div className={styles.followGrid}>
              {stories.flatMap((s) =>
                (follows[s.id] ?? []).map((label) => {
                  const w = watchOptionsFor(s).find((x) => x.label === label);
                  return (
                    <div className={styles.followCard} key={`${s.id}-${label}`}>
                      <div className={styles.meta}>
                        <CategoryTag category={s.category} />
                      </div>
                      <div className={styles.followQ}>{label}</div>
                      <div className={styles.followIn}>في ملف: {s.title}</div>
                      <div className={styles.followRow}>
                        <span
                          className={`${styles.status} ${w?.happened ? styles.statusHit : styles.statusWait}`}
                        >
                          {w?.status ?? 'يراقب كل تعديل'}
                        </span>
                        <button
                          type="button"
                          className={styles.btn}
                          onClick={() => navigate('story', s.id)}
                        >
                          افتح الملف <Icon name="arrow" />
                        </button>
                      </div>
                    </div>
                  );
                }),
              )}
              {followCount === 0 && (
                <p className={styles.empty}>لا متابعات بعد. افتح ملفًا واختر التطور الذي يهمك.</p>
              )}
            </div>
          </section>
        )}
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span>مدار · نموذج تصميم v2 للمراجعة</span>
          <span>لا يتصل بخدمة الأخبار · الصور توضيحية ومرخصة، والاعتمادات في CREDITS.md</span>
        </div>
      </footer>
      <div className={styles.toast} role="status">
        {toast}
      </div>
    </div>
  );
}
