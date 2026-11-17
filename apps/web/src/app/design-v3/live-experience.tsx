/// <reference lib="dom" />
'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import base from '../design/design.module.css';
import {
  CLOCK_LATER,
  CLOCK_NOW,
  cities,
  files,
  initialFollows,
  initialLastReads,
  sectors,
} from './data';
import {
  activityScore,
  buildDigest,
  computeMetrics,
  daysBetween,
  deliveryNote,
  developmentsOf,
  fieldLabel,
  rankFiles,
  reachOf,
  summarizeSince,
  weightOf,
} from './engine';
import s from './live.module.css';
import {
  type Certainty,
  certaintyLabels,
  type Development,
  deliveryLabels,
  developmentLabels,
  type Evidence,
  type FileKind,
  type Follow,
  kindLabels,
  type LiveFile,
  scopeLabels,
  templates,
  type Weight,
  weightLabels,
} from './model';

type View = 'madari' | 'file' | 'discover' | 'digest' | 'metrics';
type ClockKey = 'now' | 'later';
type Theme = 'system' | 'light' | 'dark';
type Flag = { id: string; title: string; kind: 'not-new' | 'wrong'; at: string };

const iconPaths = {
  back: ['m9 6 6 6-6 6'],
  bell: ['M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z', 'M10 20a2 2 0 0 0 4 0'],
  moon: ['M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z'],
  clock: ['M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z', 'M12 8v4l3 2'],
  check: ['m5 13 4 4 10-10'],
} as const;

