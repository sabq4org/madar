import type { Metadata } from 'next';
import localFont from 'next/font/local';
import LiveFilesExperience from './live-experience';

// خط «عام الحرف اليدوية» للشعار والعناوين فقط، كما في نموذج v2.
// المصدر والترخيص في ../design/fonts/FONT-SOURCE.md.
const handicrafts = localFont({
  src: [
    { path: '../design/fonts/year-of-handicrafts-bold.woff2', weight: '700', style: 'normal' },
    { path: '../design/fonts/year-of-handicrafts-black.woff2', weight: '900', style: 'normal' },
  ],
  variable: '--font-handicrafts',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  title: 'مدار | نموذج الملف الحي',
  description: 'نموذج تصميم تفاعلي للملف الحي: بطاقة حالة ومسار وميزان تغيّر، بمحتوى افتراضي.',
  robots: { index: false, follow: false },
};

export default function LiveFilesPage() {
  return (
    <div className={handicrafts.variable}>
      <LiveFilesExperience />
    </div>
  );
}
