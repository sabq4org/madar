// محرك الملف الحي: ميزان التغيّر، رصد الصمت، ترتيب صفحة المتابع، والملخص.
// دوال خالصة بلا React وبلا شبكة، حتى تُختبر وحدها وتُنقل لاحقًا إلى الخادم كما هي.

import {
  type Development,
  type Follow,
  type LiveFile,
  type Milestone,
  templates,
  type Weight,
} from './model';

export const DAY_MS = 86_400_000;

/** مهلة السماح قبل اعتبار الموعد المعلن فائتًا. يوم واحد يمنع التنبيه على فروق التوقيت. */
export const OVERDUE_GRACE_DAYS = 1;

export function daysBetween(from: string | Date, to: string | Date): number {
  const a = typeof from === 'string' ? Date.parse(from) : from.getTime();
  const b = typeof to === 'string' ? Date.parse(to) : to.getTime();
  return Math.floor((b - a) / DAY_MS);
}

export function fieldLabel(file: LiveFile, key?: string): string {
  if (!key) return '';
  return file.fields.find((field) => field.key === key)?.label ?? key;
}

export function milestoneOf(file: LiveFile, id?: string): Milestone | undefined {
  if (!id) return undefined;
  return file.milestones.find((milestone) => milestone.id === id);
}

function isCritical(file: LiveFile, dev: Development): boolean {
  const template = templates[file.kind];
  if (dev.fieldKey && template.criticalFields.includes(dev.fieldKey)) return true;
  const milestone = milestoneOf(file, dev.milestoneId);
  return Boolean(milestone?.terminal);
}

/**
 * الوزن يُشتق من نوع التطور والحقل الذي مسّه، لا من عدد المواد ولا من تغيّر العنوان.
 * ما لم يُحسم لا يرفع فوق «تفصيل»، حتى لو نُقل عن عشرين موقعًا.
 */
export function deriveWeight(dev: Development, file: LiveFile): Weight {
  if (dev.certainty === 'open') return 1;
  switch (dev.type) {
    case 'coverage':
      return 0;
    case 'scene':
    case 'number':
    case 'confirmation':
    case 'pending_promise':
      return 2;
    case 'stale':
      return 1;
    case 'retraction':
      return dev.evidence?.channel === 'owner' ? 3 : 1;
    case 'date':
      return isCritical(file, dev) ? 3 : 2;
    case 'milestone':
      return milestoneOf(file, dev.milestoneId)?.terminal ? 4 : 3;
    case 'silent_delay':
      return isCritical(file, dev) ? 3 : 2;
  }
}

/** مراجعة المحرر تُقدَّم على الاشتقاق، وتبقى مسجّلة بسببها. */
export function weightOf(dev: Development, file: LiveFile): Weight {
  return dev.weightOverride?.weight ?? deriveWeight(dev, file);
}

/**
 * رصد الصمت: ثلاث حالات يولّدها النظام من المواعيد نفسها، بلا ذكاء اصطناعي.
 * لا تُعرض كاتهام ولا كاستنتاج عن السبب؛ الوقائع فقط.
 */
