import Link from 'next/link';
import { articles } from '@/lib/api';
export const dynamic = 'force-dynamic';
function date(value: string | null) {
  if (!value) return 'وقت النشر غير متاح';
  const d = new Date(value);
  return Number.isNaN(d.valueOf())
    ? 'وقت النشر غير متاح'
    : new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Riyadh',
      }).format(d);
}
export default async function Home() {
  const result = await articles();
  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">
          مدار
        </Link>
        <nav className="nav">
          <Link aria-current="page" href="/">
            آخر المواد
          </Link>
          <Link href="/sources">المصادر</Link>
        </nav>
      </header>
      <section className="intro">
        <h1>المواد المنشورة، من مصادرها</h1>
        <p>تصفّح ما رُصد من مواد، وارجع إلى مصدر كل مادة.</p>
      </section>
      <section aria-labelledby="articles-heading">
        <h2 className="section-title" id="articles-heading">
          آخر المواد
        </h2>
        {result.error ? (
          <div className="state">
            <strong>تعذّر الاتصال بخدمة المقالات</strong>أعد تحميل الصفحة بعد قليل.
          </div>
        ) : result.data?.data.length ? (
          <div className="article-list">
            {result.data.data.map((item) => (
              <article className="article" key={item.id}>
                <h2>
                  <Link href={`/articles/${encodeURIComponent(item.id)}`}>{item.title}</Link>
                </h2>
                {item.excerpt && <p className="excerpt">{item.excerpt}</p>}
                <div className="meta">
                  <span>{item.sourceName}</span>
                  <span>{date(item.publishedAt)}</span>
                  <span>رُصدت {date(item.firstSeenAt)}</span>
                  {item.isDemo && <span className="demo">تجريبي</span>}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="state">
            <strong>لا توجد مواد لعرضها</strong>ستظهر هنا المواد التي ترجعها خدمة مدار.
          </div>
        )}
      </section>
      <footer className="footer">
        <span>مدار يعرض ما توفره المصادر؛ لا يعني الرصد التحقق من صحة الخبر.</span>
        <Link href="/prototype.html">النموذج البصري السابق · مرجع</Link>
      </footer>
    </main>
  );
}
