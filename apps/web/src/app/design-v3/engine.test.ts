import { describe, expect, it } from 'vitest';
import { CLOCK_LATER, CLOCK_NOW, files, initialFollows, initialLastReads } from './data';
import {
  alertGate,
  buildDigest,
  computeMetrics,
  deriveWeight,
  detectSilence,
  developmentsOf,
  OVERDUE_GRACE_DAYS,
  rankFiles,
  reachesFollow,
  summarizeSince,
  weightOf,
} from './engine';
import type { Development, Follow, LiveFile, Milestone } from './model';

const NOW = new Date(CLOCK_NOW);
const LATER = new Date(CLOCK_LATER);
const NONE = new Set<string>();

function makeFile(patch: Partial<LiveFile> = {}): LiveFile {
  return {
    id: 'test',
    kind: 'project',
    title: 'ملف اختبار',
    summary: '',
    city: 'الرياض',
    sector: 'ترفيه',
    owner: { name: 'جهة', url: 'https://example.test/o', channel: 'owner' },
    openedAt: '2026-01-01T00:00:00+03:00',
    lastReviewAt: '2026-11-16T00:00:00+03:00',
    fields: [
      {
        key: 'opening',
        label: 'موعد الافتتاح',
        value: null,
        certainty: 'open',
        asOf: '2026-11-01T00:00:00+03:00',
        history: [],
      },
      {
        key: 'cost',
        label: 'التكلفة',
        value: '1 مليار',
        certainty: 'official',
        asOf: '2026-11-01T00:00:00+03:00',
        history: [],
      },
    ],
    milestones: [],
    scene: [],
    developments: [],
    coverage: [],
    pending: [],
    incomingTotal: 0,
    ...patch,
  };
}

function dev(patch: Partial<Development> = {}): Development {
  return {
    id: 'd1',
    type: 'date',
    at: '2026-11-14T00:00:00+03:00',
    title: 'تطور',
    incoming: 1,
    ...patch,
  };
}

const ownerEvidence = {
  source: 'بيان الجهة',
  channel: 'owner' as const,
  url: 'https://example.test/a',
  title: 'بيان',
  quote: 'مقطع حرفي',
  publishedAt: '2026-11-14T00:00:00+03:00',
  rights: 'اتفاق اختبار',
};

const relayEvidence = { ...ownerEvidence, channel: 'relay' as const, source: 'موقع ناقل' };
const independentEvidence = {
  ...ownerEvidence,
  channel: 'independent' as const,
  source: 'صحيفة مستقلة',
};

const terminal: Milestone = {
  id: 'opening',
  label: 'الافتتاح',
  status: 'waiting',
  terminal: true,
  expectedAt: '2026-11-10T00:00:00+03:00',
  evidence: ownerEvidence,
};

describe('ميزان التغيّر', () => {
  it('التغطية بلا جديد وزنها صفر مهما زاد عدد المواد', () => {
    const file = makeFile();
    expect(deriveWeight(dev({ type: 'coverage', incoming: 25 }), file)).toBe(0);
  });

  it('ما لم يُحسم لا يتجاوز وزن التفصيل', () => {
    const file = makeFile();
    expect(deriveWeight(dev({ type: 'date', fieldKey: 'opening', certainty: 'open' }), file)).toBe(
      1,
    );
  });

  it('الموعد يرفع الوزن على الحقل الحرج فقط', () => {
    const file = makeFile();
    expect(deriveWeight(dev({ type: 'date', fieldKey: 'opening' }), file)).toBe(3);
    expect(deriveWeight(dev({ type: 'date', fieldKey: 'cost' }), file)).toBe(2);
  });

  it('المعلم الأخير حسم بوزن 4، وما قبله تحول بوزن 3', () => {
    const file = makeFile({
      milestones: [terminal, { id: 'phase1', label: 'المرحلة الأولى', status: 'done' }],
    });
    expect(deriveWeight(dev({ type: 'milestone', milestoneId: 'opening' }), file)).toBe(4);
    expect(deriveWeight(dev({ type: 'milestone', milestoneId: 'phase1' }), file)).toBe(3);
  });

  it('النفي من الجهة تحول، والنفي المنقول تفصيل', () => {
    const file = makeFile();
    expect(deriveWeight(dev({ type: 'retraction', evidence: ownerEvidence }), file)).toBe(3);
    expect(deriveWeight(dev({ type: 'retraction', evidence: relayEvidence }), file)).toBe(1);
  });

  it('مراجعة المحرر تُقدَّم على الاشتقاق وتبقى مسجّلة', () => {
    const file = makeFile();
    const reviewed = dev({ type: 'scene', weightOverride: { weight: 1, reason: 'صور مكررة' } });
    expect(deriveWeight(reviewed, file)).toBe(2);
    expect(weightOf(reviewed, file)).toBe(1);
  });
});