export function detectSilence(file: LiveFile, now: Date): Development[] {
  const out: Development[] = [];
  const nowMs = now.getTime();

  for (const milestone of file.milestones) {
    if (milestone.status === 'done' || !milestone.expectedAt) continue;
    const due = Date.parse(milestone.expectedAt);
    if (Number.isNaN(due) || nowMs - due < OVERDUE_GRACE_DAYS * DAY_MS) continue;
    out.push({
      id: `silence:${file.id}:${milestone.id}`,
      type: 'silent_delay',
      at: new Date(due + OVERDUE_GRACE_DAYS * DAY_MS).toISOString(),
      title: `مرّ الموعد المعلن لـ«${milestone.label}» ولم يصدر تحديث من الجهة`,
      detail: `الموعد المعلن كان ${milestone.expectedAt.slice(0, 10)}، ومضى ${daysBetween(milestone.expectedAt, now)} يومًا بلا معلم جديد.`,
      milestoneId: milestone.id,
      generated: true,
      evidence: milestone.evidence,
      incoming: 0,
    });
  }

  for (const pending of file.pending) {
    const due = Date.parse(pending.dueAt);
    if (Number.isNaN(due) || nowMs - due < OVERDUE_GRACE_DAYS * DAY_MS) continue;
    out.push({
      id: `pending:${file.id}:${pending.id}`,
      type: 'pending_promise',
      at: new Date(due + OVERDUE_GRACE_DAYS * DAY_MS).toISOString(),
      title: `انقضت مهلة «${pending.label}» دون إعلان`,
      detail: `قالت الجهة ذلك في ${pending.promisedAt.slice(0, 10)}، والمهلة المعتادة انتهت في ${pending.dueAt.slice(0, 10)}.`,
      generated: true,
      incoming: 0,
    });
  }

  const lastReal = file.developments
    .filter((dev) => deriveWeight(dev, file) >= 2)
    .map((dev) => Date.parse(dev.at))
    .filter((value) => !Number.isNaN(value))
    .sort((a, b) => b - a)[0];
  const anchor = lastReal ?? Date.parse(file.openedAt);
  const quietDays = daysBetween(new Date(anchor), now);
  if (quietDays > templates[file.kind].staleAfterDays) {
    out.push({
      id: `stale:${file.id}`,
      type: 'stale',
      at: now.toISOString(),
      title: `لا تطور بوزن 2 أو أعلى منذ ${quietDays} يومًا`,
      detail: `المعتاد لهذا النوع أقل من ${templates[file.kind].staleAfterDays} يومًا. هذه ملاحظة عن الملف، لا عن الجهة.`,
      generated: true,
      incoming: 0,
    });
  }

  return out;
}

