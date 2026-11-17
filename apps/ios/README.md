# مدار — iOS

تطبيق SwiftUI أصلي للتصور الأزرق. القصص والمصادر والتحديثات افتراضية ومعلنة؛ يعمل دون شبكة. اقرأ [نطاق النسخة](../../docs/IOS-PHASE-1-SPEC.md) و[دليل القبول](../../docs/ACCEPTANCE.md).

## التشغيل

افتح `Madar.xcodeproj` في Xcode 16 أو أحدث، اختر Scheme **Madar** ثم محاكي iPhone واضغط Run. الحد الأدنى iOS 17. لا يلزم فريق توقيع للمحاكي؛ تشغيله على جهاز يتطلب اختيار فريق ومعرف حزمة مناسب. لا يوجد مشروع مولد أو اعتماديات تنزيل خارجية.

من جذر المستودع:

```sh
swift test --package-path apps/ios/MadarCore
xcodebuild -project apps/ios/Madar.xcodeproj -scheme Madar \
  -configuration Debug -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath work/madar-ios-build CODE_SIGNING_ALLOWED=NO build
```

لبدء التجربة: افتح «خط المطار الجديد»، احفظه، اختر «تغيّر موعد التشغيل» في المتابعة، ثم افتح أداة التجربة من «اليوم» وطبّق تغيير الموعد. إعادة النشر لا تنشئ تنبيهًا آخر. جرّب الإغلاق وإعادة الفتح للتحقق من استمرار الحالة. زر إعادة الضبط يمسح حالة هذه التجربة فقط بعد التأكيد.

## تنظيم الكود

- `Madar/MadarApp.swift`: إعداد بيئة RTL والعربية والمتجر.
- `Madar/Views` و`Madar/Design`: الشاشات والمكونات والهوية البصرية.
- `Madar/Resources`: الخط وترخيصه وأيقونة أصلية وبيان الخصوصية.
- `MadarCore`: النماذج والبيانات الافتراضية والمتابعة والحفظ والاختبارات.

يدعم المشروع مجلدات Xcode المتزامنة؛ إضافة ملفات Swift داخل `Madar` تُدرجها في البناء تلقائيًا. ملفات build وحالة المستخدم محلية ومهملة في Git.

الحفظ يستخدم UserDefaults لبيانات التطبيق نفسه. يتضمن `PrivacyInfo.xcprivacy` تصريح UserDefaults، ولا يعلن جمع بيانات أو تتبعًا. راجع [توثيق Apple لواجهات API ذات الأسباب المطلوبة](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api) عند إضافة خدمات أو SDKs قبل التوزيع.