describe('رصد الصمت', () => {
  it('يولّد تأخرًا صامتًا بعد مهلة السماح، لا قبلها', () => {
    const file = makeFile({ milestones: [terminal] });
    const due = Date.parse('2026-11-10T00:00:00+03:00');
    const atDue = detectSilence(file, new Date(due)).filter((i) => i.type === 'silent_delay');
    expect(atDue).toHaveLength(0);
    const after = new Date(due + (OVERDUE_GRACE_DAYS + 1) * 86_400_000);
    const generated = detectSilence(file, after).filter((i) => i.type === 'silent_delay');
    expect(generated.map((item) => item.type)).toContain('silent_delay');
    expect(generated[0]?.generated).toBe(true);
  });

  it('لا يولّد تأخرًا لمعلم تحقق', () => {
    const file = makeFile({
      milestones: [{ ...terminal, status: 'done', achievedAt: '2026-11-09T00:00:00+03:00' }],
    });
    expect(detectSilence(file, LATER).filter((item) => item.type === 'silent_delay')).toHaveLength(
      0,
    );
  });

  it('يولّد وعدًا معلّقًا عند انقضاء المهلة', () => {
    const file = makeFile({
      pending: [
        {
          id: 'soon',
          label: 'سنعلن التفاصيل قريبًا',
          promisedAt: '2026-10-20T00:00:00+03:00',
          dueAt: '2026-11-03T00:00:00+03:00',
          origin: { name: 'جهة', url: 'https://example.test/o', channel: 'owner' },
        },
      ],
    });
    const types = detectSilence(file, NOW).map((item) => item.type);
    expect(types).toContain('pending_promise');
  });

  it('يولّد ملاحظة سكون بعد المدة المعتادة للنوع', () => {
    const file = makeFile({
      developments: [dev({ at: '2026-09-01T00:00:00+03:00', type: 'scene' })],
    });
    expect(detectSilence(file, NOW).map((item) => item.type)).toContain('stale');
  });

  it('التأخر الصامت على معلم حرج وزنه تحول', () => {
    const file = makeFile({ milestones: [terminal] });
    const silence = detectSilence(file, NOW).find((item) => item.type === 'silent_delay');
    expect(silence && deriveWeight(silence, file)).toBe(3);
  });

  it('لا يعرض تطورًا تاريخه بعد ساعة النموذج', () => {
    const file = makeFile({ developments: [dev({ at: '2027-01-01T00:00:00+03:00' })] });
    expect(developmentsOf(file, NOW).map((item) => item.id)).not.toContain('d1');
    expect(developmentsOf(file, LATER).map((item) => item.id)).toContain('d1');
  });
});

