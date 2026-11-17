import Link from 'next/link';
import { ExternalLink } from '@/components/external-link';
import { article } from '@/lib/api';
export const dynamic = 'force-dynamic';
function date(value: string | null) {
  if (!value) return 'غير متاح';
  const d = new Date(value);
  return Number.isNaN(d.valueOf())
    ? 'غير متاح'
    : new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Riyadh',
      }).format(d);
}
export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await article(id);
  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">
          مدار
        </Link>
        <nav className="nav">
          <Link href="/">آخر المواد</Link>
          <Link href="/sources">المصادر</Link>
        </nav>
      </header>
      {result.error ? (
        <>
          <Link className="back" href="/">
            العودة إلى المواد
          </Link>
          <div className="state">
            <strong>تعذّر تحميل المادة</strong>حاول تحميل المادة مجددًا بعد قليل.
          </div>
        </>
      ) : !result.data ? (
        <>
          <Link className="back" href="/">
            العودة إلى المواد
          </Link>
          <div className="state">
            <strong>المادة غير موجودة</strong>قد تكون أزيلت أو لم يعد المعرّف متاحًا.
          </div>
        </>
      ) : (
        <>
          <Link className="back" href="/">
            العودة إلى المواد
          </Link>
          <article className="detail">
            <h1>{result.data.data.title}</h1>
            <div className="meta">
              <span>{result.data.data.sourceName}</span>
              <span>{date(result.data.data.publishedAt)}</span>
              {result.data.data.isDemo && <span className="demo">تجريبي</span>}
            </div>
            {result.data.data.excerpt && <p className="excerpt">{result.data.data.excerpt}</p>}
            <div className="meta">
              <span>أول رصد: {date(result.data.data.firstSeenAt)}</span>
              <span>آخر رصد: {date(result.data.data.lastSeenAt)}</span>
            </div>
            <section className="detail-section">
              <h2 className="section-title">سجل النسخ</h2>
              {result.data.revisions.length ? (
                <div className="article-list">
                  {result.data.revisions.map((rev) => (
                    <div className="revision" key={rev.id}>
                      <h3>{rev.title}</h3>
                      <p>{rev.excerpt || 'لا يوجد مقتطف لهذه النسخة.'}</p>
                      <div className="meta">رُصدت {date(rev.observedAt)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="state">لا تتوفر نسخ مسجلة لهذه المادة.</div>
              )}
            </section>
            <div className="source-row">
              <div className="meta">
                <span>المصدر: {result.data.data.sourceName}</span>
                {result.data.data.isDemo ? (
                  <span className="meta">رابط المصدر غير متاح للمادة التجريبية</span>
                ) : (
                  <ExternalLink href={result.data.data.canonicalUrl}>
                    فتح المادة في مصدرها
                  </ExternalLink>
                )}
              </div>
            </div>
            <p className="meta">الرصد لا يعني التحقق من صحة الخبر.</p>
          </article>
        </>
      )}
      <footer className="footer">
        <span>مدار يعرض بيانات المصدر كما وردت إلى الخدمة.</span>
        <Link href="/prototype.html">النموذج البصري السابق · مرجع</Link>
      </footer>
    </main>
  );
}