/** كل تطورات الملف: الواردة من المصادر + المولّدة من المسار، مرتبة بالأحدث. */
export function developmentsOf(file: LiveFile, now: Date): Development[] {
  return [...file.developments, ...detectSilence(file, now)]
    .filter((dev) => Date.parse(dev.at) <= now.getTime())
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

export type AlertGate =
  | { allowed: true; via: 'owner' | 'second-source' }
  | { allowed: false; because: 'low-weight' | 'awaiting-second' };

/**
 * التنبيه الفوري للإعلان الرسمي فقط. ما عداه يظهر داخل الملف ولا يرسل تنبيهًا
 * حتى يؤكده أصل مستقل ثانٍ. هذا ضابط التحرير الآلي الثالث.
 */
export function alertGate(dev: Development, weight: Weight): AlertGate {
  if (weight < 3) return { allowed: false, because: 'low-weight' };
  if (dev.evidence?.channel === 'owner') return { allowed: true, via: 'owner' };
  if (dev.secondSource?.channel === 'independent') return { allowed: true, via: 'second-source' };
  return { allowed: false, because: 'awaiting-second' };
}

/** ما الذي يعنيه هذا التطور لهذا المتابع تحديدًا. */
export function reachesFollow(dev: Development, weight: Weight, follow: Follow): boolean {
  if (follow.scope === 'resolution') return weight === 4;
  if (weight < 2) return false;
  if (follow.scope === 'field') {
    return dev.fieldKey === follow.target || dev.milestoneId === follow.target;
  }
  return true;
}

export type Reach = 'instant' | 'daily' | 'page' | 'file';

export function reachOf(
  dev: Development,
  weight: Weight,
  follow: Follow,
): { reach: Reach; gate: AlertGate } {
  const gate = alertGate(dev, weight);
  if (!reachesFollow(dev, weight, follow)) return { reach: 'file', gate };
  if (!gate.allowed || follow.delivery === 'silent') return { reach: 'page', gate };
  return { reach: follow.delivery === 'instant' ? 'instant' : 'daily', gate };
}

export interface RankedFile {
  file: LiveFile;
  follow: Follow;
  /** التطورات التي لم يقرأها هذا المتابع وتخص متابعته. */
  unread: Development[];
  /** كل الجديد داخل الملف، بما فيه التفاصيل بوزن 1. */
  fresh: Development[];
  topWeight: Weight;
  alerts: Development[];
  lastUnreadAt: string | null;
}

const scopeStrength: Record<Follow['scope'], number> = { all: 3, field: 2, resolution: 1 };

export function rankFile(
  file: LiveFile,
  follow: Follow,
  lastReadAt: string,
  dismissed: ReadonlySet<string>,
  now: Date,
): RankedFile {
  const all = developmentsOf(file, now);
  const fresh = all.filter(
    (dev) => Date.parse(dev.at) > Date.parse(lastReadAt) && weightOf(dev, file) >= 1,
  );
  const unread = fresh.filter(
    (dev) => !dismissed.has(dev.id) && reachesFollow(dev, weightOf(dev, file), follow),
  );
  const weights = unread.map((dev) => weightOf(dev, file));
  // الأوزان محصورة في 0..4 بحكم النوع، فأكبرها يبقى وزنًا صالحًا.
  const topWeight = Math.max(0, ...weights) as Weight;
  const alerts = unread.filter(
    (dev) => reachOf(dev, weightOf(dev, file), follow).reach === 'instant',
  );
  return {
    file,
    follow,
    unread,
    fresh,
    topWeight,
    alerts,
    lastUnreadAt: unread[0]?.at ?? null,
  };
}

/**
 * ترتيب صفحة المتابع: وزن أعلى تطور لم تقرأه، ثم درجة المتابعة، ثم الحداثة لكسر التعادل.
 * الملف الذي قرأت كل جديده ينزل إلى «لا جديد»، حتى لو نُشر عنه عشرون خبرًا بلا جديد.
 */
export function rankFiles(
  files: LiveFile[],
  follows: Record<string, Follow>,
  lastReads: Record<string, string>,
  dismissed: ReadonlySet<string>,
  now: Date,
): { changed: RankedFile[]; quiet: RankedFile[] } {
  const ranked = files
    .filter((file) => follows[file.id])
    .map((file) => {
      const follow = follows[file.id];
      if (!follow) throw new Error(`follow missing for ${file.id}`);
      return rankFile(file, follow, lastReads[file.id] ?? file.openedAt, dismissed, now);
    });

  const byWeight = (a: RankedFile, b: RankedFile) =>
    b.topWeight - a.topWeight ||
    scopeStrength[b.follow.scope] - scopeStrength[a.follow.scope] ||
    Date.parse(b.lastUnreadAt ?? '0') - Date.parse(a.lastUnreadAt ?? '0');

  return {
    changed: ranked.filter((item) => item.topWeight >= 2).sort(byWeight),
    quiet: ranked.filter((item) => item.topWeight < 2).sort(byWeight),
  };
}

export function arabicDevelopments(count: number): string {
  if (count === 0) return 'لا تطورات';
  if (count === 1) return 'تطور واحد';
  if (count === 2) return 'تطوران';
  if (count <= 10) return `${count} تطورات`;
  return `${count} تطورًا`;
}

export interface SinceSummary {
  headline: string;
  lines: string[];
  waiting: string[];
  spared: number;
}

/** «منذ قراءتك الأخيرة» ناتج يُولَّد من التطورات، لا نص يكتبه محرر لكل مستخدم. */
export function summarizeSince(
  file: LiveFile,
  fresh: Development[],
  lastReadAt: string,
  now: Date,
): SinceSummary {
  const lines: string[] = [];
  const scenes = fresh.filter((dev) => dev.type === 'scene');
  for (const dev of [...fresh].sort((a, b) => weightOf(b, file) - weightOf(a, file))) {
    if (dev.type === 'scene') continue;
    if (weightOf(dev, file) < 1) continue;
    if (dev.type === 'date' || dev.type === 'number') {
      const label = fieldLabel(file, dev.fieldKey);
      lines.push(`${label}: ${dev.from ?? 'لم يُعلن'} ← ${dev.to ?? 'لم يُعلن'}`);
      continue;
    }
    lines.push(dev.title);
  }
  if (scenes.length) {
    const shots = scenes.reduce((total, dev) => total + dev.incoming, 0);
    lines.push(`${shots} صور جديدة في سجل المشهد`);
  }

  const waiting = file.fields
    .filter((field) => field.value === null || field.certainty === 'open')
    .map((field) => field.label);
  const next = file.milestones.find((milestone) => milestone.status !== 'done');
  if (next) {
    waiting.push(next.expectedAt ? `${next.label} (${next.expectedAt.slice(0, 10)})` : next.label);
  }

  const days = daysBetween(lastReadAt, now);
  const when = days <= 0 ? 'اليوم' : days === 1 ? 'أمس' : `قبل ${days} أيام`;
  const spared = file.developments
    .filter((dev) => Date.parse(dev.at) > Date.parse(lastReadAt))
    .reduce((total, dev) => total + (weightOf(dev, file) === 0 ? dev.incoming : 0), 0);

  return {
    headline: `${arabicDevelopments(fresh.length)} منذ قراءتك ${when}`,
    lines,
    waiting,
    spared,
  };
}

export interface DigestItem {
  fileId: string;
  title: string;
  line: string;
  weight: Weight;
}

export interface Digest {
  count: number;
  message: string;
  items: DigestItem[];
}

/** الموجز: رسالة واحدة، ولا شيء إن لم يتغير شيء. غياب الرسالة جزء من الوعد. */
export function buildDigest(
  files: LiveFile[],
  follows: Record<string, Follow>,
  lastReads: Record<string, string>,
  dismissed: ReadonlySet<string>,
  now: Date,
): Digest {
  const { changed } = rankFiles(files, follows, lastReads, dismissed, now);
  const items = changed.map((item) => ({
    fileId: item.file.id,
    title: item.file.title,
    line: item.unread[0]?.title ?? '',
    weight: item.topWeight,
  }));
  return {
    count: items.length,
    message: items.length
      ? `${items.length} من ملفاتك تغيّرت اليوم`
      : 'لا جديد اليوم. لن تصلك رسالة، وهذا مقصود.',
    items,
  };
}

export interface Metrics {
  incoming: number;
  approved: number;
  compression: number;
  honesty: number;
  freshness: number;
  alerts: number;
  held: number;
  reviewedWithinDays: number;
}

/** مقاييس الوثيقة محسوبة من بيانات النموذج، لا أرقامًا مكتوبة يدويًا. */
export function computeMetrics(
  files: LiveFile[],
  follows: Record<string, Follow>,
  dismissed: ReadonlySet<string>,
  now: Date,
): Metrics {
  let incoming = 0;
  let approved = 0;
  let substantial = 0;
  let dismissedSubstantial = 0;
  let alerts = 0;
  let held = 0;
  let fresh = 0;

  for (const file of files) {
    incoming += file.incomingTotal;
    if (daysBetween(file.lastReviewAt, now) <= 14) fresh += 1;
    const follow = follows[file.id] ?? ({ scope: 'all', delivery: 'daily' } satisfies Follow);
    for (const dev of developmentsOf(file, now)) {
      const weight = weightOf(dev, file);
      if (weight >= 1) approved += 1;
      if (weight >= 2) {
        substantial += 1;
        if (dismissed.has(dev.id)) dismissedSubstantial += 1;
        const gate = alertGate(dev, weight);
        if (gate.allowed && follow.delivery === 'instant') alerts += 1;
        if (!gate.allowed && gate.because === 'awaiting-second') held += 1;
      }
    }
  }

  return {
    incoming,
    approved,
    compression: approved ? incoming / approved : 0,
    honesty: substantial ? (substantial - dismissedSubstantial) / substantial : 1,
    freshness: files.length ? fresh / files.length : 0,
    alerts,
    held,
    reviewedWithinDays: 14,
  };
}

/** نشاط حقيقي لاكتشف: مجموع أوزان التطورات الحديثة، لا عدد المواد. */
export function activityScore(file: LiveFile, now: Date, windowDays = 14): number {
  return developmentsOf(file, now)
    .filter((dev) => daysBetween(dev.at, now) <= windowDays)
    .reduce((total, dev) => total + weightOf(dev, file), 0);
}

export function deliveryNote(reach: Reach, gate: AlertGate): string {
  if (reach === 'instant') {
    return gate.allowed && gate.via === 'owner'
      ? 'تنبيه فوري: إعلان من قناة الجهة نفسها'
      : 'تنبيه فوري: أكّده أصل مستقل ثانٍ';
  }
  if (reach === 'daily') return 'يصل في الموجز اليومي';
  if (reach === 'page') {
    return !gate.allowed && gate.because === 'awaiting-second'
      ? 'يصعد في صفحتك بلا تنبيه: بانتظار أصل مستقل ثانٍ'
      : 'يصعد في صفحتك بلا تنبيه';
  }
  return 'داخل الملف فقط';
}

export function isFresh(dev: Development, lastReadAt: string): boolean {
  return Date.parse(dev.at) > Date.parse(lastReadAt);
}