describe('بوابة التنبيه', () => {
  it('الإعلان الرسمي وحده يفتح التنبيه الفوري', () => {
    expect(alertGate(dev({ evidence: ownerEvidence }), 3)).toEqual({ allowed: true, via: 'owner' });
  });

  it('غير الرسمي يبقى داخل الملف حتى يؤكده أصل مستقل ثانٍ', () => {
    expect(alertGate(dev({ evidence: relayEvidence }), 3)).toEqual({
      allowed: false,
      because: 'awaiting-second',
    });
    expect(
      alertGate(dev({ evidence: relayEvidence, secondSource: independentEvidence }), 4),
    ).toEqual({
      allowed: true,
      via: 'second-source',
    });
  });

  it('ما دون الوزن 3 لا ينبّه أصلًا', () => {
    expect(alertGate(dev({ evidence: ownerEvidence }), 2)).toEqual({
      allowed: false,
      because: 'low-weight',
    });
  });
});

describe('المتابعة الدقيقة', () => {
  const all: Follow = { scope: 'all', delivery: 'instant' };
  const field: Follow = { scope: 'field', target: 'opening', delivery: 'instant' };
  const resolution: Follow = { scope: 'resolution', delivery: 'instant' };

  it('متابعة الحسم لا ترى إلا الوزن 4', () => {
    expect(reachesFollow(dev(), 3, resolution)).toBe(false);
    expect(reachesFollow(dev(), 4, resolution)).toBe(true);
  });

  it('متابعة الحقل لا ترى تطور حقل آخر', () => {
    expect(reachesFollow(dev({ fieldKey: 'cost' }), 3, field)).toBe(false);
    expect(reachesFollow(dev({ fieldKey: 'opening' }), 3, field)).toBe(true);
  });

  it('متابعة الملف كله تبدأ من الوزن 2', () => {
    expect(reachesFollow(dev(), 1, all)).toBe(false);
    expect(reachesFollow(dev(), 2, all)).toBe(true);
  });
});

describe('ترتيب صفحة المتابع', () => {
  it('يصعد بالوزن لا بعدد المواد، والذي قرأه ينزل إلى «لا جديد»', () => {
    const { changed, quiet } = rankFiles(files, initialFollows, initialLastReads, NONE, NOW);
    expect(changed.length).toBeGreaterThan(0);
    expect(changed.map((item) => item.file.id)).toContain('permits');
    expect(quiet.map((item) => item.file.id)).toContain('winter-cup');
    expect(quiet.map((item) => item.file.id)).toContain('east-transport');
    const weights = changed.map((item) => item.topWeight);
    expect([...weights].sort((a, b) => b - a)).toEqual(weights);
  });

  it('التغطية الكثيرة لا ترفع ملفًا قرأه المتابع', () => {
    const file = makeFile({
      id: 'noisy',
      developments: [
        dev({ id: 'noise', type: 'coverage', incoming: 40, at: '2026-11-16T00:00:00+03:00' }),
      ],
      incomingTotal: 40,
    });
    const { changed, quiet } = rankFiles(
      [file],
      { noisy: { scope: 'all', delivery: 'instant' } },
      { noisy: '2026-11-10T00:00:00+03:00' },
      NONE,
      NOW,
    );
    expect(changed).toHaveLength(0);
    expect(quiet).toHaveLength(1);
  });

  it('عند تساوي الوزن تُقدَّم درجة المتابعة ثم الحداثة', () => {
    const older = makeFile({
      id: 'a',
      developments: [
        dev({
          id: 'a1',
          fieldKey: 'opening',
          evidence: ownerEvidence,
          at: '2026-11-12T00:00:00+03:00',
        }),
      ],
    });
    const newer = makeFile({
      id: 'b',
      developments: [
        dev({
          id: 'b1',
          fieldKey: 'opening',
          evidence: ownerEvidence,
          at: '2026-11-15T00:00:00+03:00',
        }),
      ],
    });
    const follows: Record<string, Follow> = {
      a: { scope: 'all', delivery: 'daily' },
      b: { scope: 'field', target: 'opening', delivery: 'daily' },
    };
    const reads = { a: '2026-11-01T00:00:00+03:00', b: '2026-11-01T00:00:00+03:00' };
    expect(
      rankFiles([newer, older], follows, reads, NONE, NOW).changed.map((i) => i.file.id),
    ).toEqual(['a', 'b']);
    follows.a = { scope: 'field', target: 'opening', delivery: 'daily' };
    expect(
      rankFiles([older, newer], follows, reads, NONE, NOW).changed.map((i) => i.file.id),
    ).toEqual(['b', 'a']);
  });

  it('زر «ليس جديدًا» يُنزل الملف من قائمة التغيّر', () => {
    const file = makeFile({
      id: 'x',
      developments: [dev({ id: 'x1', fieldKey: 'opening', evidence: ownerEvidence })],
    });
    const follows: Record<string, Follow> = { x: { scope: 'all', delivery: 'instant' } };
    const reads = { x: '2026-11-01T00:00:00+03:00' };
    expect(rankFiles([file], follows, reads, NONE, NOW).changed).toHaveLength(1);
    expect(rankFiles([file], follows, reads, new Set(['x1']), NOW).changed).toHaveLength(0);
  });
});

