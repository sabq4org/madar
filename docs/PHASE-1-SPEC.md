# مدار — عقد المرحلة الأولى

تاريخ البدء: 2026-11-17. النطاق: أساس محلي قابل للتشغيل، وليس إطلاقًا عامًا.

## القرار

مستودع TypeScript واحد باستخدام pnpm workspaces، مع تطبيق ويب Next.js، وAPI Fastify، وعامل خلفية Node.js. PostgreSQL 17 يخزن البيانات وطابور pg-boss. لا Redis ولا خدمات سحابية مدفوعة في هذه المرحلة.

## معيار القبول

- تثبيت مقفل، وفحص أنواع، واختبارات، وبناء ينجح من الجذر.
- ترحيلات قابلة لإعادة التشغيل، وبذر مصدر تجريبي مصرح ومميز بوضوح.
- جمع RSS/Atom بعقد واحد، منع الطلبات للشبكات الخاصة، حدود وقت وحجم، واحترام إيقاف الشبكة الافتراضي.
- جمع تجريبي عبر الطابور إلى قاعدة فعلية؛ إعادة الجمع لا تكرر المقال، وتعديل المادة ينشئ نسخة جديدة.
- API للقراءة وإدارة المصادر المحمية بمفتاح، مع التحقق من المدخلات وفحوص الجاهزية.
- واجهة عربية تعرض البيانات الفعلية وحالات الفراغ وتعطل الخدمة، مع حفظ النموذج البصري السابق كمرجع مستقل.
- ملفات تشغيل محلي وحاويات وCI، وثائق بنية وحقوق مصادر وتشغيل ونسخ احتياطي وخطة المرحلة الثانية.

## ما يؤجل

الاشتراكات وحسابات المستخدمين، التنبيهات الحقيقية، تجميع الأحداث بالذكاء الاصطناعي، تطبيقات المتاجر، موصل X، الزحف العام، والنشر السحابي. مخطط الأحداث مهيأ، لكن لا تدعي النسخة أن المقالات جُمعت دلاليًا أو حُققت صحتها.

## العقود المشتركة

`NormalizedArticle`: `externalId: string | null`, `canonicalUrl: string`, `title: string`, `excerpt: string | null`, `publishedAt: string | null`, `contentHash: string`.

`SourceForCollection`: `id`, `name`, `kind: 'rss' | 'fixture'`, `feedUrl`, `allowedHosts: string[]`, `enabled: boolean`, `rightsStatus: 'pending' | 'approved' | 'blocked'`, `contentPolicy: 'metadata_only' | 'excerpt'`, `etag: string | null`, `lastModified: string | null`.

`collectFeed(source, options)` في `@madar/ingestion`: `options.networkEnabled: boolean`، `options.fixtureXml?: string`، يعيد `{articles: NormalizedArticle[], etag: string | null, lastModified: string | null, notModified: boolean}`. لا يكتب في قاعدة البيانات. يمنع المصادر غير المعتمدة/الموقوفة؛ `fixtureXml` لا يستخدم إلا مع `kind='fixture'`؛ RSS شبكي مع HTTPS ونطاقات مسموحة فقط. أي مصدر fixture يحظر في production عند العامل.

API response:

- `GET /health/live`: `{status:'ok', service:'madar-api'}`.
- `GET /health/ready`: حالة قاعدة البيانات والترحيلات الثلاثة؛ 503 عند عدم الجاهزية.
- `GET /v1/sources`: `{data:[{id,name,homepageUrl,kind,enabled,rightsStatus}]}`.
- `GET /v1/articles?limit=20&before=<opaque cursor>`: `{data:[{id,sourceId,sourceName,canonicalUrl,title,excerpt,publishedAt,firstSeenAt,lastSeenAt,revisionCount,isDemo}],nextCursor:string|null}`. الفرز حسب وقت الرصد الأول؛ المؤشر opaque بترميز base64url لقيمتي وقت الرصد الأول ومعرّف المادة (`t,id`).
- `GET /v1/articles/:id`: `{data:article,revisions:[{id,title,excerpt,observedAt}]}`.
- `POST /v1/admin/sources`: مصدر RSS؛ مفتاح Bearer مطلوب؛ الاعتماد ليس دليل تحقق للخبر.
- `PATCH /v1/admin/sources/:id`: تحديث حالة التفعيل والحقوق وأساسها وسياسة المحتوى؛ مفتاح Bearer مطلوب.
- `POST /v1/admin/sources/:id/collect`: يحجز مهمة مصدر مفعل ومعتمد؛ 202.

## ملكية التنفيذ

المنسق: ملفات الجذر، contracts، db، api، worker، scripts، infra/CI، اختبارات التكامل، الوثائق العامة. وكيل ingestion: `packages/ingestion/**` فقط. وكيل web: `apps/web/**` و`docs/FRONTEND.md` فقط. مراجعة مستقلة قبل التسليم، دون نشر أو تواصل خارجي.
