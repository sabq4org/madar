import Link from 'next/link';
import { ExternalLink } from '@/components/external-link';
import { sources } from '@/lib/api';
export const dynamic = 'force-dynamic';
const rights: Record<string, string> = {
  pending: 'حالة الحقوق: قيد المراجعة',
  approved: 'حالة الحقوق: معتمد للجمع',
  blocked: 'حالة الحقوق: موقوف',
};
export default async function SourcesPage() {
  const result = await sources();
  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">
          مدار
        </Link>
        <nav className="nav">
          <Link href="/">آخر المواد</Link>
          <Link aria-current="page" href="/sources">
            المصادر
          </Link>
        </nav>
      </header>
      <section className="intro">
        <h1>المصادر</h1>
        <p>بيانات تعريفية عامة للمصادر التي تعرضها الخدمة.</p>
      </section>
      {result.error ? (
        <div className="state">
          <strong>تعذّر الاتصال بخدمة المصادر</strong>أعد تحميل الصفحة بعد قليل.
        </div>
      ) : result.data?.data.length ? (
        <div className="article-list">
          {result.data.data.map((source) => (
            <article className="source" key={source.id}>
              <div>
                <h2>{source.name}</h2>
                <small>{rights[source.rightsStatus] || 'حالة الحقوق غير محددة'}</small>
              </div>
              <div className="meta">
                <span className={source.enabled ? 'status' : 'status off'}>
                  {source.enabled ? 'مفعّل' : 'غير مفعّل'}
                </span>
                {source.kind === 'fixture' ? (
                  <span className="demo">مصدر تجريبي</span>
                ) : (
                  <ExternalLink href={source.homepageUrl}>زيارة الموقع</ExternalLink>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="state">
          <strong>لا توجد مصادر متاحة</strong>لم تُرجع الخدمة أي مصادر حتى الآن.
        </div>
      )}
      <footer className="footer">
        <span>حالة المصدر تصف إعداد الخدمة، ولا تثبت صحة المواد المنشورة.</span>
        <Link href="/prototype.html">النموذج البصري السابق · مرجع</Link>
      </footer>
    </main>
  );
}