describe('ساعة النموذج ورصد الصمت على البيانات', () => {
  it('موعد الإطلاق الفائت يولّد تطورًا اليوم بلا مادة منشورة', () => {
    const permits = files.find((file) => file.id === 'permits');
    const generated = permits ? detectSilence(permits, NOW) : [];
    const silence = generated.find((item) => item.type === 'silent_delay');
    expect(silence?.generated).toBe(true);
    expect(silence?.incoming).toBe(0);
  });

  it('افتتاح الواحة لم يفت اليوم، ويفت بعد ثلاثة أشهر', () => {
    const waha = files.find((file) => file.id === 'waha');
    if (!waha) throw new Error('waha missing');
    const ids = (now: Date) => detectSilence(waha, now).map((item) => item.id);
    expect(ids(NOW)).not.toContain('silence:waha:opening');
    expect(ids(LATER)).toContain('silence:waha:opening');
  });
});

describe('الملخص والموجز والمقاييس', () => {
  it('الملخص يُولَّد من التطورات ويستثني التغطية', () => {
    const waha = files.find((file) => file.id === 'waha');
    if (!waha) throw new Error('waha missing');
    const fresh = developmentsOf(waha, NOW).filter(
      (item) => Date.parse(item.at) > Date.parse('2026-11-11T21:40:00+03:00'),
    );
    const summary = summarizeSince(waha, fresh, '2026-11-11T21:40:00+03:00', NOW);
    expect(summary.lines.join(' ')).toContain('20 ديسمبر 2026');
    expect(summary.lines.join(' ')).not.toContain('رأي وتحليل');
    expect(summary.waiting).toContain('أسعار الدخول');
    expect(summary.spared).toBeGreaterThan(0);
  });

  it('الموجز يقول «لا جديد» حين لا يتغير شيء', () => {
    const digest = buildDigest(files, {}, {}, NONE, NOW);
    expect(digest.count).toBe(0);
    expect(digest.message).toContain('لا جديد');
  });

  it('الموجز يعدّ الملفات التي تغيّرت فعلًا', () => {
    const digest = buildDigest(files, initialFollows, initialLastReads, NONE, NOW);
    expect(digest.count).toBeGreaterThan(0);
    expect(digest.message).toContain('تغيّرت اليوم');
  });

  it('نسبة الضغط تُحسب من المواد لا من التطورات المكتوبة يدويًا', () => {
    const metrics = computeMetrics(files, initialFollows, NONE, NOW);
    expect(metrics.incoming).toBe(files.reduce((total, file) => total + file.incomingTotal, 0));
    expect(metrics.compression).toBeCloseTo(metrics.incoming / metrics.approved, 5);
    expect(metrics.held).toBeGreaterThan(0);
  });

  it('ضغط «ليس جديدًا» يخفض صدق التطور', () => {
    const before = computeMetrics(files, initialFollows, NONE, NOW).honesty;
    const after = computeMetrics(files, initialFollows, new Set(['waha-opening']), NOW).honesty;
    expect(after).toBeLessThan(before);
  });
});