function Icon({ name, size = 16 }: { name: keyof typeof iconPaths; size?: number }) {
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

const day = (value: string) => value.slice(0, 10);

function TypeTag({ kind }: { kind: FileKind }) {
  return (
    <span className={base.cat}>
      <i className={base[`tone_${kindLabels[kind].tone}`]} />
      {kindLabels[kind].name}
    </span>
  );
}

function CertaintyTag({ certainty }: { certainty: Certainty }) {
  return (
    <span className={`${base.kind} ${base[`kind_${certainty}`]}`}>
      {certaintyLabels[certainty]}
    </span>
  );
}

function WeightBadge({ weight }: { weight: Weight }) {
  return (
    <span className={`${s.wBadge} ${s[`w${weight}`]}`}>
      <b>{weight}</b>
      {weightLabels[weight].name}
    </span>
  );
}

function Quote({ evidence }: { evidence: Evidence }) {
  return (
    <blockquote className={s.quote}>
      «{evidence.quote}»
      <cite>
        {evidence.source} · {day(evidence.publishedAt)} ·{' '}
        <a href={evidence.url} target="_blank" rel="noreferrer noopener">
          الأصل
        </a>{' '}
        · {evidence.rights}
      </cite>
    </blockquote>
  );
}

function StateCard({ file }: { file: LiveFile }) {
  const [open, setOpen] = useState<string[]>([]);
  return (
    <div className={base.panel}>
      <h2 id="state-card">بطاقة الحالة</h2>
      <p className={base.lede}>
        لكل حقل قيمة وأصل وتاريخ ودرجة ثبوت. القيمة القديمة لا تُمسح، وتبقى في تاريخ الحقل.
      </p>
      <div className={s.cardTable}>
        {file.fields.map((field) => {
          const expanded = open.includes(field.key);
          return (
            <div className={s.fieldRow} key={field.key}>
              <div className={s.fieldTop}>
                <div>
                  <span className={s.fieldLabel}>{field.label}</span>
                  {field.value === null ? (
                    <span className={`${s.fieldValue} ${s.unset}`}>لم يُعلن بعد</span>
                  ) : (
                    <span className={s.fieldValue}>{field.value}</span>
                  )}
                </div>
                <CertaintyTag certainty={field.certainty} />
                <div className={s.fieldMeta}>
                  <span>آخر تحديث {day(field.asOf)}</span>
                  {field.origin ? (
                    <a href={field.origin.url} target="_blank" rel="noreferrer noopener">
                      {field.origin.name}
                    </a>
                  ) : (
                    <span>لا أصل بعد</span>
                  )}
                  {field.history.length > 0 && (
                    <button
                      type="button"
                      className={s.historyBtn}
                      aria-expanded={expanded}
                      onClick={() =>
                        setOpen((current) =>
                          current.includes(field.key)
                            ? current.filter((key) => key !== field.key)
                            : [...current, field.key],
                        )
                      }
                    >
                      تاريخ الحقل ({field.history.length})
                    </button>
                  )}
                </div>
              </div>
              {expanded && (
                <div className={s.history}>
                  {field.history.map((change) => (
                    <div className={s.historyRow} key={`${field.key}-${change.at}`}>
                      <time dateTime={change.at}>{day(change.at)}</time>
                      <span>
                        {change.from ?? 'لم يُعلن'} ← {change.to ?? 'غير محسوم'}
                        {change.evidence ? ` · ${change.evidence.source}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PathRail({ file, now }: { file: LiveFile; now: Date }) {
  return (
    <div className={base.panel}>
      <h2 id="path">المسار</h2>
      <p className={base.lede}>
        معالم {templates[file.kind].name} من البداية للنهاية: ما تحقق، وأين نحن، وما ننتظره.
      </p>
      <ol className={s.rail}>
        {file.milestones.map((milestone) => {
          const overdue =
            milestone.status !== 'done' &&
            Boolean(milestone.expectedAt) &&
            daysBetween(milestone.expectedAt ?? '', now) >= 1;
          const state =
            milestone.status === 'done'
              ? 'تحقق'
              : overdue
                ? 'موعد فائت'
                : milestone.status === 'current'
                  ? 'جارٍ'
                  : 'منتظر';
          return (
            <li
              key={milestone.id}
              className={`${s.railItem} ${
                milestone.status === 'done'
                  ? s.railDone
                  : overdue
                    ? s.railOverdue
                    : milestone.status === 'current'
                      ? s.railCurrent
                      : ''
              }`}
            >
              <span className={s.railState}>{state}</span>
              <span className={s.railLabel}>{milestone.label}</span>
              <span className={s.railDate}>
                {milestone.achievedAt
                  ? `تحقق ${day(milestone.achievedAt)}`
                  : milestone.expectedAt
                    ? `المعلن ${day(milestone.expectedAt)}`
                    : 'بلا موعد معلن'}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function SceneLog({ file }: { file: LiveFile }) {
  const [compare, setCompare] = useState(false);
  if (file.scene.length === 0) {
    return (
      <div className={base.panel}>
        <h2 id="scene">سجل المشهد</h2>
        <p className={base.lede}>لا صور في هذا الملف. لا تُضاف صورة بلا أساس حقوق مسجّل.</p>
      </div>
    );
  }
  const first = file.scene[0];
  const last = file.scene[file.scene.length - 1];
  const pair = compare && first && last ? [first, last] : file.scene;
  return (
    <div className={base.panel}>
      <h2 id="scene">سجل المشهد</h2>
      <p className={base.lede}>
        صور مؤرخة من الزاوية نفسها. الصور هنا توضيحية من أصول النموذج، وليست صورًا حقيقية للموقع.
      </p>
      {file.scene.length > 1 && (
        <div className={base.seg}>
          <button type="button" aria-pressed={!compare} onClick={() => setCompare(false)}>
            كل اللقطات ({file.scene.length})
          </button>
          <button type="button" aria-pressed={compare} onClick={() => setCompare(true)}>
            قبل وبعد
          </button>
        </div>
      )}
      <div className={compare ? s.comparePair : s.sceneGrid}>
        {pair.map((shot) => (
          <figure className={s.sceneCard} key={shot.id}>
            <div className={s.sceneImg}>
              <Image src={shot.src} alt={shot.alt} fill sizes="(max-width: 720px) 100vw, 360px" />
            </div>
            <figcaption className={s.sceneBody}>
              <time dateTime={shot.at}>{day(shot.at)}</time>
              {shot.caption} · {shot.angle}
              <div className={s.rights}>
                المالك: {shot.rights.owner} · {shot.rights.basis}
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

function DevelopmentRow({
  file,
  dev,
  follow,
  lastReadAt,
  dismissed,
  onDismiss,
}: {
  file: LiveFile;
  dev: Development;
  follow: Follow;
  lastReadAt: string;
  dismissed: boolean;
  onDismiss: (dev: Development, kind: 'not-new' | 'wrong') => void;
}) {
  const weight = weightOf(dev, file);
  const { reach, gate } = reachOf(dev, weight, follow);
  const fresh = Date.parse(dev.at) > Date.parse(lastReadAt);
  return (
    <li className={`${s.devRow} ${dismissed ? s.devDismissed : ''}`}>
      <WeightBadge weight={weight} />
      <div>
        <span className={s.devTitle}>{dev.title}</span>
        {(dev.type === 'date' || dev.type === 'number' || dev.type === 'retraction') && (
          <span className={s.changeLine}>
            <span>{fieldLabel(file, dev.fieldKey)}:</span>
            <del>{dev.from ?? 'لم يُعلن'}</del>
            <ins>{dev.to ?? 'غير محسوم'}</ins>
          </span>
        )}
        {dev.detail && <p className={s.devBody}>{dev.detail}</p>}
        <div className={s.devMeta}>
          <span>{developmentLabels[dev.type]}</span>
          <time dateTime={dev.at}>{day(dev.at)}</time>
          {fresh && <span className={base.badgeNew}>جديد منذ قراءتك</span>}
          <span className={s.autoTag}>حُرّر آليًا</span>
          {dev.generated && <span className={s.genTag}>مولّد من المسار</span>}
          {dev.certainty === 'open' && <CertaintyTag certainty="open" />}
          {dev.incoming > 0 && <span>{dev.incoming} مادة انطوت تحته</span>}
          {dev.weightOverride && <span>مراجعة محرر: {dev.weightOverride.reason}</span>}
        </div>
        <div className={s.devMeta}>
          <span>{deliveryNote(reach, gate)}</span>
          {!gate.allowed && gate.because === 'awaiting-second' && weight >= 3 && (
            <span className={s.heldTag}>بانتظار أصل مستقل ثانٍ</span>
          )}
        </div>
        {dev.evidence ? (
          <Quote evidence={dev.evidence} />
        ) : (
          <p className={s.devBody}>
            لا مادة منشورة لهذا التطور: محسوب من الموعد المعلن في المسار، لا من استخراج آلي لنص.
          </p>
        )}
        {dev.secondSource && <Quote evidence={dev.secondSource} />}
        {dismissed ? (
          <p className={s.dismissedNote}>
            سُجّل أنه ليس جديدًا. لم يعد يرفع الملف في صفحتك، وبقي ظاهرًا هنا للتصحيح.
          </p>
        ) : (
          <div className={s.devActions}>
            <button type="button" className={base.btn} onClick={() => onDismiss(dev, 'not-new')}>
              ليس جديدًا
            </button>
            <button type="button" className={base.btn} onClick={() => onDismiss(dev, 'wrong')}>
              خطأ في القيمة
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

function CoverageMap({ file }: { file: LiveFile }) {
  const outlets = file.coverage.reduce((total, origin) => total + origin.outlets.length, 0);
  return (
    <div className={base.panel}>
      <h2 id="coverage">خريطة التغطية</h2>
      <p className={base.lede}>من الأصل ومن نقل عنه. عدد الناقلين لا يغيّر درجة الثبوت.</p>
      <dl className={base.covSum}>
        <div>
          <dd>{file.coverage.length}</dd>
          <dt>أصل للمعلومات</dt>
        </div>
        <div>
          <dd>{outlets}</dd>
          <dt>ناقل</dt>
        </div>
        <div>
          <dd>{file.incomingTotal}</dd>
          <dt>مادة واردة عن الملف</dt>
        </div>
      </dl>
      <div className={base.cov}>
        {file.coverage.map((origin) => (
          <div className={base.covRow} key={origin.name}>
            <div className={`${base.covOrigin} ${origin.independent ? base.covIndependent : ''}`}>
              <div className={base.covName}>{origin.name}</div>
              <div className={base.covDetail}>{origin.detail}</div>
            </div>
            <div className={`${base.covOut} ${origin.outlets.length === 1 ? base.covSingle : ''}`}>
              {origin.outlets.map((outlet) => (
                <div
                  className={`${base.outlet} ${outlet.relay ? '' : base.outletOwn}`}
                  key={`${origin.name}-${outlet.name}`}
                >
                  {outlet.name}
                  <span>{outlet.relay ? 'نقل' : 'أصل مستقل'}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FollowPanel({
  file,
  follow,
  onChange,
  onRemove,
}: {
  file: LiveFile;
  follow?: Follow;
  onChange: (follow: Follow) => void;
  onRemove: () => void;
}) {
  const scope = follow?.scope ?? 'all';
  const delivery = follow?.delivery ?? 'daily';
  const targets = [
    ...file.fields.map((field) => ({ id: field.key, label: field.label })),
    ...file.milestones.map((milestone) => ({ id: milestone.id, label: milestone.label })),
  ];
  return (
    <div className={base.card}>
      <h3>
        المتابعة الدقيقة <small>{follow ? 'مفعّلة' : 'غير مفعّلة'}</small>
      </h3>
      <fieldset className={base.opts}>
        <legend className={base.srOnly}>نطاق المتابعة</legend>
        {(['all', 'field', 'resolution'] as const).map((option) => (
          <label className={base.opt} key={option}>
            <input
              type="radio"
              name={`scope-${file.id}`}
              checked={scope === option}
              onChange={() =>
                onChange({
                  scope: option,
                  delivery,
                  target: option === 'field' ? (follow?.target ?? targets[0]?.id) : undefined,
                })
              }
            />
            <span>
              {scopeLabels[option].name}
              <small>{scopeLabels[option].hint}</small>
            </span>
          </label>
        ))}
      </fieldset>
      {scope === 'field' && (
        <label className={base.opt}>
          <span className={base.srOnly}>الحقل أو المعلم المتابَع</span>
          <select
            className={s.select}
            value={follow?.target ?? targets[0]?.id ?? ''}
            onChange={(event) => onChange({ scope, delivery, target: event.target.value })}
          >
            {targets.map((target) => (
              <option value={target.id} key={target.id}>
                {target.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className={base.seg}>
        {(['instant', 'daily', 'silent'] as const).map((option) => (
          <button
            type="button"
            key={option}
            aria-pressed={delivery === option}
            onClick={() => onChange({ scope, delivery: option, target: follow?.target })}
          >
            {deliveryLabels[option]}
          </button>
        ))}
      </div>
      {follow ? (
        <>
          <p className={base.followDone}>
            يصلك ما يخص هذه المتابعة فقط. التنبيه الفوري للإعلان الرسمي أو ما أكّده أصل مستقل ثانٍ.
          </p>
          <button type="button" className={`${base.btn} ${base.block}`} onClick={onRemove}>
            إلغاء المتابعة
          </button>
        </>
      ) : (
        <button
          type="button"
          className={`${base.btn} ${base.primary} ${base.block}`}
          onClick={() => onChange({ scope: 'all', delivery: 'daily' })}
        >
          <Icon name="bell" /> تابع الملف
        </button>
      )}
      <p className={base.fine}>في هذا النموذج تُحفظ اختياراتك داخل الصفحة فقط، ولا تصل تنبيهات.</p>
    </div>
  );
}

export default function LiveFilesExperience() {
  const [view, setView] = useState<View>('madari');
  const [activeId, setActiveId] = useState<string>('waha');
  const [clock, setClock] = useState<ClockKey>('now');
  const [theme, setTheme] = useState<Theme>('system');
  const [follows, setFollows] = useState<Record<string, Follow>>(initialFollows);
  const [lastReads, setLastReads] = useState<Record<string, string>>(initialLastReads);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [showQuiet, setShowQuiet] = useState(false);
  const [toast, setToast] = useState('');
  const [city, setCity] = useState('الكل');
  const [sector, setSector] = useState('الكل');
  const [request, setRequest] = useState('');
  const [requests, setRequests] = useState<string[]>([]);
  const [digestTime, setDigestTime] = useState('20:00');

  const now = useMemo(() => new Date(clock === 'now' ? CLOCK_NOW : CLOCK_LATER), [clock]);
  const dismissed = useMemo(() => new Set(flags.map((flag) => flag.id)), [flags]);
  const ranked = useMemo(
    () => rankFiles(files, follows, lastReads, dismissed, now),
    [follows, lastReads, dismissed, now],
  );
  const digest = useMemo(
    () => buildDigest(files, follows, lastReads, dismissed, now),
    [follows, lastReads, dismissed, now],
  );
  const metrics = useMemo(
    () => computeMetrics(files, follows, dismissed, now),
    [follows, dismissed, now],
  );
  const alerts = ranked.changed.reduce((total, item) => total + item.alerts.length, 0);
  const spared = useMemo(
    () =>
      files
        .filter((file) => follows[file.id])
        .reduce((total, file) => {
          const read = lastReads[file.id] ?? file.openedAt;
          return (
            total +
            file.developments
              .filter((dev) => Date.parse(dev.at) > Date.parse(read) && weightOf(dev, file) === 0)
              .reduce((sum, dev) => sum + dev.incoming, 0)
          );
        }, 0),
    [follows, lastReads],
  );

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const say = useCallback((message: string) => setToast(message), []);
  const openFile = useCallback((id: string) => {
    setActiveId(id);
    setView('file');
  }, []);
  const markRead = useCallback(
    (id: string) => {
      setLastReads((current) => ({ ...current, [id]: now.toISOString() }));
      say('سُجّلت قراءتك. ينزل الملف إلى «لا جديد» حتى يتغيّر فعلًا.');
    },
    [now, say],
  );
  const changeFollow = useCallback(
    (id: string, follow: Follow) => {
      setFollows((current) => ({ ...current, [id]: follow }));
      say(`حُدّثت المتابعة: ${scopeLabels[follow.scope].name} · ${deliveryLabels[follow.delivery]}`);
    },
    [say],
  );
  const removeFollow = useCallback(
    (id: string) => {
      setFollows((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      say('أُلغيت متابعة هذا الملف.');
    },
    [say],
  );
  const dismiss = useCallback(
    (dev: Development, kind: 'not-new' | 'wrong') => {
      setFlags((current) =>
        current.some((flag) => flag.id === dev.id)
          ? current
          : [...current, { id: dev.id, title: dev.title, kind, at: now.toISOString() }],
      );
      say(
        kind === 'not-new'
          ? 'سُجّل: ليس جديدًا. انخفض الملف في صفحتك.'
          : 'سُجّل التصحيح. التطور متوقف عن الرفع حتى يُراجع.',
      );
    },
    [now, say],
  );

  const active = files.find((file) => file.id === activeId) ?? files[0];
  const tabs: { id: View; label: string }[] = [
    { id: 'madari', label: 'مداري' },
    { id: 'discover', label: 'اكتشف' },
    { id: 'digest', label: 'الموجز' },
    { id: 'metrics', label: 'القياس' },
  ];

  return (
    <div className={base.page} data-theme={theme === 'system' ? undefined : theme}>
      <p className={base.notice}>
        نموذج تصميم v3 · <b>كل الملفات والجهات والمصادر هنا افتراضية</b> · المتابعة داخل الصفحة فقط،
        ولا تصل تنبيهات حقيقية · لا مصادر مرخّصة مفعّلة
      </p>
      <header className={base.top}>
        <div className={base.topInner}>
          <span className={base.logo}>
            <span className={base.wordmark}>مدار</span>
          </span>
          <nav className={base.navTabs} aria-label="أقسام النموذج">
            {tabs.map((tab) => (
              <button
                type="button"
                key={tab.id}
                aria-current={
                  view === tab.id || (view === 'file' && tab.id === 'madari') ? 'page' : undefined
                }
                onClick={() => setView(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <div className={s.clock}>
            <Icon name="clock" />
            <span>ساعة النموذج</span>
            <div className={s.clockSeg}>
              <button type="button" aria-pressed={clock === 'now'} onClick={() => setClock('now')}>
                اليوم
              </button>
              <button
                type="button"
                aria-pressed={clock === 'later'}
                onClick={() => setClock('later')}
              >
                بعد ثلاثة أشهر
              </button>
            </div>
          </div>
          <button
            type="button"
            className={base.themeBtn}
            aria-label="تبديل المظهر"
            onClick={() =>
              setTheme((current) =>
                current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system',
              )
            }
          >
            <Icon name="moon" />
          </button>
        </div>
      </header>

      <main className={base.main}>
        {view === 'madari' && (
          <>
            <section className={s.hero} aria-labelledby="madari-title">
              <div>
                <h1 id="madari-title">مداري</h1>
                <p className={s.heroSub}>
                  ملفاتك مرتبة بوزن ما تغيّر فيها منذ قراءتك، لا بالأحدث ولا بالأكثر تداولًا.
                  {spared > 0 ? ` أعفيناك من قراءة ${spared} مادة لم تضف شيئًا.` : ''}
                </p>
                <div className={s.heroActions}>
                  <button
                    type="button"
                    onClick={() => {
                      const reads = { ...lastReads };
                      for (const item of [...ranked.changed, ...ranked.quiet]) {
                        reads[item.file.id] = now.toISOString();
                      }
                      setLastReads(reads);
                      say('عُلّمت كل ملفاتك كمقروءة. «لا جديد» إجابة محترمة.');
                    }}
                  >
                    <Icon name="check" /> علّم الكل كمقروء
                  </button>
                  <button type="button" onClick={() => setView('digest')}>
                    كيف يبدو الموجز؟
                  </button>
                </div>
              </div>
              <dl className={s.heroStats}>
                <div>
                  <dd>{ranked.changed.length}</dd>
                  <dt>ملفات تغيّرت</dt>
                </div>
                <div>
                  <dd>{ranked.quiet.length}</dd>
                  <dt>بلا جديد</dt>
                </div>
                <div>
                  <dd>{alerts}</dd>
                  <dt>تنبيه يستحق الإرسال</dt>
                </div>
                <div>
                  <dd>{spared}</dd>
                  <dt>مادة أعفيتك منها</dt>
                </div>
              </dl>
            </section>

            <div className={base.secHead}>
              <h3>ما تغيّر منذ قراءتك</h3>
              <span>الوزن ثم درجة المتابعة ثم الحداثة</span>
            </div>
            {ranked.changed.length === 0 ? (
              <p className={base.empty}>لا جديد في ملفاتك منذ زيارتك. لن نملأ الفراغ بمحتوى آخر.</p>
            ) : (
              <div className={s.rankList}>
                {ranked.changed.map((item) => (
                  <article className={s.rankRow} key={item.file.id}>
                    <WeightBadge weight={item.topWeight} />
                    <div>
                      <button
                        type="button"
                        className={s.rowTitle}
                        onClick={() => openFile(item.file.id)}
                      >
                        {item.file.title}
                      </button>
                      <p className={s.oneLine}>{item.unread[0]?.title}</p>
                      <div className={s.rowMeta}>
                        <TypeTag kind={item.file.kind} />
                        <span>{item.file.city}</span>
                        <span>
                          {item.unread.length > 1
                            ? `${item.unread.length} تطورات جديدة`
                            : 'تطور واحد'}
                        </span>
                        <span>
                          {scopeLabels[item.follow.scope].name}
                          {item.follow.scope === 'field' && item.follow.target
                            ? `: ${fieldLabel(item.file, item.follow.target) || item.follow.target}`
                            : ''}
                        </span>
                        {item.alerts.length > 0 && (
                          <span className={base.badgeNew}>
                            <Icon name="bell" size={12} /> تنبيه فوري
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={s.rowActions}>
                      <button
                        type="button"
                        className={`${base.btn} ${base.primary}`}
                        onClick={() => openFile(item.file.id)}
                      >
                        افتح الملف
                      </button>
                      <button
                        type="button"
                        className={base.btn}
                        onClick={() => markRead(item.file.id)}
                      >
                        علّم كمقروء
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {ranked.quiet.length > 0 && (
              <>
                <button
                  type="button"
                  className={s.quietHead}
                  aria-expanded={showQuiet}
                  onClick={() => setShowQuiet((current) => !current)}
                >
                  <span>
                    <b>لا جديد منذ زيارتك</b> · {ranked.quiet.length} ملفات
                  </span>
                  <span>{showQuiet ? 'إخفاء' : 'إظهار'}</span>
                </button>
                {showQuiet && (
                  <div className={s.quietList}>
                    {ranked.quiet.map((item) => (
                      <div className={s.quietRow} key={item.file.id}>
                        <button
                          type="button"
                          className={s.rowTitle}
                          onClick={() => openFile(item.file.id)}
                        >
                          {item.file.title}
                        </button>
                        <span>
                          {item.fresh.length > 0
                            ? 'تفاصيل داخل الملف فقط، بلا تغيّر في الحالة'
                            : 'لا تطور منذ قراءتك'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {view === 'file' && active && (
          <FileView
            file={active}
            now={now}
            follow={follows[active.id]}
            lastReadAt={lastReads[active.id] ?? active.openedAt}
            dismissed={dismissed}
            flags={flags}
            onDismiss={dismiss}
            onMarkRead={() => markRead(active.id)}
            onFollow={(follow) => changeFollow(active.id, follow)}
            onRemoveFollow={() => removeFollow(active.id)}
            onBack={() => setView('madari')}
          />
        )}

        {view === 'discover' && (
          <DiscoverView
            now={now}
            follows={follows}
            city={city}
            sector={sector}
            onCity={setCity}
            onSector={setSector}
            onOpen={openFile}
            onFollow={(id) => changeFollow(id, { scope: 'all', delivery: 'daily' })}
            request={request}
            requests={requests}
            onRequest={setRequest}
            onSubmitRequest={() => {
              const text = request.trim();
              if (!text) return;
              setRequests((current) => [...current, text]);
              setRequest('');
              say('سُجّل طلبك داخل النموذج. قياس الطلب هو الغرض من هذه الشاشة.');
            }}
          />
        )}

        {view === 'digest' && (
          <>
            <div className={base.secHead}>
              <h3>الموجز</h3>
              <span>رسالة واحدة في وقت تختاره، ولا شيء إن لم يتغير شيء</span>
            </div>
            <div className={`${base.seg} ${s.narrowSeg}`}>
              {['07:00', '20:00'].map((time) => (
                <button
                  type="button"
                  key={time}
                  aria-pressed={digestTime === time}
                  onClick={() => setDigestTime(time)}
                >
                  {time}
                </button>
              ))}
            </div>
            <div className={s.digest}>
              <p className={base.fine}>
                مدار · موجز {digestTime} · {day(now.toISOString())}
              </p>
              <p className={s.digestMsg}>{digest.message}</p>
              {digest.items.length > 0 && (
                <div className={s.digestList}>
                  {digest.items.map((item) => (
                    <button
                      type="button"
                      className={s.digestItem}
                      key={item.fileId}
                      onClick={() => openFile(item.fileId)}
                    >
                      <span>
                        {item.title}
                        <small>{item.line}</small>
                      </span>
                      <WeightBadge weight={item.weight} />
                    </button>
                  ))}
                </div>
              )}
              <p className={`${base.fine} ${s.gapTop}`}>
                هذا عرض للرسالة كما ستُبنى من التطورات المعتمدة. لا تُرسل رسائل حقيقية من النموذج.
              </p>
            </div>
          </>
        )}

        {view === 'metrics' && <MetricsView metrics={metrics} flags={flags} now={now} />}
      </main>

      <footer className={base.footer}>
        <div className={base.footerInner}>
          <span>
            نموذج الملف الحي · البيانات افتراضية · المحرك في <code>engine.ts</code> ومختبر بـ29
            اختبار وحدة
          </span>
          <span>
            <a href="/design">نموذج v2</a> · <a href="/">واجهة المواد الحقيقية</a>
          </span>
        </div>
      </footer>
      <p className={base.toast} role="status" aria-live="polite">
        {toast}
      </p>
    </div>
  );
}

function FileView({
  file,
  now,
  follow,
  lastReadAt,
  dismissed,
  flags,
  onDismiss,
  onMarkRead,
  onFollow,
  onRemoveFollow,
  onBack,
}: {
  file: LiveFile;
  now: Date;
  follow?: Follow;
  lastReadAt: string;
  dismissed: ReadonlySet<string>;
  flags: Flag[];
  onDismiss: (dev: Development, kind: 'not-new' | 'wrong') => void;
  onMarkRead: () => void;
  onFollow: (follow: Follow) => void;
  onRemoveFollow: () => void;
  onBack: () => void;
}) {
  const effectiveFollow: Follow = follow ?? { scope: 'all', delivery: 'daily' };
  const all = developmentsOf(file, now);
  const fresh = all.filter(
    (dev) => Date.parse(dev.at) > Date.parse(lastReadAt) && weightOf(dev, file) >= 1,
  );
  const summary = summarizeSince(file, fresh, lastReadAt, now);
  const fileFlags = flags.filter((flag) => all.some((dev) => dev.id === flag.id));

  return (
    <>
      <div className={base.crumb}>
        <button type="button" onClick={onBack}>
          <Icon name="back" /> مداري
        </button>
        <span>/</span>
        <span>{kindLabels[file.kind].name}</span>
      </div>
      <div className={s.fileHead}>
        <div className={base.measure}>
          <h1>{file.title}</h1>
          <p className={base.lede}>{file.summary}</p>
          <dl className={base.fileMeta}>
            <div>
              <dt>النوع</dt>
              <dd>{kindLabels[file.kind].name}</dd>
            </div>
            <div>
              <dt>المدينة</dt>
              <dd>{file.city}</dd>
            </div>
            <div>
              <dt>آخر مراجعة</dt>
              <dd>{day(file.lastReviewAt)}</dd>
            </div>
            <div>
              <dt>مواد واردة</dt>
              <dd>{file.incomingTotal}</dd>
            </div>
          </dl>
        </div>
        <button type="button" className={base.btn} onClick={onMarkRead}>
          <Icon name="check" /> علّم الملف كمقروء
        </button>
      </div>

      <div className={base.homeGrid}>
        <div>
          <div className={base.panel}>
            <h2 id="since">{summary.headline}</h2>
            <p className={base.lede}>
              ناتج مولّد من بطاقة الحالة والمسار وسجل التطورات، لا نص يكتبه محرر لكل قارئ.
            </p>
            {summary.lines.length === 0 ? (
              <p className={base.empty}>لا جديد في هذا الملف منذ قراءتك. هذا ما نعرفه حتى الآن.</p>
            ) : (
              <ul className={base.legend}>
                {summary.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
            {summary.waiting.length > 0 && (
              <p className={`${base.fine} ${s.gapTop}`}>
                ما زلنا ننتظر: {summary.waiting.join('، ')}
              </p>
            )}
          </div>
          <StateCard file={file} />
          <PathRail file={file} now={now} />
          <SceneLog file={file} />
          <div className={base.panel}>
            <h2 id="developments">سجل التطورات</h2>
            <p className={base.lede}>
              كل تطور بنوعه ووزنه ودليله. المادة التي لا تغيّر حقلًا لا تصل إلى صفحتك. التطورات هنا
              مكتوبة يدويًا في بيانات افتراضية؛ وسم «حُرّر آليًا» يعرض الشكل المقصود، لا استخراجًا آليًا
              حقيقيًا.
            </p>
            <ul className={s.devList}>
              {all.map((dev) => (
                <DevelopmentRow
                  key={dev.id}
                  file={file}
                  dev={dev}
                  follow={effectiveFollow}
                  lastReadAt={lastReadAt}
                  dismissed={dismissed.has(dev.id)}
                  onDismiss={onDismiss}
                />
              ))}
            </ul>
          </div>
          <CoverageMap file={file} />
        </div>
        <aside className={base.side}>
          <FollowPanel file={file} follow={follow} onChange={onFollow} onRemove={onRemoveFollow} />
          <div className={base.card}>
            <h3>
              ضوابط التحرير الآلي <small>ما يفحصه المحرك الآن</small>
            </h3>
            <ul className={base.legend}>
              <li>بوابة التنبيه تقرأ نوع الأصل، لا عدد الناقلين. مفحوصة باختبار.</li>
              <li>لا تنبيه فوري لغير الجهة بلا أصل مستقل ثانٍ. مفحوصة باختبار.</li>
              <li>الصمت محسوب من المواعيد، بلا نموذج لغوي. مفحوصة باختبار.</li>
              <li>كل تطور موسوم ومعه زر تصحيح. منفّذ في الواجهة.</li>
              <li>
                لا تغيير بلا مقطع حرفي: كل تطور هنا يحمل مقطعه، لكن القيد لم يُفرض بعد على مستوى
                قاعدة البيانات.
              </li>
            </ul>
          </div>
          {fileFlags.length > 0 && (
            <div className={base.card}>
              <h3>سجل التصحيح</h3>
              <ul className={s.correctionLog}>
                {fileFlags.map((flag) => (
                  <li key={flag.id}>
                    <span>{flag.title}</span>
                    <span>{flag.kind === 'not-new' ? 'ليس جديدًا' : 'خطأ في القيمة'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

function DiscoverView({
  now,
  follows,
  city,
  sector,
  onCity,
  onSector,
  onOpen,
  onFollow,
  request,
  requests,
  onRequest,
  onSubmitRequest,
}: {
  now: Date;
  follows: Record<string, Follow>;
  city: string;
  sector: string;
  onCity: (value: string) => void;
  onSector: (value: string) => void;
  onOpen: (id: string) => void;
  onFollow: (id: string) => void;
  request: string;
  requests: string[];
  onRequest: (value: string) => void;
  onSubmitRequest: () => void;
}) {
  const candidates = files
    .filter((file) => !follows[file.id])
    .filter((file) => city === 'الكل' || file.city === city)
    .filter((file) => sector === 'الكل' || file.sector === sector)
    .map((file) => ({ file, score: activityScore(file, now) }))
    .sort((a, b) => b.score - a.score);
  const max = candidates.reduce((top, item) => Math.max(top, item.score), 1);

  return (
    <>
      <div className={base.secHead}>
        <h3>اكتشف</h3>
        <span>مرتبة بالنشاط الحقيقي: مجموع أوزان التطورات، لا عدد الأخبار</span>
      </div>
      <div className={base.chips}>
        {['الكل', ...cities].map((value) => (
          <button
            type="button"
            key={value}
            className={base.chip}
            aria-pressed={city === value}
            onClick={() => onCity(value)}
          >
            {value}
          </button>
        ))}
      </div>
      <div className={`${base.chips} ${s.chipsRow}`}>
        {['الكل', ...sectors].map((value) => (
          <button
            type="button"
            key={value}
            className={base.chip}
            aria-pressed={sector === value}
            onClick={() => onSector(value)}
          >
            {value}
          </button>
        ))}
      </div>
      {candidates.length === 0 ? (
        <p className={base.empty}>لا ملفات مطابقة. اطلب ملفًا وسنسجّل الطلب لقياس ما ينقص التغطية.</p>
      ) : (
        <div className={s.discoverGrid}>
          {candidates.map(({ file, score }) => (
            <article className={s.discoverCard} key={file.id}>
              <TypeTag kind={file.kind} />
              <h3>{file.title}</h3>
              <p className={base.lede}>{file.summary}</p>
              <div className={s.activityBar}>
                <i style={{ width: `${Math.max(6, (score / max) * 100)}%` }} />
              </div>
              <div className={s.rowMeta}>
                <span>نشاط {score}</span>
                <span>{file.city}</span>
                <span>{file.sector}</span>
                <span>آخر مراجعة {day(file.lastReviewAt)}</span>
              </div>
              <div className={s.rowActions}>
                <button type="button" className={base.btn} onClick={() => onOpen(file.id)}>
                  افتح
                </button>
                <button
                  type="button"
                  className={`${base.btn} ${base.primary}`}
                  onClick={() => onFollow(file.id)}
                >
                  <Icon name="bell" /> تابع
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className={base.panel}>
        <h2>اطلب ملفًا</h2>
        <p className={base.lede}>
          لا تجد ما يهمك؟ اكتبه. الطلب يُسجّل لقياس الطلب الحقيقي قبل فتح ملفات جديدة.
        </p>
        <form
          className={s.requestBox}
          onSubmit={(event) => {
            event.preventDefault();
            onSubmitRequest();
          }}
        >
          <label className={base.srOnly} htmlFor="request">
            اسم الملف المطلوب
          </label>
          <input
            id="request"
            value={request}
            placeholder="مثال: محطة قطار في حيّنا"
            onChange={(event) => onRequest(event.target.value)}
          />
          <button type="submit" className={`${base.btn} ${base.primary}`}>
            سجّل الطلب
          </button>
        </form>
        {requests.length > 0 && (
          <div className={s.requestList}>
            {requests.map((text) => (
              <span className={base.chip} key={text}>
                {text}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function MetricsView({
  metrics,
  flags,
  now,
}: {
  metrics: ReturnType<typeof computeMetrics>;
  flags: Flag[];
  now: Date;
}) {
  const percent = (value: number) => `${Math.round(value * 100)}%`;
  const cards = [
    {
      value: percent(metrics.honesty),
      label: 'صدق التطور',
      hint: 'نسبة التطورات بوزن 2 فأعلى التي لم تُوسم «ليس جديدًا». المقياس الرئيسي في الوثيقة.',
    },
    {
      value: metrics.compression.toFixed(1),
      label: 'مواد لكل تطور',
      hint: `${metrics.incoming} مادة واردة صارت ${metrics.approved} تطورًا. يُقاس ولا يُستهدف رقم.`,
    },
    {
      value: percent(metrics.freshness),
      label: 'حداثة الملفات',
      hint: `نسبة الملفات التي روجعت خلال ${metrics.reviewedWithinDays} يومًا. الملف القديم أسوأ من غيابه.`,
    },
    {
      value: String(metrics.alerts),
      label: 'تنبيه يستحق الإرسال',
      hint: 'وزن 3 أو 4 من قناة الجهة أو بأصل مستقل ثانٍ، ولمتابعة اختارت الفوري.',
    },
    {
      value: String(metrics.held),
      label: 'محتجز بلا تنبيه',
      hint: 'تطورات بوزن 3 فأعلى من غير الجهة. تظهر في الملف ولا ترسل تنبيهًا حتى تأكيد ثانٍ.',
    },
    {
      value: String(flags.length),
      label: 'تصحيحات مسجّلة',
      hint: 'كل ضغط على «ليس جديدًا» أو «خطأ في القيمة» يُحفظ ويظهر في سجل التصحيح.',
    },
  ];
  return (
    <>
      <div className={base.secHead}>
        <h3>القياس</h3>
        <span>محسوب من بيانات النموذج بتاريخ {day(now.toISOString())}</span>
      </div>
      <div className={s.metricsGrid}>
        {cards.map((card) => (
          <div className={s.metric} key={card.label}>
            <div className={s.metricValue}>{card.value}</div>
            <div className={s.metricLabel}>{card.label}</div>
            <p className={s.metricHint}>{card.hint}</p>
          </div>
        ))}
      </div>
      <div className={base.panel}>
        <h2>ما لا نقيس به النجاح</h2>
        <p className={base.lede}>
          الوقت داخل التطبيق، وعدد المواد المقروءة، وعدد المصادر. المنتج الناجح هنا يأخذ من وقتك
          أقل.
        </p>
        {flags.length > 0 ? (
          <ul className={s.correctionLog}>
            {flags.map((flag) => (
              <li key={flag.id}>
                <span>{flag.title}</span>
                <span>
                  {flag.kind === 'not-new' ? 'ليس جديدًا' : 'خطأ في القيمة'} · {day(flag.at)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={base.empty}>
            لا تصحيحات بعد. افتح ملفًا واضغط «ليس جديدًا» على تطور لترى أثره على الترتيب والقياس.
          </p>
        )}
      </div>
    </>
  );
}
